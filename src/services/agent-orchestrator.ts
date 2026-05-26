import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { 
    CorporateMessage, CompanyState, 
    ChatHistoryItem, DisplayMessage 
} from './types';

import {
    getConfig, _isLMStudioEngine
} from '../utils/config';
import {
    _updateActiveDispatchStep,
    SECRETARY_TRIAGE_PROMPT, CEO_PLANNER_PROMPT, CEO_CHAT_PROMPT, CEO_REPORT_PROMPT,
    CONFER_PROMPT, DECISIONS_EXTRACT_PROMPT,
    LOCKED_AGENTS_DEFAULT, WORLD_LAYOUT,
    buildWorldDeskPositions, getCompanyDay,
    readCompanyName, readHiredAgents, readActiveAgents,
    readSecretaryBridgeMode,
    _resolveFlexiblePath,
    appendAgentMemory, promoteGroundedClaimsFromOutput,
    _harvestActionItems, addTrackerTask, getCompanyMetrics,
    updateCompanyMetrics, autoMarkTrackerFromDispatch,
    rebuildUnifiedSchedule, _safeGitAutoSync, _safeGitAutoSyncCompany,
    startYouTubeOAuthFlow,
    readAgentSharedContext, readRecentConversations,
    appendConversationLog, makeSessionDir,
    _personalizePrompt, _isCasualChat,
    _extractFirstJsonObject,
    sendTelegramReport, sendTelegramLong, _pushTelegramHistory,
    readTelegramConfig,
    _readYtOAuthClient, isYoutubeOAuthConnected,
    fetchYouTubeAnalyticsSummary, _safeReadText,
    resolveApproval, listPendingApprovals, _approvalsPendingDir,
    _youtubeCommentReplyDraftBatch,
    ensureCompanyStructure,
    isAgentActive, prefetchAgentRealtimeData,
    buildSpecialistPrompt, buildAgentConfigStatus
} from '../extension';
import {
    getAgentModel, getAgentModelOrDefault, listInstalledModels, _autoOrchestrateModelMap,
    readAgentModelMap, writeAgentModelMap
} from '../llm/models';
import {
    runCommandCaptured, _pythonCmd
} from '../utils/python';
import {
    getSystemSpecs, estimateModelMemoryGB
} from '../system-specs';
import {
    DEFAULT_CONTEXT_SLICE
} from '../constants';
import {
    getCompanyDir, _getBrainDir
} from '../paths';
import {
    AGENTS, AGENT_ORDER, SPECIALIST_IDS
} from '../agents';

const MAX_STREAM_BUFFER = 100_000;

export interface OrchestratorCallbacks {
    post: (msg: CorporateMessage) => void;
    onStreamEnd: () => void;
    appendDisplayMessage: (msg: DisplayMessage) => void;
    saveHistory: () => void;
}

export class AgentOrchestrator {
    private _abortController?: AbortController;
    private _recentFileActions: { agentId: string; absPath: string; action: 'create' | 'edit' | 'delete'; ts: number }[] = [];
    private _callbacks: OrchestratorCallbacks;
    private _temperature = 0.7;
    private _topP = 0.9;
    private _topK = 40;

    constructor(callbacks: OrchestratorCallbacks) {
        this._callbacks = callbacks;
    }

    public abort() {
        this._abortController?.abort();
    }

    private post(msg: CorporateMessage) {
        this._callbacks.post(msg);
    }

    private _isAborted(): boolean {
        return !!this._abortController?.signal.aborted;
    }

