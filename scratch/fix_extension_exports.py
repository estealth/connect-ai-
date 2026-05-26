import re
import os

file_path = 'src/extension.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

members = [
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
    '_updateActiveDispatchStep'
]

for m in members:
    # Match function, const, let, class, interface
    pattern = r'(?<!export\s)\b(function|const|let|class|interface|async\s+function)\s+' + re.escape(m) + r'\b'
    content = re.sub(pattern, r'export \1 ' + m, content)

# Special case for setAutoSyncRunning which might be missing
if 'export function setAutoSyncRunning' not in content:
    content += '\nexport function setAutoSyncRunning(v: boolean) { _autoSyncRunning = v; }\n'

# Cleanup duplicate exports if any
content = content.replace('export export', 'export')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished adding exports to extension.ts")
