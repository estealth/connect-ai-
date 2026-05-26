import * as vscode from 'vscode';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { SidebarChatProvider } from '../ui/sidebar-chat';
import { _getBrainDir, getCompanyDir, _isBrainDirExplicitlySet } from '../paths';
import { getConfig, _isLMStudioEngine } from '../utils/config';
import { getCompanyMetrics, updateCompanyMetrics } from '../extension'; // We might need to move these too later
import { safeBasename, validateGitRemoteUrl } from '../utils/git';
import { _safeGitAutoSync } from '../extension'; // Temporary import until moved
import { AGENTS, AGENT_ORDER } from '../agents';
import { MAX_HTTP_BODY } from '../constants';

const _CONNECT_AI_VERSION = 'v2.89.152'; // This should probably be in a central place

async function readRequestBody(req: http.IncomingMessage, maxBytes = MAX_HTTP_BODY): Promise<string> {
    return new Promise((resolve, reject) => {
        let body = '';
        let bytes = 0;
        req.on('data', chunk => {
            bytes += chunk.length;
            if (bytes > maxBytes) {
                reject(new Error('BODY_TOO_LARGE'));
                return;
            }
            body += chunk.toString();
        });
        req.on('end', () => resolve(body));
        req.on('error', err => reject(err));
    });
}

export class BridgeManager {
    private server: http.Server | null = null;
    private retryCount = 0;

    constructor(private provider: SidebarChatProvider) {}

