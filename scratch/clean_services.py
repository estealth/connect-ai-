import fs
import re

file_path = 'src/extension.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define patterns to remove
patterns_to_remove = [
    # TrackerService logic
    r'export interface TrackerTask.*?export function getPriorityEmoji[^{]*\{.*?\}',
    r'export function readTracker.*?export function recordNudgeTime[^{]*\{.*?\}',
    r'function _getAutoRecurringTasks[^{]*\{.*?(?=async function checkAndRegenRecurringTasks)',
    r'async function checkAndRegenRecurringTasks.*?function listPendingApprovals',
    r'function createApproval.*?export async function resolveApproval[^{]*\{.*?\}',
    r'export function _approvalsPendingDir.*?export function _approvalsHistoryDir[^{]*\{.*?\}',

    # YouTubeService logic
    r'export function _readYtOAuthClient[^{]*\{.*?\}',
    r'function _readYtOAuthTokens.*?function _writeYtOAuthTokens[^{]*\{.*?\}',
    r'export function isYoutubeOAuthConnected[^{]*\{.*?\}',
    r'async function _ensureYtAccessToken[^{]*\{.*?\}',
    r'export async function startYouTubeOAuthFlow[^{]*\{.*?(?=export async function fetchYouTubeAnalyticsSummary)',
    r'export async function fetchYouTubeAnalyticsSummary[^{]*\{.*?\}',
    r'export async function _youtubeCommentReplyDraftBatch[^{]*\{.*?\}',

    # ConnectionService logic
    r'export interface ApiServiceDef.*?const API_SERVICES: ApiServiceDef\[\] = \[.*?\];',
    r'function readAllApiConnections[^{]*\{.*?\}',
    r'async function saveApiConnection[^{]*\{.*?\}',

    # CompanyService logic
    r'export function ensureCompanyStructure[^{]*\{.*?\}',
    r'export function readCompanyName[^{]*\{.*?\}',
    r'export function getCompanyMetrics.*?export function updateCompanyMetrics[^{]*\{.*?\}',
    r'export function getCompanyDay[^{]*\{.*?\}',
    r'export function isAgentHired.*?export function markAgentHired[^{]*\{.*?\}',
    r'export function isAgentActive.*?export function setAgentActive[^{]*\{.*?\}',
    r'export function readAgentModelMap.*?export function writeAgentModelMap[^{]*\{.*?\}',

    # NotificationService logic
    r'export interface ReportScheduleEntry.*?export function readReportSchedule.*?export function writeReportSchedule[^{]*\{.*?\}',
    r'function _parseBriefingTime.*?export async function _runDailyBriefingOnce[^{]*\{.*?\}',
    r'let _dailyBriefingTimer: NodeJS\.Timeout \| null = null;.*?function _startDailyBriefingLoop[^{]*\{.*?\}',

    # Panels
    r'export class CompanyDashboardPanel \{.*?(?=export class ApiConnectionsPanel)',
    r'export class ApiConnectionsPanel \{.*?(?=export class RevenueDashboardPanel)',
    r'export class RevenueDashboardPanel \{.*?(?=export function _readYtOAuthClient|export function isYoutubeOAuthConnected|export async function startYouTubeOAuthFlow|export async function fetchYouTubeAnalyticsSummary|export function _youtubeAnalyticsSummaryLine|export function _youtubeCommentReplyDraftBatch|$)'
]

for pat in patterns_to_remove:
    # re.DOTALL to match across newlines
    content = re.sub(pat, '', content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed extracted patterns from extension.ts")
