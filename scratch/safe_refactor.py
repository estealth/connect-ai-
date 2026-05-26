import re
import os

def refactor_extension_ts_safely():
    file_path = 'src/extension.ts'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Imports and re-exports at the top
    top_imports = """
import { CompanyDashboardPanel } from './ui/dashboard-panel';
import { ApiConnectionsPanel } from './ui/connections-panel';
import { RevenueDashboardPanel } from './ui/revenue-panel';
import { TaskTreeProvider, TaskTreeItem } from './ui/task-tree';

export { CompanyDashboardPanel, ApiConnectionsPanel, RevenueDashboardPanel, TaskTreeProvider, TaskTreeItem };
"""
    if "import { CompanyDashboardPanel }" not in content:
        # Insert after the first few imports
        content = re.sub(r'^(import\s+.*?\n)', r'\1' + top_imports, content, count=1)

    # 2. Rename moved functions to _OBSOLETE_ to avoid duplicates
    moved_members = [
        'readTracker', 'writeTracker', 'addTrackerTask', 'updateTrackerTask',
        'readCompanyName', 'getCompanyMetrics', 'updateCompanyMetrics', 'getCompanyDay',
        'isAgentHired', 'markAgentHired', 'isAgentActive', 'setAgentActive',
        'readAgentModelMap', 'writeAgentModelMap', 'readHiredAgents', 'readActiveAgents',
        'isYoutubeOAuthConnected', 'startYouTubeOAuthFlow', 'fetchYouTubeAnalyticsSummary',
        'youtubeCommentReplyDraftBatch', '_youtubeCommentReplyDraftBatch',
        'resolveApproval', '_runDailyBriefingOnce', 'maybeRecommendCoderModel',
        'ensureCompanyStructure', 'appendTrackerTask'
    ]

    for name in moved_members:
        # Match function/const/let/class definition
        # We use a pattern that matches the start of the declaration
        pattern = r'(?m)^(export\s+)?(async\s+)?(function|const|let|class)\s+' + re.escape(name) + r'\b'
        
        def rename_func(m):
            prefix = m.group(1) or ""
            async_p = m.group(2) or ""
            kind = m.group(3)
            return f"{prefix}{async_p}{kind} _OBSOLETE_{name}"

        content = re.sub(pattern, rename_func, content)

    # 3. Fix common syntax errors like "export export" or "export async export"
    content = content.replace('export export ', 'export ')
    content = content.replace('export async export ', 'export async ')
    content = re.sub(r'async\s+export\s+function', 'export async function', content)
    content = content.replace('Noneasync', 'async')

    # 4. Fix implicit any in array methods (common source of TSC errors)
    content = re.sub(r'\.filter\((\w+)\s*=>', r'.filter((\1: any) =>', content)
    content = re.sub(r'\.map\((\w+)\s*=>', r'.map((\1: any) =>', content)

    # 5. Add Service Wrappers at the bottom if not already there
    wrappers = """
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
"""
    if "Service Wrappers" not in content:
        content += wrappers

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("extension.ts refactored safely.")

refactor_extension_ts_safely()
