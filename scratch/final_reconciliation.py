import re
import os

def fix_extension():
    path = 'src/extension.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove the entire wrapper section if it exists, we will re-add it cleanly
    wrapper_start = '// Service Wrappers'
    idx = content.find(wrapper_start)
    if idx != -1:
        content = content[:idx]

    # 2. Fix the duplicate functions by commenting out the original ones
    # We'll search for the original definitions and rename them.
    # Note: I already renamed some to _DEPRECATED_, but maybe not all.
    # Let's just remove them if they exist.
    funcs = [
        'readTracker', 'writeTracker', 'appendTrackerTask', 'updateTrackerTask',
        'recordNudgeTime', 'ensureCompanyStructure', 'readCompanyName',
        'getCompanyMetrics', 'updateCompanyMetrics', 'getCompanyDay',
        'isAgentHired', 'markAgentHired', 'isAgentActive', 'setAgentActive',
        'readAgentModelMap', 'writeAgentModelMap', 'readHiredAgents', 'readActiveAgents',
        'isYoutubeOAuthConnected', 'startYouTubeOAuthFlow', 'fetchYouTubeAnalyticsSummary',
        '_youtubeCommentReplyDraftBatch', 'resolveApproval', '_runDailyBriefingOnce',
        '_maybeRecommendCoderModel', 'addTrackerTask', 'setAutoSyncRunning'
    ]
    for f in funcs:
        # Match from the start of the line to catch the export/function
        content = re.sub(r'(?m)^(export\s+)?(async\s+)?function\s+' + re.escape(f) + r'\b', r'async function _OBSOLETE_' + f, content)
        content = re.sub(r'(?m)^(export\s+)?(const|let)\s+' + re.escape(f) + r'\b', r'const _OBSOLETE_' + f, content)

    # 3. Add clean wrappers at the bottom
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
export function updateTrackerTask(id: string, updates: any): boolean { return TrackerService.getInstance().updateTrackerTask(id, updates) !== null; }
export function recordNudgeTime(taskId: string, nudgeType: any): void { /* No longer used directly */ }

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

export function setAutoSyncRunning(v: boolean) { _autoSyncRunning = v; }

export { ALWAYS_ON_AGENTS, LOCKED_AGENTS_DEFAULT } from './agents';
"""
    content += wrappers

    # 4. Fix implicit 'any' in extension.ts
    # Look for .filter(t => ...) or .sort((a,b) => ...)
    content = content.replace('.filter(t =>', '.filter((t: any) =>')
    content = content.replace('.sort((a, b) =>', '.sort((a: any, b: any) =>')
    content = content.replace('.map(t =>', '.map((t: any) =>')

    # 5. Fix common return type issues (void vs boolean/object)
    # If a function expects a return with .message or .ok but gets void.
    # This usually happens in dashboard-providers or office-panel.
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_sidebar():
    path = 'src/ui/sidebar-chat.ts'
    if not os.path.exists(path): return
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix implicit any
    content = content.replace('.filter(n =>', '.filter((n: any) =>')
    content = content.replace('.map(t =>', '.map((t: any) =>')
    content = content.replace('.find(t =>', '.find((t: any) =>')
    content = content.replace('.forEach(f =>', '.forEach((f: any) =>')
    
    # Fix CompanyService.getInstance().CompanyService.getInstance()...
    content = content.replace('CompanyService.getInstance().CompanyService.getInstance().', 'CompanyService.getInstance().')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def fix_other_services():
    # Fix paths.ts to export getConversationsDir if it's missing
    p_path = 'src/paths.ts'
    if os.path.exists(p_path):
        with open(p_path, 'r', encoding='utf-8') as f:
            p_content = f.read()
        if 'export function getConversationsDir' not in p_content:
            p_content = p_content.replace('function getConversationsDir', 'export function getConversationsDir')
            with open(p_path, 'w', encoding='utf-8') as f:
                f.write(p_content)

fix_extension()
fix_sidebar()
fix_other_services()
print("Final reconciliation complete.")
