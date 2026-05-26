const fs = require('fs');

const file = 'src/extension.ts';
let code = fs.readFileSync(file, 'utf-8');

const wrappers = `
// ============================================================
// Service Wrappers (Backward compatibility for UI panels)
// ============================================================
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
export function markAgentHired(id: string): boolean { return CompanyService.getInstance().markAgentHired(id); }
export function isAgentActive(id: string): boolean { return CompanyService.getInstance().isAgentActive(id); }
export function setAgentActive(id: string, active: boolean): boolean { return CompanyService.getInstance().setAgentActive(id, active); }
export function readAgentModelMap(): any { return CompanyService.getInstance().readAgentModelMap(); }
export function writeAgentModelMap(map: any): void { CompanyService.getInstance().writeAgentModelMap(map); }

export function isYoutubeOAuthConnected(): boolean { return YouTubeService.getInstance().isYoutubeOAuthConnected(); }
export async function startYouTubeOAuthFlow(): Promise<any> { return YouTubeService.getInstance().startYouTubeOAuthFlow(); }
export async function fetchYouTubeAnalyticsSummary(): Promise<any> { return YouTubeService.getInstance().fetchYouTubeAnalyticsSummary(); }
export async function _youtubeCommentReplyDraftBatch(opts?: any): Promise<any> { return YouTubeService.getInstance().youtubeCommentReplyDraftBatch(opts); }

export async function resolveApproval(id: string, status: any): Promise<void> { return ApprovalService.getInstance().resolveApproval(id, status); }
export async function _runDailyBriefingOnce(force: boolean = false): Promise<void> { return NotificationService.getInstance().runDailyBriefingOnce(force); }

export function _maybeRecommendCoderModel(webview: any): void { ModelService.maybeRecommendCoderModel(webview); }

`;

if (!code.includes('Service Wrappers')) {
    code += wrappers;
}

// Export the prompt constants that were accidentally unexported or hidden
code = code.replace(/const CEO_REPORT_PROMPT =/g, 'export const CEO_REPORT_PROMPT =');
code = code.replace(/const DECISIONS_EXTRACT_PROMPT =/g, 'export const DECISIONS_EXTRACT_PROMPT =');
code = code.replace(/const WORLD_LAYOUT =/g, 'export const WORLD_LAYOUT =');
code = code.replace(/const CUSTOM_MAP_DESKS =/g, 'export const CUSTOM_MAP_DESKS =');
code = code.replace(/const SECRETARY_TRIAGE_PROMPT =/g, 'export const SECRETARY_TRIAGE_PROMPT =');
code = code.replace(/const CEO_CHAT_PROMPT =/g, 'export const CEO_CHAT_PROMPT =');
code = code.replace(/const CEO_PLANNER_PROMPT =/g, 'export const CEO_PLANNER_PROMPT =');
code = code.replace(/const _RENDER_GRAPH_HTML =/g, 'export const _RENDER_GRAPH_HTML =');

// For ALWAYS_ON_AGENTS, LOCKED_AGENTS_DEFAULT, those are in agents.ts now.
// We need to re-export them from extension.ts if sidebar imports them from there.
const reexports = `
export { ALWAYS_ON_AGENTS, LOCKED_AGENTS_DEFAULT } from './agents';
`;
if (!code.includes('export { ALWAYS_ON_AGENTS')) {
    code += reexports;
}

fs.writeFileSync(file, code);
console.log('Added wrappers to extension.ts');
