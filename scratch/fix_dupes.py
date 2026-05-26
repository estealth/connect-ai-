import re

# 1. Fix company-service.ts
with open('src/services/company-service.ts', 'r', encoding='utf-8') as f:
    cs = f.read()
cs = cs.replace('this.getCompanyDir()', 'getCompanyDir()')
if "import { getCompanyDir" not in cs:
    cs = cs.replace("import * as fs", "import * as fs\nimport { getCompanyDir } from '../paths';")
with open('src/services/company-service.ts', 'w', encoding='utf-8') as f:
    f.write(cs)

# 2. Fix extension.ts duplicate wrappers
with open('src/extension.ts', 'r', encoding='utf-8') as f:
    ext = f.read()

# Remove everything after Service Wrappers
idx = ext.find('// Service Wrappers (Backward compatibility for UI panels)')
if idx != -1:
    ext = ext[:idx] # cut it out completely

wrappers = """// Service Wrappers (Backward compatibility for UI panels)
// ============================================================
import { TrackerService } from './services/tracker-service';
import { CompanyService } from './services/company-service';
import { YouTubeService } from './services/youtube-service';
import { ApprovalService } from './services/approval-service';
import { NotificationService } from './services/notification-service';
import { ModelService } from './services/model-service';

export function readTracker(): any { return TrackerService.getInstance().readTracker(); }
export function writeTracker(data: any): void { TrackerService.getInstance().writeTracker(data); }
export function appendTrackerTask(req: any): any { return TrackerService.getInstance().appendTrackerTask(req); }
export function updateTrackerTask(id: string, updates: any): boolean { return TrackerService.getInstance().updateTrackerTask(id, updates); }
export function recordNudgeTime(taskId: string, nudgeType: any): void { TrackerService.getInstance().recordNudgeTime(taskId, nudgeType); }

export function ensureCompanyStructure(): void { CompanyService.getInstance().ensureCompanyStructure(); }
export function readCompanyName(): string { return CompanyService.getInstance().readCompanyName(); }
export function getCompanyMetrics(): any { return CompanyService.getInstance().getCompanyMetrics(); }
export function updateCompanyMetrics(updates: any): void { CompanyService.getInstance().updateCompanyMetrics(updates); }
export function getCompanyDay(): number { return CompanyService.getInstance().getCompanyDay(); }
export function isAgentHired(id: string): boolean { return CompanyService.getInstance().isAgentHired(id); }
export function markAgentHired(id: string): boolean { return CompanyService.getInstance().markAgentHired(id, true); }
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

export async function resolveApproval(id: string, status: any): Promise<void> { return ApprovalService.getInstance().resolveApproval(id, status); }
export async function _runDailyBriefingOnce(force: boolean = false): Promise<void> { return NotificationService.getInstance().runDailyBriefingOnce(force); }

export function _maybeRecommendCoderModel(webview: any): void { ModelService.maybeRecommendCoderModel(webview); }

export { ALWAYS_ON_AGENTS, LOCKED_AGENTS_DEFAULT } from './agents';
"""

with open('src/extension.ts', 'w', encoding='utf-8') as f:
    f.write(ext + wrappers)

# 3. Fix missing exports that are still missing (BrainGraph, SYSTEM_PROMPT)
with open('src/extension.ts', 'r', encoding='utf-8') as f:
    ext = f.read()

funcs_to_export2 = [
    '_migrateCompanyToBrain',
    '_approvalsPendingDir',
    '_getLastSpecialistOutput',
    'saveAgentSkill',
    'scaffoldDeveloperProject',
    'showBrainNetwork',
    'TaskTreeItem',
    'runChangeCompanyDir',
    'runConnectCompanyRepo',
    'runConnectGoogleCalendarWrite',
    'TaskTreeProvider',
    'CUSTOM_MAP_DESKS',
    'DeskPos',
    'WorldZone',
    'BrainGraph',
    'SYSTEM_PROMPT'
]

for func in funcs_to_export2:
    # use sophisticated regex to add export if missing, avoiding matching inside words
    # matches `const SYSTEM_PROMPT` or `class BrainGraph` or `interface DeskPos`
    ext = re.sub(r'(\n)?(?:function|let|const|class|interface) ' + func + r'\b', r'\1export \g<0>', ext)

ext = ext.replace('export export', 'export')
with open('src/extension.ts', 'w', encoding='utf-8') as f:
    f.write(ext)
print("Wrappers fixed and duplicate functions removed")