    public async handleCorporatePrompt(prompt: string, modelName: string) {
        this._abortController = new AbortController();
        const signal = this._abortController.signal;
        
        try {
            ensureCompanyStructure();
            const sessionDir = makeSessionDir();
            const sessionDisplay = sessionDir.replace(os.homedir(), '~');

            // Log user command
            appendConversationLog({ speaker: '사용자', emoji: '👤', body: prompt });

            const bridgeMode = readSecretaryBridgeMode();
            if (bridgeMode === 'full') {
                this.post({ type: 'agentStart', agent: 'secretary', task: '브릿지 분류' });
                let triageRaw = '';
                try {
                    triageRaw = await this.callAgentLLM(
                        `${SECRETARY_TRIAGE_PROMPT}\n${readAgentSharedContext('secretary')}${readRecentConversations(800)}`,
                        prompt,
                        modelName,
                        'secretary',
                        false
                    );
                } catch (e: any) {
                    appendConversationLog({ speaker: '비서', emoji: '⚠️', body: `브릿지 분류 실패 → CEO로 직행: ${e?.message || e}` });
                }
                this.post({ type: 'agentEnd', agent: 'secretary' });
                let triage: { mode?: string; text?: string } | null = null;
                try {
                    const m = triageRaw.match(/\{[\s\S]*\}/);
                    triage = m ? JSON.parse(m[0]) : null;
                } catch { triage = null; }

                if (triage && triage.mode === 'casual' && triage.text) {
                    const text = triage.text;
                    this.post({ type: 'response', value: text });
                    this._callbacks.appendDisplayMessage({ text: `📱 비서: ${text}`, role: 'ai' });
                    appendConversationLog({ speaker: '비서', emoji: '📱', section: '브릿지(직접 응답)', body: text });
                    try {
                        const tg = readTelegramConfig();
                        if (tg.token && tg.chatId) await sendTelegramLong(text);
                    } catch { /* silent */ }
                    return;
                }
                appendConversationLog({ speaker: '비서', emoji: '📱', section: '브릿지(CEO에게 위임)', body: '작업이라 CEO에게 분배 요청' });
            }

            if (bridgeMode !== 'full' && _isCasualChat(prompt)) {
                this.post({ type: 'agentStart', agent: 'ceo', task: '인사' });
                let chatReply = '';
                try {
                    chatReply = await this.callAgentLLM(
                        `${_personalizePrompt(CEO_CHAT_PROMPT)}\n${readAgentSharedContext('ceo')}${readRecentConversations(800)}`,
                        prompt,
                        modelName,
                        'ceo',
                        true
                    );
                } catch (e: any) {
                    this.post({ type: 'agentEnd', agent: 'ceo' });
                    this.post({ type: 'error', value: `⚠️ CEO 응답 실패: ${e?.message || e}` });
                    return;
                }
                this.post({ type: 'agentEnd', agent: 'ceo' });
                const streamed = (chatReply || '').trim();
                const text = streamed || '안녕하세요, 사장님. 무엇을 도와드릴까요?';
                if (!streamed) {
                    this.post({ type: 'response', value: text });
                }
                
                try {
                    const report = await this.executeActions(text, { silent: true });
                    const reportMsg = report.length > 0 ? `\n\n---\n**작업 결과**\n${report.join('\n')}` : '';
                    this.post({ type: 'response', value: this.stripActionTags(text) + reportMsg });
                    appendConversationLog({ speaker: '시스템', emoji: '📁', body: report.join('\n') });
                } catch (actErr: any) {
                    console.error('[AgentOrchestrator] casual-chat 파일 액션 실패:', actErr?.message || actErr);
                }
                this._callbacks.appendDisplayMessage({ text: this.stripActionTags(text), role: 'ai' });
                appendConversationLog({ speaker: 'CEO', emoji: '👔', body: text });
                try {
                    const tg = readTelegramConfig();
                    if (tg.token && tg.chatId) await sendTelegramLong(text);
                } catch { /* silent */ }
                return;
            }

            const shortcut = await this._tryDataShortcut(prompt, sessionDir);
            if (shortcut) {
                return;
            }

            const explicit = this.detectExplicitMention(prompt);
            if (explicit) {
                this.post({ type: 'agentStart', agent: 'ceo', task: `${explicit.agentName} 직접 호출 — CEO 우회` });
                _updateActiveDispatchStep(prompt, `${explicit.agentName} 직접 호출`);
            } else {
                this.post({ type: 'agentStart', agent: 'ceo', task: '작업 분해' });
                _updateActiveDispatchStep(prompt, 'CEO 계획 수립 중');
            }

            let planRaw = '';
            let ceoSystemPrompt = '';
            let ceoStage = 'init';
            try {
                ceoStage = '_personalizePrompt';
                let base = _personalizePrompt(CEO_PLANNER_PROMPT);
                try {
                    const unavailableIds: string[] = [];
                    const reasons: Record<string, string> = {};
                    for (const id of AGENT_ORDER) {
                        if (id === 'ceo') continue;
                        if (!isAgentActive(id)) {
                            unavailableIds.push(id);
                            reasons[id] = LOCKED_AGENTS_DEFAULT[id] ? '아직 채용 전 (PIN 미입력)' : '사용자가 비활성화함';
                        }
                    }
                    if (unavailableIds.length > 0) {
                        const labels = unavailableIds.map(id => `${AGENTS[id]?.emoji || ''} ${AGENTS[id]?.name || id} (${id}: ${reasons[id]})`).join(', ');
                        for (const uid of unavailableIds) {
                            const re = new RegExp(`^- ${uid}\\b.*$`, 'gm');
                            base = base.replace(re, '');
                        }
                        base += `\n\n[활성 게이트] 다음 에이전트는 현재 사용 불가 — 절대 tasks 배열에 넣지 마세요: ${labels}\n`;
                    }
                } catch (gateErr: any) {
                    console.error('[AgentOrchestrator] 활성 게이트 적용 실패:', gateErr?.message || gateErr);
                }
                ceoStage = 'readAgentSharedContext';
                let shared = '';
                try { shared = readAgentSharedContext('ceo'); }
                catch (sc: any) {
                    console.error('[AgentOrchestrator] readAgentSharedContext 실패:', sc?.message || sc);
                    shared = '';
                }
                ceoStage = 'readRecentConversations';
                let recent = '';
                try { recent = readRecentConversations(2000); }
                catch (rc: any) {
                    console.error('[AgentOrchestrator] readRecentConversations 실패:', rc?.message || rc);
                    recent = '';
                }
                ceoSystemPrompt = `${base}\n${shared}${recent}`;
                if (ceoSystemPrompt.length > 50_000) {
                    ceoSystemPrompt = ceoSystemPrompt.slice(0, 50_000) + '\n[…컨텍스트 50KB 캡 도달, 일부 절단됨…]';
                }
                ceoStage = 'callAgentLLM';
            } catch (buildErr: any) {
                this.post({ type: 'agentEnd', agent: 'ceo' });
                const stk = buildErr?.stack ? String(buildErr.stack).split('\n').slice(0, 3).join(' | ').slice(0, 300) : '';
                this.post({ type: 'error', value: `⚠️ CEO 시스템 프롬프트 빌드 실패 (${ceoStage}): ${buildErr?.message || buildErr}\n[stack] ${stk}` });
                return;
            }

            try {
                if (explicit) {
                    planRaw = JSON.stringify({
                        brief: `사용자가 ${explicit.agentName}를 직접 호출 — 단독 작업`,
                        tasks: [{ agent: explicit.agentId, task: prompt }]
                    });
                } else {
                    const lp = prompt.toLowerCase();
                    const wantsYoutube = /유튜브|youtube|채널|영상|구독|조회/.test(lp);
                    const wantsRevenue = /매출|페이팔|paypal|수익|결제|매상|돈|이번 ?달/.test(lp);
                    const isSummary = /종합|전체|현황|보고서|통합|요약|회사 ?(상황|현황)/.test(lp);
                    if (isSummary && wantsYoutube && wantsRevenue) {
                        planRaw = JSON.stringify({
                            brief: '유튜브 채널 + PayPal 매출 종합 분석',
                            tasks: [
                                { agent: 'youtube', task: `${prompt}\n\n[지시] 채널 데이터를 분석하고 다음 영상 전략 1개 제안.` },
                                { agent: 'business', task: `${prompt}\n\n[지시] PayPal 매출을 분석하고 다음 액션 1개 제안.` }
                            ]
                        });
                    } else if (wantsYoutube && wantsRevenue) {
                        planRaw = JSON.stringify({
                            brief: '유튜브 + 매출 데이터 같이 분석',
                            tasks: [
                                { agent: 'youtube', task: prompt },
                                { agent: 'business', task: prompt }
                            ]
                        });
                    } else {
                        planRaw = await this.callAgentLLM(
                            ceoSystemPrompt,
                            `[사용자 명령]\n${prompt}`,
                            modelName,
                            'ceo',
                            false,
                            { jsonMode: true }
                        );
                    }
                }
            } catch (e: any) {
                this.post({ type: 'agentEnd', agent: 'ceo' });
                this.post({ type: 'error', value: `⚠️ CEO 호출 실패: ${e.message}` });
                return;
            }
            this.post({ type: 'agentEnd', agent: 'ceo' });

            type Plan = { brief: string; tasks: { agent: string; task: string }[] };
            const _parsePlan = (raw: string): Plan | null => {
                if (!raw) return null;
                const cleaned = raw.replace(/<\/?[a-zA-Z][^>]*>/g, '').replace(/="[a-zA-Z0-9_-]+">/g, '');
                const obj = _extractFirstJsonObject(cleaned);
                if (obj && Array.isArray(obj.tasks) && obj.tasks.length > 0) {
                    return { brief: String(obj.brief || ''), tasks: obj.tasks };
                }
                const tasks: { agent: string; task: string }[] = [];
                const re = /"agent"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"\s*,\s*"task"\s*:\s*"((?:[^"\\]|\\.)*?)(?:"|$)/g;
                let mm: RegExpExecArray | null;
                while ((mm = re.exec(cleaned))) {
                    const agent = mm[1].trim();
                    const task = mm[2].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
                    if (agent && task) tasks.push({ agent, task });
                }
                if (tasks.length > 0) {
                    const briefM = cleaned.match(/"brief"\s*:\s*"((?:[^"\\]|\\.)*?)(?:"|$)/);
                    const brief = briefM ? briefM[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim() : '';
                    return { brief, tasks };
                }
                return null;
            };
            let plan: Plan | null = _parsePlan(planRaw);

            if (!plan) {
                try {
                    const retryRaw = await this.callAgentLLM(
                        `${_personalizePrompt(CEO_PLANNER_PROMPT)}\n\n[중요] 오직 JSON 한 객체만 출력. 형식: {"brief":"…","tasks":[{"agent":"<id>","task":"…"}]}`,
                        `[사용자 명령]\n${prompt}`,
                        modelName,
                        'ceo',
                        false,
                        { jsonMode: true }
                    );
                    plan = _parsePlan(retryRaw);
                    if (plan) planRaw = retryRaw;
                } catch { /* ignore */ }
            }

            if (!plan || plan.tasks.length === 0) {
                this.post({ type: 'error', value: `⚠️ CEO가 작업 분배 계획(JSON)을 생성하지 못했어요.` });
                return;
            }

            // Filtering and Korean alias logic
            const idLookup = new Map<string, string>();
            for (const id of SPECIALIST_IDS) {
                idLookup.set(id, id);
                idLookup.set(id.toLowerCase(), id);
                const a = AGENTS[id];
                if (a) {
                    idLookup.set(a.name.toLowerCase(), id);
                    idLookup.set(a.name, id);
                }
            }
            const koreanAlias: Record<string, string> = {
                '유튜브': 'youtube', '인스타': 'instagram', '인스타그램': 'instagram',
                '디자이너': 'designer', '디자인': 'designer',
                '개발자': 'developer', '개발': 'developer',
                '비즈니스': 'business', '경영': 'business',
                '비서': 'secretary', '비서관': 'secretary',
                '편집자': 'editor', '편집': 'editor',
                '작가': 'writer', '카피라이터': 'writer',
                '리서처': 'researcher', '연구원': 'researcher', '리서치': 'researcher',
            };
            plan.tasks = plan.tasks
                .map(t => {
                    const raw = String(t.agent || '').trim();
                    const direct = idLookup.get(raw) || idLookup.get(raw.toLowerCase());
                    if (direct) return { ...t, agent: direct };
                    if (koreanAlias[raw]) return { ...t, agent: koreanAlias[raw] };
                    const lower = raw.toLowerCase();
                    const hit = SPECIALIST_IDS.find(id => lower.includes(id));
                    if (hit) return { ...t, agent: hit };
                    return null;
                })
                .filter((t): t is { agent: string; task: string } => !!t)
                .filter(t => isAgentActive(t.agent));

            if (plan.tasks.length === 0) {
                this.post({ type: 'error', value: `⚠️ 실행 가능한 에이전트가 없어요.` });
                return;
            }

            // Save brief
            try {
                fs.writeFileSync(path.join(sessionDir, '_brief.md'), `# 📋 작업 브리프\n\n**원 명령:** ${prompt}\n\n## 요약\n${plan.brief}\n\n## 분배\n${plan.tasks.map(t => `- **${AGENTS[t.agent]?.emoji} ${AGENTS[t.agent]?.name}**: ${t.task}`).join('\n')}\n`);
            } catch { /* ignore */ }

            this.post({
                type: 'multiDispatch',
                brief: plan.brief,
                tasks: plan.tasks.map(t => ({
                    agent: t.agent,
                    emoji: AGENTS[t.agent]?.emoji || '🤖',
                    name: AGENTS[t.agent]?.name || t.agent,
                    task: (t.task || '').slice(0, 80),
                }))
            });

            this.post({
                type: 'agentDispatch',
                brief: plan.brief,
                tasks: plan.tasks.map(t => ({ agent: t.agent, task: t.task })),
                userPrompt: prompt
            });

            appendConversationLog({
                speaker: 'CEO', emoji: '🧭', section: '작업 분배',
                body: `${plan.brief}\n\n**할당:**\n${plan.tasks.map(t => `- ${AGENTS[t.agent]?.emoji || '🤖'} **${AGENTS[t.agent]?.name || t.agent}**: ${t.task}`).join('\n')}`,
            });

            const outputs: Record<string, string> = {};
            for (const t of plan.tasks) {
                if (this._isAborted()) break;
                const a = AGENTS[t.agent];
                if (!a) continue;
                this.post({ type: 'agentStart', agent: t.agent, task: t.task });
                _updateActiveDispatchStep(prompt, `${a.emoji} ${a.name} 작업 중 — ${t.task.slice(0, 40)}`);

                const peerCtx = Object.keys(outputs).length > 0
                    ? `\n\n[같은 세션의 동료 에이전트 산출물]\n${Object.entries(outputs).map(([k, v]) => `\n### ${AGENTS[k]?.emoji} ${AGENTS[k]?.name}\n${v.slice(0, DEFAULT_CONTEXT_SLICE)}`).join('\n')}`
                    : '';

                let realtimeData = '';
                try {
                    this.post({ type: 'response', value: `🔍 ${a.emoji} ${a.name} 데이터 가져오는 중...` });
                    realtimeData = await prefetchAgentRealtimeData(t.agent);
                } catch { /* ignore */ }

                const recentFilesCtx = this._buildRecentFilesContext(t.agent);
                const sysPrompt = `${buildSpecialistPrompt(t.agent)}${this._getProjectMemory()}${buildAgentConfigStatus(t.agent)}${realtimeData}${readAgentSharedContext(t.agent)}${peerCtx}${recentFilesCtx}`;
                const userMsg = `[CEO의 지시]\n${t.task}\n\n[원 사용자 명령 참고]\n${prompt}`;

                let out = '';
                let shortcut: string | null = null;
                if (explicit && t.agent === 'developer') {
                    shortcut = this._tryKitShortcut(t.agent, prompt);
                }
                if (!shortcut && t.agent === 'business') {
                    const lower = prompt.toLowerCase();
                    if (/매출|수익|결제|paypal|revenue|매상|매월|이번 달|이번달|월 매출|페이팔|돈|얼마 벌/.test(lower)) {
                        shortcut = await this._tryRevenueShortcut(prompt);
                    }
                }

                if (shortcut) {
                    out = shortcut;
                } else {
                    out = await this.callAgentLLM(sysPrompt, userMsg, modelName, t.agent, true);
                }

                try {
                    const fr = await this.executeActions(out, { agentId: t.agent });
                    if (fr.length > 0) {
                        out += `\n\n---\n## 📁 파일 액션 결과\n\n${fr.join('\n')}`;
                    }
                } catch { /* ignore */ }

                outputs[t.agent] = out;
                this.post({ type: 'agentEnd', agent: t.agent });
                
                try {
                    fs.writeFileSync(path.join(sessionDir, `${t.agent}.md`), `# ${a.emoji} ${a.name} — ${t.task}\n\n${out}\n`);
                } catch { /* ignore */ }
                appendConversationLog({ speaker: a.name, emoji: a.emoji, section: t.task.slice(0, 60), body: out });
            }

            // Final synthesis
            let finalReport = '';
            if (plan.tasks.length <= 1) {
                finalReport = outputs[plan.tasks[0]?.agent] || '';
            } else {
                this.post({ type: 'agentStart', agent: 'ceo', task: '종합 보고서 작성' });
                const reportInput = `[산출물 요약]\n${plan.tasks.map(t => `\n## ${AGENTS[t.agent]?.name}\n${(outputs[t.agent] || '').slice(0, 2000)}`).join('\n')}`;
                finalReport = await this.callAgentLLM(CEO_REPORT_PROMPT, reportInput, modelName, 'ceo', false);
                this.post({ type: 'agentEnd', agent: 'ceo' });
            }

            this._callbacks.post({
                type: 'response',
                value: `👔 CEO: 전체 작업 완료 보고서\n\n${finalReport}`
            } as any);

            this.post({
                type: 'corporateReport',
                brief: plan.brief,
                report: finalReport,
                sessionPath: sessionDisplay,
                sessionRel: `Company/sessions/${path.basename(sessionDir)}`
            });

            appendConversationLog({ speaker: 'CEO', emoji: '🧭', section: '종합 보고서', body: finalReport });

        } catch (error: any) {
            this.post({ type: 'error', value: `⚠️ 오류: ${error.message}` });
        } finally {
            this._abortController = undefined;
            this._callbacks.onStreamEnd();
        }
    }

    public async callAgentLLM(systemPrompt: string, userMsg: string, modelName: string, agentId: string, stream: boolean, opts: any = {}): Promise<string> {
        const { ollamaBase, defaultModel, timeout } = getConfig();
        const signal = this._abortController?.signal;
        let isLMStudio = _isLMStudioEngine(ollamaBase);
        let apiUrl = isLMStudio ? `${ollamaBase}/v1/chat/completions` : `${ollamaBase}/api/chat`;

        if (!isLMStudio) {
            try {
                await axios.get(`${ollamaBase}/api/tags`, { timeout: 1000 });
            } catch (err: any) {
                apiUrl = 'http://127.0.0.1:1234/v1/chat/completions';
                isLMStudio = true;
            }
        }

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMsg }
        ];

        try {
            if (!isLMStudio && modelName.includes(':')) {
                const payload: any = {
                    model: modelName || defaultModel,
                    system: systemPrompt,
                    prompt: userMsg,
                    stream: stream
                };
                if (opts?.jsonMode) payload.format = 'json';
                
                const response = await axios.post(`${ollamaBase}/api/generate`, payload, {
                    responseType: 'stream',
                    timeout: 0
                });
                // Note: Actual streaming parsing logic should handle 'responseType: stream' properly
                return response.data || '';
            } else {
                const body: any = {
                    model: modelName || defaultModel,
                    messages,
                    stream: stream
                };
                if (opts?.jsonMode) body.response_format = { type: 'json_object' };
                
                const response = await axios.post(apiUrl, body, { timeout, signal });
                return response.data.choices?.[0]?.message?.content || '';
            }
        } catch (e: any) {
            throw e;
        }
    }

