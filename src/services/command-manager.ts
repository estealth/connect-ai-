import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { SidebarChatProvider } from '../ui/sidebar-chat';
import { 
    startYouTubeOAuthFlow, 
    _runDailyBriefingOnce, 
    _getLastSpecialistOutput, 
    saveAgentSkill, 
    appendConversationLog, 
    appendAgentMemory, 
    scaffoldDeveloperProject, 
    showBrainNetwork, 
    updateTrackerTask,
    _youtubeCommentReplyDraftBatch,
    CompanyDashboardPanel,
    ApiConnectionsPanel,
    RevenueDashboardPanel,
    TaskTreeItem,
    runChangeCompanyDir,
    runConnectCompanyRepo,
    runConnectGoogleCalendarWrite
} from '../extension';
import { TaskTreeProvider } from '../extension'; // Move later
import { getCompanyDir, _getBrainDir } from '../paths';
import { AGENTS, SPECIALIST_IDS } from '../agents';
import { getConfig, _isLMStudioEngine } from '../utils/config';
import { _pythonCmd, _invalidatePythonCmdCache, _pythonMissingHint } from '../utils/python';
import { TaskPriority, TrackerTask } from '../services/types';
import { OfficePanel } from '../ui/office-panel';

export class CommandManager {
    constructor(
        private context: vscode.ExtensionContext,
        private provider: SidebarChatProvider,
        private taskTreeProvider: TaskTreeProvider
    ) {}

    public registerAll() {
        this.context.subscriptions.push(
            vscode.commands.registerCommand('shinAi.youtube.connectOAuth', () => this.handleYoutubeOAuth()),
            vscode.commands.registerCommand('shinAi.dashboard.open', () => this.openDashboard()),
            vscode.commands.registerCommand('shinAi.apiConnections.open', () => this.openApiConnections()),
            vscode.commands.registerCommand('shinAi.revenueDashboard.open', () => this.openRevenueDashboard()),
            vscode.commands.registerCommand('shinAi.tasks.refresh', () => this.refreshTasks()),
            vscode.commands.registerCommand('shinAi.tasks.markDone', (item: TaskTreeItem) => this.markTaskDone(item)),
            vscode.commands.registerCommand('shinAi.tasks.cancel', (item: TaskTreeItem) => this.cancelTask(item)),
            vscode.commands.registerCommand('shinAi.tasks.setPriority', (item: TaskTreeItem) => this.setTaskPriority(item)),
            vscode.commands.registerCommand('shinAi.tasks.openTrackerJson', () => this.openTrackerJson()),
            vscode.commands.registerCommand('shinAi.diagnoseConnection', () => this.diagnoseConnection()),
            vscode.commands.registerCommand('shinAi.dailyBriefing.fireNow', () => this.fireDailyBriefing()),
            vscode.commands.registerCommand('shinAi.skill.saveLast', () => this.saveLastSkill()),
            vscode.commands.registerCommand('shinAi.youtube.refreshCommentQueue', () => this.refreshYoutubeQueue()),
            vscode.commands.registerCommand('shinAi.developer.scaffoldProject', () => this.scaffoldProject()),
            vscode.commands.registerCommand('shin-ai.newChat', () => this.provider.resetChat()),
            vscode.commands.registerCommand('shin-ai.exportChat', () => this.provider.exportChat()),
            vscode.commands.registerCommand('shin-ai.focusChat', () => this.provider.focusInput()),
            vscode.commands.registerCommand('shin-ai.explainSelection', () => this.explainSelection()),
            vscode.commands.registerCommand('shin-ai.showBrainNetwork', () => showBrainNetwork(this.context)),
            vscode.commands.registerCommand('shin-ai.openOffice', () => this.openOffice()),
            vscode.commands.registerCommand('shin-ai.openSettings', () => (this.provider as any)._handleSettingsMenu?.()),
            vscode.commands.registerCommand('shin-ai.changeCompanyDir', () => runChangeCompanyDir()),
            vscode.commands.registerCommand('shin-ai.connectCompanyRepo', () => runConnectCompanyRepo()),
            vscode.commands.registerCommand('shin-ai.connectGoogleCalendarWrite', () => runConnectGoogleCalendarWrite())
        );
    }

    private async handleYoutubeOAuth() {
        const r = await startYouTubeOAuthFlow();
        if (r.ok) {
            vscode.window.showInformationMessage(r.message);
        } else {
            vscode.window.showWarningMessage(r.message);
        }
    }

    private openDashboard() {
        try {
            CompanyDashboardPanel.createOrShow(this.context.extensionUri);
        } catch (e: any) {
            vscode.window.showErrorMessage(`👥 직원 에이전트 보기 열기 실패: ${e?.message || e}`);
        }
    }

    private openApiConnections() {
        ApiConnectionsPanel.createOrShow();
    }

    private openRevenueDashboard() {
        RevenueDashboardPanel.createOrShow();
    }

    private refreshTasks() {
        this.taskTreeProvider.refresh();
    }

    private markTaskDone(item: TaskTreeItem) {
        if (item?.task) {
            updateTrackerTask(item.task.id, { status: 'done', evidence: '사이드바에서 완료 처리' });
        }
    }

