import re
import os

def final_wrapper_fix():
    file_path = 'src/extension.ts'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define the correct and complete set of wrappers
    correct_wrappers = """
// ============================================================
// Service Wrappers (Backward compatibility for UI panels)
// ============================================================
import { TrackerService } from './services/tracker-service';
import { CompanyService } from './services/company-service';
import { YouTubeService } from './services/youtube-service';
import { ApprovalService } from './services/approval-service';
import { NotificationService } from './services/notification-service';
import { ModelService } from './services/model-service';

export function readTracker(): any { return TrackerService.getInstance().readTracker(); }
export function writeTracker(data: any): void { TrackerService.getInstance().writeTracker(data); }
export function appendTrackerTask(req: any): any { return TrackerService.getInstance().addTrackerTask(req); }
export function addTrackerTask(req: any): any { return TrackerService.getInstance().addTrackerTask(req); }
export function updateTrackerTask(id: string, updates: any): any { return TrackerService.getInstance().updateTrackerTask(id, updates); }

export function ensureCompanyStructure(): void { CompanyService.getInstance().ensureCompanyStructure(); }
export function readCompanyName(): string { return CompanyService.getInstance().readCompanyName(); }
export function getCompanyMetrics(): any { return CompanyService.getInstance().getCompanyMetrics(); }
export function updateCompanyMetrics(updates: any): void { CompanyService.getInstance().updateCompanyMetrics(updates); }
export function getCompanyDay(): number { return CompanyService.getInstance().getCompanyDay(); }
export function isAgentHired(id: string): boolean { return CompanyService.getInstance().isAgentHired(id); }
export function markAgentHired(id: string, hired: boolean = true): boolean { CompanyService.getInstance().markAgentHired(id, hired); return true; }
export function isAgentActive(id: string): boolean { return CompanyService.getInstance().isAgentActive(id); }
export function setAgentActive(id: string, active: boolean): boolean { CompanyService.getInstance().setAgentActive(id, active); return true; }
export function readAgentModelMap(): any { return CompanyService.getInstance().readAgentModelMap(); }
export function writeAgentModelMap(map: any): void { CompanyService.getInstance().writeAgentModelMap(map); }
export function readHiredAgents(): any { return CompanyService.getInstance().readHiredAgents(); }
export function readActiveAgents(): any { return CompanyService.getInstance().readActiveAgents(); }

export function isYoutubeOAuthConnected(): boolean { return YouTubeService.getInstance().isYoutubeOAuthConnected(); }
export async function startYouTubeOAuthFlow(): Promise<any> { return YouTubeService.getInstance().startYouTubeOAuthFlow(); }
export async function fetchYouTubeAnalyticsSummary(): Promise<any> { return YouTubeService.getInstance().fetchYouTubeAnalyticsSummary(); }
export async function _youtubeCommentReplyDraftBatch(opts?: any): Promise<any> { return YouTubeService.getInstance().youtubeCommentReplyDraftBatch(opts); }

export async function resolveApproval(id: string, status: any): Promise<any> { return ApprovalService.getInstance().resolveApproval(id, status); }
export async function _runDailyBriefingOnce(force: boolean = false): Promise<void> { return NotificationService.getInstance().runDailyBriefingOnce(force); }

export function _maybeRecommendCoderModel(webview: any): void { ModelService.maybeRecommendCoderModel(webview); }

export function setAutoSyncRunning(v: boolean) { (global as any)._autoSyncRunning = v; }
export { _autoSyncRunning };
"""

    if "// Service Wrappers" in content:
        content = content.split("// Service Wrappers")[0] + correct_wrappers
    else:
        content += correct_wrappers

    # Add missing functions that UI expects from extension.ts but were not in my previous list
    # readAgentGoal, readAgentRagMode, readAgentSelfRagCriteria, readTelegramConfig, listAgentTools, readAgentSkills
    
    # Actually, I'll just make sure THEY are exported in the main file
    missing_exports = [
        'readAgentGoal', 'readAgentRagMode', 'readAgentSelfRagCriteria', 
        'readTelegramConfig', 'listAgentTools', 'readAgentSkills',
        '_personalizePrompt', 'readAgentSharedContext', 'autoMarkTrackerFromDispatch',
        'rebuildUnifiedSchedule', '_safeGitAutoSync', '_safeGitAutoSyncCompany',
        '_resolveFlexiblePath', '_renderUnifiedDiff', '_globMatch', '_grepFiles',
        '_revealInOsExplorer', '_openInDefaultApp', '_ensureBrainDir',
        'buildKnowledgeGraph', 'buildWorldDeskPositions', '_activeChatProvider',
        'CONFER_PROMPT', 'CEO_REPORT_PROMPT', 'DECISIONS_EXTRACT_PROMPT',
        'WORLD_LAYOUT', 'CUSTOM_MAP_DESKS', 'SYSTEM_PROMPT',
        'writeAgentGoal', 'writeAgentRagMode', 'writeAgentSelfRagCriteria',
        'writeCompanyConfig', 'readCompanyConfig', 'routeBrainInjectionToAgents',
        'buildSpecialistPrompt', 'buildAgentConfigStatus', 'makeSessionDir',
        'readSecretaryBridgeMode', '_isCasualChat', '_extractFirstJsonObject',
        'prefetchAgentRealtimeData', 'BrainGraph', 'SECRETARY_TRIAGE_PROMPT',
        'CEO_CHAT_PROMPT', 'CEO_PLANNER_PROMPT', '_RENDER_GRAPH_HTML', '_extCtx',
        'isCompanyConfigured', 'countAgentVerifiedClaims', 'writeToolConfig',
        'setToolEnabled', 'appendConversationLog', '_safeReadText', 'getConversationsDir',
        'setCompanyDir', 'readRecentConversations', '_ytDashboardProvider'
    ]
    
    for name in missing_exports:
        pattern = r'(?m)^(?!export\s+)(async\s+)?(function|const|let|class|interface|type|var)\s+' + re.escape(name) + r'\b'
        content = re.sub(pattern, r'export \1\2 ' + name, content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Wrappers and exports fixed.")

final_wrapper_fix()