    private _getProjectMemory(): string {
        return ""; // Placeholder
    }

    public stripActionTags(text: string): string {
        return text.replace(/<(?:create_file|edit_file|run_command|delete_file|read_file|list_files|file|reveal_in_explorer|open_file|glob|grep)[\s\S]*?<\/(?:create_file|edit_file|run_command|delete_file|read_file|list_files|file|reveal_in_explorer|open_file|glob|grep)>/gi, '').trim();
    }

    public async executeActions(
        aiMessage: string,
        opts?: { rootOverride?: string; appendToOutput?: (s: string) => void; silent?: boolean; skipRunCommand?: boolean; agentId?: string }
    ): Promise<string[]> {
        const report: string[] = [];
        let rootPath = opts?.rootOverride
            || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            || (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri.scheme === 'file'
                ? path.dirname(vscode.window.activeTextEditor.document.uri.fsPath)
                : undefined);

        if (!rootPath) {
            try {
                const compDir = getCompanyDir();
                if (compDir && fs.existsSync(compDir)) { rootPath = compDir; }
            } catch { /* ignore */ }
        }
        if (!rootPath) {
            try {
                const brainDir = _getBrainDir();
                if (brainDir && fs.existsSync(brainDir)) { rootPath = brainDir; }
            } catch { /* ignore */ }
        }

        if (!rootPath) return ['❌ 작업 폴더를 찾을 수 없습니다.'];

        // Simple tag parsing logic (as in sidebar-chat.ts)
        const createRegex = /<(?:create_file|write_file|file)\s+(?:path|file|name|경로|파일)=['"]?([^'">]+)['"]?[^>]*>([\s\S]*?)<\/(?:create_file|write_file|file)>/gi;
        let match;
        while ((match = createRegex.exec(aiMessage)) !== null) {
            const relPath = match[1].trim();
            let content = match[2].trim();
            const resolved = _resolveFlexiblePath(relPath, rootPath);
            if (resolved) {
                const absPath = resolved.abs;
                try {
                    fs.mkdirSync(path.dirname(absPath), { recursive: true });
                    const existed = fs.existsSync(absPath);
                    fs.writeFileSync(absPath, content, 'utf-8');
                    report.push(`${existed ? '✏️ 덮어씀' : '✅ 생성'}: ${absPath.replace(os.homedir(), '~')}`);
                } catch (e: any) {
                    report.push(`❌ 생성 실패: ${relPath} — ${e.message}`);
                }
            }
        }

        const runRegex = /<(?:run_command|command|bash|terminal)>([\s\S]*?)<\/(?:run_command|command|bash|terminal)>/gi;
        while ((match = runRegex.exec(aiMessage)) !== null) {
            const cmd = match[1].trim();
            if (opts?.skipRunCommand) continue;
            try {
                const r = await runCommandCaptured(cmd, rootPath, (chunk) => {
                    if (opts?.appendToOutput) opts.appendToOutput(chunk);
                });
                const status = r.exitCode === 0 ? '✅' : '❌';
                report.push(`${status} 실행: \`${cmd}\``);
            } catch (e: any) {
                report.push(`❌ 실행 실패: \`${cmd}\` — ${e.message}`);
            }
        }

        return report;
    }

    private async _tryDataShortcut(prompt: string, sessionDir: string): Promise<boolean> {
        return false;
    }

    public detectExplicitMention(prompt: string): { agentId: string; agentName: string } | null {
        for (const id of SPECIALIST_IDS) {
            const a = AGENTS[id];
            if (!a) continue;
            // "현빈아", "현빈님", "현빈 " 등
            const re = new RegExp(`${a.name}(?:아|야|님|\\b)`, 'i');
            if (re.test(prompt)) return { agentId: id, agentName: a.name };
        }
        return null;
    }

    private async _tryRevenueShortcut(prompt: string): Promise<string | null> {
        return null;
    }

    private _tryKitShortcut(agentId: string, prompt: string): string | null {
        return null;
    }

    private _buildRecentFilesContext(agentId: string): string {
        return "";
    }
}