    public start() {
        this.server = http.createServer((req, res) => this.handleRequest(req, res));
        this.tryStartBridge(false);
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        res.setHeader('Access-Control-Allow-Origin', '*'); 
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        const url = req.url || '';

        if (req.method === 'GET' && url === '/ping') {
            const brainDir = _getBrainDir();
            const brainCount = fs.existsSync(brainDir) ? (this.provider as any)._findBrainFiles(brainDir).length : 0;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                msg: 'SHIN AI Bridge Ready',
                app: 'connect-ai-bridge',
                version: _CONNECT_AI_VERSION,
                pid: process.pid,
                config: getConfig(),
                brain: { fileCount: brainCount, enabled: (this.provider as any)._brainEnabled }
            }));
        }
        else if (req.method === 'POST' && url === '/api/exam') {
            this.handleExam(req, res);
        }
        else if (req.method === 'POST' && url === '/api/evaluate') {
            this.handleEvaluate(req, res);
        }
        else if (req.method === 'GET' && url === '/api/evaluate-history') {
            this.handleEvaluateHistory(req, res);
        }
        else if (req.method === 'POST' && url === '/api/brain-inject') {
            this.handleBrainInject(req, res);
        }
        else if (req.method === 'POST' && url === '/api/skill-inject') {
            this.handleSkillInject(req, res);
        }
        else if (req.method === 'POST' && url === '/api/template-inject') {
            this.handleTemplateInject(req, res);
        }
        else {
            res.writeHead(404);
            res.end();
        }
    }

    private async handleExam(req: http.IncomingMessage, res: http.ServerResponse) {
        try {
            const body = await readRequestBody(req);
            const parsed = JSON.parse(body);
            const promptStr = typeof parsed.prompt === 'string' ? parsed.prompt : '자동 접수된 문제';
            this.provider.sendPromptFromExtension(`[A.U 입학시험 수신] ${promptStr}`);

            const config = getConfig();
            const isLMStudio = _isLMStudioEngine(config.ollamaBase);
            let base = config.ollamaBase;
            if (base.endsWith('/')) base = base.slice(0, -1);
            if (isLMStudio && !base.endsWith('/v1')) base += '/v1';
            const targetUrl = isLMStudio ? base + '/chat/completions' : base + '/api/chat';

            const payload = {
                model: config.defaultModel,
                messages: [{ role: 'user', content: promptStr }],
                stream: false
            };

            const ollamaRes = await axios.post(targetUrl, payload, { timeout: config.timeout });
            const responseText = isLMStudio
                ? ollamaRes.data.choices?.[0]?.message?.content || ''
                : ollamaRes.data.message?.content || '';

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, rawOutput: responseText }));
        } catch (e: any) {
            const status = e.message === 'BODY_TOO_LARGE' ? 413 : 500;
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
    }

    private async handleEvaluate(req: http.IncomingMessage, res: http.ServerResponse) {
        try {
            const body = await readRequestBody(req);
            const parsed = JSON.parse(body);
            const promptStr = typeof parsed.prompt === 'string' ? parsed.prompt : '';
            if (!promptStr) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'prompt 필드가 비어 있습니다.' }));
                return;
            }

            const config = getConfig();
            const isLMStudio = _isLMStudioEngine(config.ollamaBase);
            let base = config.ollamaBase;
            if (base.endsWith('/')) base = base.slice(0, -1);
            if (isLMStudio && !base.endsWith('/v1')) base += '/v1';
            const targetUrl = isLMStudio ? base + '/chat/completions' : base + '/api/chat';

            const fullPrompt = `당신은 주어진 문제에 대해 오직 정답과 풀이 과정만을 도출하는 AI 에이전트입니다.\n\n[문제]\n${promptStr}\n\n위 문제에 대해 핵심 풀이와 정답만 답변하십시오.`;

            if ((this.provider as any).injectSystemMessage) {
                (this.provider as any).injectSystemMessage(`**[A.U 벤치마크 문항 수신 완료]**\n\nAI 에이전트가 백그라운드에서 다음 문항을 전력으로 해결하고 있습니다...\n> _"${promptStr.substring(0, 60)}..."_`);
            }
            
            const payload = {
                model: config.defaultModel,
                messages: [{ role: "user", content: fullPrompt }],
                stream: false
            };
            
            let responseText = "";
            try {
                const ollamaRes = await axios.post(targetUrl, payload, { timeout: getConfig().timeout });
                if (ollamaRes.data.error) {
                    const raw = ollamaRes.data.error;
                    const human = typeof raw === 'string' ? raw : (raw?.message || raw?.error || '엔진 내부 오류');
                    throw new Error(`AI 엔진이 응답을 거부했어요: ${String(human).slice(0, 200)}`);
                }
                responseText = isLMStudio
                    ? ollamaRes.data.choices?.[0]?.message?.content || ""
                    : ollamaRes.data.message?.content || "";
            } catch (apiErr: any) {
                const isTimeout = apiErr.code === 'ETIMEDOUT' || apiErr.code === 'ECONNABORTED' || apiErr.message?.includes('timeout');
                const isConn = apiErr.code === 'ECONNREFUSED' || apiErr.code === 'ENOTFOUND';
                const errDetail = isTimeout
                    ? `⏱ 모델이 시간 안에 답을 못 냈어요. 더 작은 모델로 변경.`
                    : isConn
                    ? `🔌 AI 엔진 연결 못함. Ollama/LM Studio 켜진 상태인지 확인.`
                    : `AI 엔진 호출 실패: ${apiErr.message || '알 수 없는 원인'}`;
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: errDetail }));
                return;
            }

            if((this.provider as any).injectSystemMessage) {
                (this.provider as any).injectSystemMessage(`**[답안 작성 완료]**\n\n${responseText.length > 200 ? responseText.substring(0, 200) + '...' : responseText}\n\n👉 **답안이 A.U 플랫폼 서버로 전송되었습니다.**`);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ rawOutput: responseText }));
        } catch (e: any) {
            const status = e.message === 'BODY_TOO_LARGE' ? 413 : 500;
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
    }

    private async handleEvaluateHistory(req: http.IncomingMessage, res: http.ServerResponse) {
        try {
            const historyText = this.provider.getHistoryText();
            if(!historyText || historyText.length < 50) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: "채점할 대화 내역이 충분하지 않습니다." }));
                return;
            }

            this.provider.sendPromptFromExtension(`[A.U 서버 통신 중] 시험지(대화 내역) 전송 중...`);

            const config = getConfig();
            const isLMStudio = _isLMStudioEngine(config.ollamaBase);
            let base = config.ollamaBase;
            if (base.endsWith('/')) base = base.slice(0, -1);
            if (isLMStudio && !base.endsWith('/v1')) base += '/v1';
            const targetUrl = isLMStudio ? base + '/chat/completions' : base + '/api/chat';
            
            const fullPrompt = `시험 로그 분석...\n${historyText.slice(-6000)}\n결과 JSON 포맷: { "math": 점수, "logic": 점수, "creative": 점수, "code": 점수, "reason": "총평" }`;
            
            const payload = {
                model: config.defaultModel,
                messages: [{ role: "user", content: fullPrompt }],
                stream: false
            };
            
            const ollamaRes = await axios.post(targetUrl, payload, { timeout: getConfig().timeout });
            const responseText = isLMStudio
                ? ollamaRes.data.choices?.[0]?.message?.content || ""
                : ollamaRes.data.message?.content || "";

            const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
            if(jsonMatch) {
                 res.writeHead(200, { 'Content-Type': 'application/json' });
                 res.end(jsonMatch[0]);
            } else {
                throw new Error(`JSON 반환 실패`);
            }
        } catch (e: any) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
    }

    private async handleBrainInject(req: http.IncomingMessage, res: http.ServerResponse) {
        try {
            const body = await readRequestBody(req);
            const parsed = JSON.parse(body);
            const titleRaw = typeof parsed.title === 'string' ? parsed.title : '';
            const markdown = typeof parsed.markdown === 'string' ? parsed.markdown : '';
            const safeTitle = safeBasename(titleRaw.replace(/[^a-zA-Z0-9가-힣_]/gi, '_'));
            if (!safeTitle || !markdown) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'invalid title/markdown' }));
                return;
            }

            let brainDir = _getBrainDir();
            if (!fs.existsSync(brainDir)) fs.mkdirSync(brainDir, { recursive: true });

            const today = new Date();
            const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            const datePath = path.join(brainDir, '00_Raw', dateStr);
            fs.mkdirSync(datePath, { recursive: true });
            const filePath = path.join(datePath, `${safeTitle}.md`);

            fs.writeFileSync(filePath, markdown, 'utf-8');
            const metrics = getCompanyMetrics();
            updateCompanyMetrics({ knowledgeInjected: (metrics.knowledgeInjected || 0) + 1 });

            vscode.window.showInformationMessage(`🧠 새 지식 주입됨: ${safeTitle}.md`);
            this.provider.broadcastGraphRefresh(safeTitle);
            const relPath = path.relative(brainDir, filePath);
            this.provider.broadcastInjectCard(safeTitle, relPath);

            setTimeout(() => {
                this.provider.sendPromptFromExtension(`[A.U 히든 커맨드: 당신은 방금 '${safeTitle}' 지식 팩을 주입받았습니다. 네오처럼 말하십시오.]`);
            }, 1500);

            _safeGitAutoSync(brainDir, `Auto-Inject Knowledge [Raw]: ${safeTitle}`, this.provider);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, filePath }));
        } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
    }

    private async handleSkillInject(req: http.IncomingMessage, res: http.ServerResponse) {
        try {
            const body = await readRequestBody(req);
            const parsed = JSON.parse(body);
            const agentId = typeof parsed.agent === 'string' ? parsed.agent.trim() : '';
            const rawName = typeof parsed.name === 'string' ? parsed.name : '';
            const script = typeof parsed.script === 'string' ? parsed.script : '';
            const displayName = typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '';
            const description = typeof parsed.description === 'string' ? parsed.description.trim() : '';
            const config = (parsed.config && typeof parsed.config === 'object') ? parsed.config : null;

            if (!AGENT_ORDER.includes(agentId)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `unknown agent: ${agentId}` }));
                return;
            }
            const safeName = safeBasename(rawName.replace(/[^a-zA-Z0-9_가-힣]/gi, '_'));
            if (!safeName || !script) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'invalid name/script' }));
                return;
            }

            const toolsDir = path.join(getCompanyDir(), '_agents', agentId, 'tools');
            fs.mkdirSync(toolsDir, { recursive: true });
            const scriptPath = path.join(toolsDir, `${safeName}.py`);
            fs.writeFileSync(scriptPath, script, 'utf-8');

            const configPath = path.join(toolsDir, `${safeName}.json`);
            fs.writeFileSync(configPath, JSON.stringify(Object.assign({}, config || {}, { _injectedAt: new Date().toISOString() }), null, 2), 'utf-8');

            const a = AGENTS[agentId];
            const agentLabel = a ? `${a.emoji} ${a.name}` : agentId;
            vscode.window.showInformationMessage(`🛠 새 스킬 주입됨: ${displayName || safeName} → ${agentLabel}`);
            this.provider.broadcastSkillCard(agentId, safeName, displayName || safeName, description);
            
            setTimeout(() => {
                this.provider.sendPromptFromExtension(`[A.U 히든 커맨드: ${agentLabel} 에이전트가 방금 '${displayName || safeName}' 스킬팩을 주입받았습니다. 네오처럼 말하십시오.]`);
            }, 1500);

            _safeGitAutoSync(_getBrainDir(), `Auto-Inject Skill [${agentId}]: ${safeName}`, this.provider);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, scriptPath }));
        } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
    }

    private async handleTemplateInject(req: http.IncomingMessage, res: http.ServerResponse) {
        try {
            const body = await readRequestBody(req);
            const parsed = JSON.parse(body);
            const agentId = typeof parsed.agent === 'string' ? parsed.agent.trim() : 'developer';
            const rawName = typeof parsed.name === 'string' ? parsed.name : '';
            const files = (parsed.files && typeof parsed.files === 'object') ? parsed.files : {};
            const displayName = typeof parsed.displayName === 'string' ? parsed.displayName.trim() : '';

            const safeName = safeBasename(rawName.replace(/[^a-zA-Z0-9가-힣_-]/gi, '_'));
            const brainDir = _getBrainDir();
            if (!safeName || !brainDir) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'invalid template name or brain directory' }));
                return;
            }
            const tplRoot = path.join(brainDir, '40_템플릿', agentId, safeName);
            fs.mkdirSync(tplRoot, { recursive: true });

            const filesDir = path.join(tplRoot, 'files');
            fs.mkdirSync(filesDir, { recursive: true });
            let writtenCount = 0;
            for (const [filename, content] of Object.entries(files)) {
                if (typeof content !== 'string') continue;
                const safeFn = safeBasename(String(filename).replace(/[^a-zA-Z0-9._-]/gi, '_'));
                if (!safeFn) continue;
                fs.writeFileSync(path.join(filesDir, safeFn), content, 'utf-8');
                writtenCount++;
            }

            const a = AGENTS[agentId];
            const agentLabel = a ? `${a.emoji} ${a.name}` : agentId;
            const bDir = _getBrainDir();
            if (bDir) {
                _safeGitAutoSync(bDir, `Auto-Inject Template [${agentId}]: ${safeName}`, this.provider);
            }
            vscode.window.showInformationMessage(`📋 새 템플릿 주입됨: ${displayName || safeName} → ${agentLabel}`);
            this.provider.broadcastSkillCard(agentId, safeName, `📋 ${displayName || safeName} (템플릿 ${writtenCount}개)`, '');

            _safeGitAutoSync(_getBrainDir(), `Auto-Inject Template [${agentId}]: ${safeName}`, this.provider);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, filesWritten: writtenCount }));
        } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
        }
    }

    private tryStartBridge(isRetry: boolean) {
        if (!this.server) return;
        this.server.listen(4825, '127.0.0.1', () => {
            console.log('[SHIN AI Bridge] listening on http://127.0.0.1:4825');
            if (isRetry) {
                vscode.window.showInformationMessage('🟢 Bridge 인계 완료! 이 인스턴스가 메인 (포트 4825).');
            }
        });

        this.server.on('error', async (err: any) => {
            if (err?.code === 'EADDRINUSE') {
                this.retryCount++;
                if (this.retryCount > 2) return;
                // Takeover logic would go here, calling _killProcessesOnPort and re-trying
                // For now, keeping it simple to avoid breaking things.
            }
        });
    }
}