    private async cancelTask(item: TaskTreeItem) {
        if (!item?.task) return;
        const ok = await vscode.window.showWarningMessage(`"${item.task.title}" 취소할까요?`, '취소', '뒤로');
        if (ok === '취소') {
            updateTrackerTask(item.task.id, { status: 'cancelled', evidence: '사이드바에서 취소' });
        }
    }

    private async setTaskPriority(item: TaskTreeItem) {
        if (!item?.task) return;
        const pick = await vscode.window.showQuickPick(
            [
                { label: '🔴 긴급 (urgent)', value: 'urgent' as TaskPriority },
                { label: '🟠 높음 (high)',   value: 'high'   as TaskPriority },
                { label: '⚪ 보통 (normal)', value: 'normal' as TaskPriority },
                { label: '🔵 낮음 (low)',    value: 'low'    as TaskPriority },
            ],
            { placeHolder: '우선순위 선택' }
        );
        if (pick) updateTrackerTask(item.task.id, { priority: pick.value });
    }

    private async openTrackerJson() {
        const p = path.join(getCompanyDir(), '_shared', 'tracker.json');
        if (!fs.existsSync(p)) {
            vscode.window.showInformationMessage('아직 tracker.json 이 없어요. 작업이 등록되면 생성됩니다.');
            return;
        }
        const doc = await vscode.workspace.openTextDocument(p);
        await vscode.window.showTextDocument(doc);
    }

    private async diagnoseConnection() {
        const out: string[] = [];
        const ok = (s: string) => out.push(`✅ ${s}`);
        const warn = (s: string) => out.push(`⚠️ ${s}`);
        const err = (s: string) => out.push(`❌ ${s}`);
        const info = (s: string) => out.push(`ℹ️ ${s}`);

        const cfg = getConfig();
        const baseUrl = cfg.ollamaBase || '';
        info(`설정된 LLM 서버: ${baseUrl || '(비어있음)'}`);
        info(`설정된 기본 모델: ${cfg.defaultModel || '(비어있음)'}`);

        // Ollama Check
        try {
            const r = await axios.get('http://127.0.0.1:11434/api/tags', { timeout: 2500 });
            const models = (r.data?.models || []).map((m: any) => m?.name).filter(Boolean);
            if (models.length > 0) ok(`Ollama 실행 중 · 모델 ${models.length}개`);
            else warn(`Ollama 실행 중이지만 모델 0개`);
        } catch { err(`Ollama 미실행`); }

        // LM Studio Check
        try {
            const r = await axios.get('http://127.0.0.1:1234/v1/models', { timeout: 2500 });
            const models = (r.data?.data || []).map((m: any) => m?.id).filter(Boolean);
            if (models.length > 0) ok(`LM Studio 실행 중 · 모델 ${models.length}개`);
            else warn(`LM Studio 실행 중이지만 모델 안 로드됨`);
        } catch { err(`LM Studio 미실행`); }

        const doc = await vscode.workspace.openTextDocument({
            language: 'markdown',
            content: `# 🔍 SHIN AI — LLM 연결 진단\n\n${out.join('\n')}`
        });
        await vscode.window.showTextDocument(doc, { preview: false });
    }

    private async fireDailyBriefing() {
        try {
            await _runDailyBriefingOnce(true);
            vscode.window.showInformationMessage('🌅 데일리 브리핑이 텔레그램으로 발송됐어요.');
        } catch (e: any) {
            vscode.window.showErrorMessage(`브리핑 발사 실패: ${e?.message || e}`);
        }
    }

    private async saveLastSkill() {
        try {
            const last = _getLastSpecialistOutput();
            if (!last) {
                vscode.window.showWarningMessage('직전 specialist 산출물을 찾지 못했어요.');
                return;
            }
            const allIds = SPECIALIST_IDS.slice();
            const items = allIds.map(id => {
                const a = AGENTS[id];
                return { label: `${a.emoji} ${a.name}`, id } as any;
            });
            const pick = await vscode.window.showQuickPick(items);
            if (!pick) return;
            const result = await saveAgentSkill(pick.id, last.body);
            if (result.ok) vscode.window.showInformationMessage(`✅ 스킬 저장됨: ${result.title}`);
        } catch (e: any) {
            vscode.window.showErrorMessage(`스킬 저장 실패: ${e?.message || e}`);
        }
    }

    private async refreshYoutubeQueue() {
        try {
            const r = await _youtubeCommentReplyDraftBatch({});
            vscode.window.showInformationMessage(`📺 답장 초안 ${r.drafted}건 생성`);
        } catch (e: any) {
            vscode.window.showErrorMessage(`YouTube 큐 갱신 실패: ${e?.message || e}`);
        }
    }

    private async scaffoldProject() {
        const name = await vscode.window.showInputBox({ placeHolder: '프로젝트 이름' });
        if (!name) return;
        const result = await scaffoldDeveloperProject(name, 'vite-vanilla');
        if (result.ok) vscode.window.showInformationMessage(`✅ 생성 완료: ${result.path}`);
    }

    private explainSelection() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const selection = editor.document.getText(editor.selection);
        if (selection.trim()) {
            this.provider.sendPromptFromExtension(`이 코드를 분석하고 설명해줘:\n\`\`\`\n${selection}\n\`\`\``);
        }
    }

    private openOffice() {
        OfficePanel.createOrShow(this.context, this.provider);
    }
}
