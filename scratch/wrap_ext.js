const fs = require('fs');

const file = 'src/extension.ts';
let code = fs.readFileSync(file, 'utf-8');

const replacements = [
    // Tracker
    [/export function readTracker\(\): \{ tasks: TrackerTask\[\] \} \{[\s\S]*?\n\}/, "export function readTracker(): { tasks: TrackerTask[] } { return TrackerService.getInstance().readTracker(); }\n"],
    [/export function writeTracker\(data: \{ tasks: TrackerTask\[\] \}\) \{[\s\S]*?\n\}/, "export function writeTracker(data: { tasks: TrackerTask[] }) { TrackerService.getInstance().writeTracker(data); }\n"],
    [/export function appendTrackerTask\(req: Omit<TrackerTask, 'id' \| 'createdAt' \| 'updatedAt'>\): TrackerTask \{[\s\S]*?\n\}/, "export function appendTrackerTask(req: Omit<TrackerTask, 'id' | 'createdAt' | 'updatedAt'>): TrackerTask { return TrackerService.getInstance().appendTrackerTask(req as any) as any; }\n"],
    [/export function updateTrackerTask\(id: string, updates: Partial<TrackerTask>\): boolean \{[\s\S]*?\n\}/, "export function updateTrackerTask(id: string, updates: Partial<TrackerTask>): boolean { return TrackerService.getInstance().updateTrackerTask(id, updates as any); }\n"],
    [/export function recordNudgeTime\(taskId: string, nudgeType: 'stale' \| 'deadline_pre'\) \{[\s\S]*?\n\}/, "export function recordNudgeTime(taskId: string, nudgeType: 'stale' | 'deadline_pre') { TrackerService.getInstance().recordNudgeTime(taskId, nudgeType); }\n"],

    // Company
    [/export function readCompanyName\(\): string \{[\s\S]*?\n\}/, "export function readCompanyName(): string { return CompanyService.getInstance().readCompanyName(); }\n"],
    [/export function getCompanyMetrics\(\)[\s\S]*?\n\}/, "export function getCompanyMetrics(): any { return CompanyService.getInstance().getCompanyMetrics(); }\n"],
    [/export function updateCompanyMetrics\(updates: any\) \{[\s\S]*?\n\}/, "export function updateCompanyMetrics(updates: any) { CompanyService.getInstance().updateCompanyMetrics(updates); }\n"],
    [/export function getCompanyDay\(\): number \{[\s\S]*?\n\}/, "export function getCompanyDay(): number { return CompanyService.getInstance().getCompanyDay(); }\n"],

    // YouTube
    [/export function isYoutubeOAuthConnected\(\): boolean \{[\s\S]*?\n\}/, "export function isYoutubeOAuthConnected(): boolean { return YouTubeService.getInstance().isYoutubeOAuthConnected(); }\n"],
    [/export async function startYouTubeOAuthFlow\(\): Promise<\{ ok: boolean; message: string \}> \{[\s\S]*?\n\}/, "export async function startYouTubeOAuthFlow(): Promise<{ ok: boolean; message: string }> { return YouTubeService.getInstance().startYouTubeOAuthFlow(); }\n"],
    [/export async function fetchYouTubeAnalyticsSummary\(\): Promise<any> \{[\s\S]*?\n\}/, "export async function fetchYouTubeAnalyticsSummary(): Promise<any> { return YouTubeService.getInstance().fetchYouTubeAnalyticsSummary(); }\n"],
    [/export async function _youtubeCommentReplyDraftBatch[\s\S]*?\n\}/, "export async function _youtubeCommentReplyDraftBatch(opts: any = {}): Promise<any> { return YouTubeService.getInstance().youtubeCommentReplyDraftBatch(opts); }\n"],

    // Panels
    [/export class CompanyDashboardPanel \{[\s\S]*?(?=export class ApiConnectionsPanel)/, ""],
    [/export class ApiConnectionsPanel \{[\s\S]*?(?=export class RevenueDashboardPanel)/, ""],
    [/export class RevenueDashboardPanel \{[\s\S]*?\n\}/, ""],
];

// Add imports
if (!code.includes('TrackerService')) {
    const importStr = `
import { TrackerService } from './services/tracker-service';
import { CompanyService } from './services/company-service';
import { YouTubeService } from './services/youtube-service';
import { CompanyDashboardPanel } from './ui/dashboard-panel';
import { RevenueDashboardPanel } from './ui/revenue-panel';
import { ApiConnectionsPanel } from './ui/connections-panel';
`;
    code = code.replace(/import \{.*?\} from '\.\/constants';/, match => match + importStr);
}

for (const [re, repl] of replacements) {
    code = code.replace(re, repl);
}

fs.writeFileSync(file, code);
console.log('Wrapper applied');
