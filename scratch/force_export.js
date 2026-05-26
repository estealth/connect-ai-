const fs = require('fs');

let content = fs.readFileSync('src/extension.ts', 'utf-8');

const items = [
    'sendTelegramReport', 'sendTelegramLong', '_pushTelegramHistory',
    '_readYtOAuthClient', 'startYouTubeOAuthFlow', 'appendAgentMemory',
    'promoteGroundedClaimsFromOutput', '_harvestActionItems', 'addTrackerTask',
    'getCompanyMetrics', 'updateCompanyMetrics', '_personalizePrompt',
    'readAgentSharedContext', 'autoMarkTrackerFromDispatch', 'rebuildUnifiedSchedule',
    'readCompanyName', '_safeGitAutoSync', '_safeGitAutoSyncCompany',
    'isAgentActive', '_getBrainDir', '_resolveFlexiblePath',
    '_renderUnifiedDiff', '_globMatch', '_grepFiles',
    '_revealInOsExplorer', '_openInDefaultApp', 'safeResolveInside',
    'getConversationsDir', 'setCompanyDir', 'readHiredAgents',
    'readActiveAgents', 'getCompanyDay', '_isBrainDirExplicitlySet',
    '_ensureBrainDir', 'validateGitRemoteUrl', 'gitExecSafe',
    'buildKnowledgeGraph', 'buildWorldDeskPositions',
    'resolveApproval', 'listPendingApprovals', '_approvalsPendingDir',
    '_youtubeCommentReplyDraftBatch', 'isYoutubeOAuthConnected',
    'fetchYouTubeAnalyticsSummary',
    'writeAgentGoal', 'writeAgentRagMode', 'writeAgentSelfRagCriteria',
    'gitRun', 'gitExec', 'isGitAvailable', 'ensureBrainGitignore',
    'ensureInitialCommit', 'getRemoteDefaultBranch', 'classifyGitError',
    'writeCompanyConfig', 'readCompanyConfig',
    'setAgentActive', 'markAgentHired', '_maybeRecommendCoderModel',
    '_isLMStudioEngine', 'safeBasename', 'routeBrainInjectionToAgents',
    'buildSpecialistPrompt', 'buildAgentConfigStatus', 'makeSessionDir',
    'readSecretaryBridgeMode', '_isCasualChat', '_extractFirstJsonObject',
    'prefetchAgentRealtimeData', 'setAutoSyncRunning',
    'PendingApproval', 'BrainGraph', 'CompanyDashboardPanel',
    '_activeChatProvider', 'CONFER_PROMPT', 'CEO_REPORT_PROMPT',
    'DECISIONS_EXTRACT_PROMPT', 'MAX_STREAM_BUFFER', 'EXCLUDED_DIRS',
    '_autoSyncRunning', 'WORLD_LAYOUT', 'CUSTOM_MAP_DESKS',
    'ALWAYS_ON_AGENTS', 'LOCKED_AGENTS_DEFAULT', 'GIT_OPERATION_TIMEOUT_MS',
    'SECRETARY_TRIAGE_PROMPT', 'CEO_CHAT_PROMPT', 'CEO_PLANNER_PROMPT',
    '_RENDER_GRAPH_HTML', 'SYSTEM_PROMPT', 'DeskPos', 'WorldZone'
];

items.forEach(item => {
    // Match function, class, interface, const, let, var at start of line
    const re = new RegExp(`^((async\\s+)?(function|class|interface|const|let|var)\\s+${item}\\b)`, 'm');
    content = content.replace(re, (match, p1) => {
        if (p1.startsWith('export')) return p1;
        return 'export ' + p1;
    });
});

fs.writeFileSync('src/extension.ts', content, 'utf-8');
console.log('Force exported items in extension.ts');
