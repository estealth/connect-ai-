const fs = require('fs');

const file = 'src/extension.ts';
let code = fs.readFileSync(file, 'utf-8');

const rangesToRemove = [
    // Tracker logic
    [/export interface TrackerTask[\s\S]*?export function getPriorityEmoji[^{]*\{[^}]*\}/g],
    [/export function readTracker[\s\S]*?export function recordNudgeTime[^{]*\{[^}]*\}/g],
    [/function _getAutoRecurringTasks[\s\S]*?(?=async function checkAndRegenRecurringTasks)/g],
    [/async function checkAndRegenRecurringTasks[\s\S]*?(?=function listPendingApprovals)/g],
    
    // Approval
    [/function createApproval[\s\S]*?export async function resolveApproval[^{]*\{[\s\S]*?\n\}/g],
    [/export function _approvalsPendingDir.*?export function _approvalsHistoryDir[^{]*\{[^}]*\}/g],

    // YouTube logic
    [/export function _readYtOAuthClient[^{]*\{[^}]*\}/g],
    [/function _readYtOAuthTokens[\s\S]*?function _writeYtOAuthTokens[^{]*\{[^}]*\}/g],
    [/export function isYoutubeOAuthConnected[^{]*\{[^}]*\}/g],
    [/async function _ensureYtAccessToken[^{]*\{[\s\S]*?\n\}/g],
    [/export async function startYouTubeOAuthFlow[^{]*\{[\s\S]*?(?=export async function fetchYouTubeAnalyticsSummary)/g],
    [/export async function fetchYouTubeAnalyticsSummary[^{]*\{[\s\S]*?\n\}/g],
    [/export async function _youtubeCommentReplyDraftBatch[^{]*\{[\s\S]*?\n\}/g],

    // Connections
    [/export interface ApiServiceDef[\s\S]*?const API_SERVICES: ApiServiceDef\[\] = \[[\s\S]*?\];/g],
    [/function readAllApiConnections[^{]*\{[\s\S]*?\n\}/g],
    [/async function saveApiConnection[^{]*\{[\s\S]*?\n\}/g],

    // Company/Agent State
    [/export function ensureCompanyStructure[^{]*\{[\s\S]*?\n\}/g],
    [/export function readCompanyName[^{]*\{[^}]*\}/g],
    [/export function getCompanyMetrics[\s\S]*?export function updateCompanyMetrics[^{]*\{[^}]*\}/g],
    [/export function getCompanyDay[^{]*\{[^}]*\}/g],
    [/export function isAgentHired[\s\S]*?export function markAgentHired[^{]*\{[^}]*\}/g],
    [/export function isAgentActive[\s\S]*?export function setAgentActive[^{]*\{[^}]*\}/g],
    [/export function readAgentModelMap[\s\S]*?export function writeAgentModelMap[^{]*\{[^}]*\}/g],

    // Notifications
    [/export interface ReportScheduleEntry[\s\S]*?export function readReportSchedule.*?export function writeReportSchedule[^{]*\{[^}]*\}/g],
    [/function _parseBriefingTime[\s\S]*?export async function _runDailyBriefingOnce[^{]*\{[\s\S]*?\n\}/g],
    [/let _dailyBriefingTimer: NodeJS\.Timeout \| null = null;[\s\S]*?function _startDailyBriefingLoop[^{]*\{[^}]*\}/g],

    // Panels
    [/export class CompanyDashboardPanel \{[\s\S]*?(?=export class ApiConnectionsPanel)/g],
    [/export class ApiConnectionsPanel \{[\s\S]*?(?=export class RevenueDashboardPanel)/g],
    [/export class RevenueDashboardPanel \{[\s\S]*?\n\}/g],
];

for (const [re] of rangesToRemove) {
    code = code.replace(re, '');
}

fs.writeFileSync(file, code);
console.log('Cleanup completed');
