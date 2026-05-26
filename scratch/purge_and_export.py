import re
import os

def remove_function_bodies(content, func_names):
    for func in func_names:
        # Match function or class or const/let
        # We look for the start of the declaration
        patterns = [
            r'(?m)^(export\s+)?(async\s+)?function\s+' + re.escape(func) + r'\b',
            r'(?m)^(export\s+)?class\s+' + re.escape(func) + r'\b',
            r'(?m)^(export\s+)?(const|let)\s+' + re.escape(func) + r'\b'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, content)
            if not match: continue
            
            start_idx = match.start()
            # If it's a const/let, find the end of the statement (semicolon or newline)
            if 'const' in pattern or 'let' in pattern:
                end_idx = content.find(';', start_idx)
                if end_idx == -1: end_idx = content.find('\n', start_idx)
                if end_idx != -1:
                    content = content[:start_idx] + "// REMOVED " + func + content[end_idx+1:]
            else:
                # Find the first opening brace after the match
                brace_start = content.find('{', match.end())
                if brace_start == -1: continue
                
                # Count braces to find the end
                count = 1
                i = brace_start + 1
                while count > 0 and i < len(content):
                    if content[i] == '{': count += 1
                    elif content[i] == '}': count -= 1
                    i += 1
                
                if count == 0:
                    content = content[:start_idx] + "// REMOVED " + func + content[i:]
    return content

path = 'src/extension.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Wrappers at the end start here
wrapper_marker = '// Service Wrappers'
wrapper_idx = content.find(wrapper_marker)
if wrapper_idx != -1:
    pre_wrapper = content[:wrapper_idx]
    wrapper_section = content[wrapper_idx:]
else:
    pre_wrapper = content
    wrapper_section = ""

moved_members = [
    'readTracker', 'writeTracker', 'appendTrackerTask', 'updateTrackerTask',
    'recordNudgeTime', 'ensureCompanyStructure', 'readCompanyName',
    'getCompanyMetrics', 'updateCompanyMetrics', 'getCompanyDay',
    'isAgentHired', 'markAgentHired', 'isAgentActive', 'setAgentActive',
    'readAgentModelMap', 'writeAgentModelMap', 'readHiredAgents', 'readActiveAgents',
    'isYoutubeOAuthConnected', 'startYouTubeOAuthFlow', 'fetchYouTubeAnalyticsSummary',
    '_youtubeCommentReplyDraftBatch', 'resolveApproval', '_runDailyBriefingOnce',
    '_maybeRecommendCoderModel', 'addTrackerTask', 'setAutoSyncRunning',
    'CompanyDashboardPanel', 'ApiConnectionsPanel', 'RevenueDashboardPanel'
]

cleaned_content = remove_function_bodies(pre_wrapper, moved_members)

# Also fix the export order and duplicates in the remaining code
# Clean up "async export" or "export export"
cleaned_content = cleaned_content.replace('async export function', 'export async function')
cleaned_content = cleaned_content.replace('export export', 'export')

# Re-run a careful mass export for things that are NOT removed but needed
needed_exports = [
    '_migrateCompanyToBrain', '_approvalsPendingDir', '_getLastSpecialistOutput',
    'saveAgentSkill', 'scaffoldDeveloperProject', 'showBrainNetwork',
    'TaskTreeItem', 'runChangeCompanyDir', 'runConnectCompanyRepo',
    'runConnectGoogleCalendarWrite', 'TaskTreeProvider', 'CUSTOM_MAP_DESKS',
    'DeskPos', 'WorldZone', 'BrainGraph', 'SYSTEM_PROMPT',
    'sendTelegramReport', 'sendTelegramLong', '_pushTelegramHistory',
    '_readYtOAuthClient', 'appendAgentMemory', 'promoteGroundedClaimsFromOutput',
    '_harvestActionItems', '_personalizePrompt', 'readAgentSharedContext',
    'autoMarkTrackerFromDispatch', 'rebuildUnifiedSchedule', '_safeGitAutoSync',
    '_safeGitAutoSyncCompany', '_resolveFlexiblePath', '_renderUnifiedDiff',
    '_globMatch', '_grepFiles', '_revealInOsExplorer', '_openInDefaultApp',
    '_ensureBrainDir', 'buildKnowledgeGraph', 'buildWorldDeskPositions',
    '_activeChatProvider', 'CONFER_PROMPT', 'CEO_REPORT_PROMPT',
    'DECISIONS_EXTRACT_PROMPT', 'WORLD_LAYOUT', 'writeAgentGoal',
    'writeAgentRagMode', 'writeAgentSelfRagCriteria', 'writeCompanyConfig',
    'readCompanyConfig', 'routeBrainInjectionToAgents', 'buildSpecialistPrompt',
    'buildAgentConfigStatus', 'makeSessionDir', 'readSecretaryBridgeMode',
    '_isCasualChat', '_extractFirstJsonObject', 'prefetchAgentRealtimeData',
    'SECRETARY_TRIAGE_PROMPT', 'CEO_CHAT_PROMPT', 'CEO_PLANNER_PROMPT',
    '_RENDER_GRAPH_HTML', '_extCtx', 'isCompanyConfigured', 'readAgentGoal',
    'readAgentRagMode', 'readAgentSelfRagCriteria', 'countAgentVerifiedClaims',
    'readTelegramConfig', 'listAgentTools', 'writeToolConfig', 'setToolEnabled',
    'readAgentSkills', 'appendConversationLog', '_safeReadText',
    'getConversationsDir', 'setCompanyDir', 'readRecentConversations',
    '_ytDashboardProvider', '_autoSyncRunning', 'listPendingApprovals',
    '_updateActiveDispatchStep', '_migrateCompanyToSubdir', '_migrateYouTubeCredsToCanonical',
    '_autoOrchestrateModelMap', '_recoverEngineUrlIfMismatched', '_autoPickInstalledModelIfMissing',
    'startTelegramPolling', 'startTrackerNudgeLoop', 'startDailyBriefingLoop',
    'startRevenueWatcherLoop', 'startReportScheduler', 'startRecurrenceLoop',
    'startPreAlarmLoop'
]

for m in needed_exports:
    # Ensure it has export, but only at the start of the line to avoid matching usage
    cleaned_content = re.sub(r'(?m)^(function|const|let|class|interface|async\s+function)\s+' + re.escape(m) + r'\b', r'export \1 ' + m, cleaned_content)

# Final cleanup of double exports
cleaned_content = cleaned_content.replace('export export', 'export')
cleaned_content = cleaned_content.replace('export async export', 'export async')

with open(path, 'w', encoding='utf-8') as f:
    f.write(cleaned_content + wrapper_section)

print("Purge and export reconciliation complete.")
