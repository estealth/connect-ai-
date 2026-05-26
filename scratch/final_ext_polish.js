const fs = require('fs');

let content = fs.readFileSync('src/extension.ts', 'utf-8');

// Remove leftover XML tags/junk from previous deletions
content = content.replace(/<\/script>[\s\S]*?<\/body><\/html>/g, '');
content = content.replace(/\/\/ UI Class moved to src\/ui\/[\s\S]*?<\/script>/g, '');

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
    '_RENDER_GRAPH_HTML', 'SYSTEM_PROMPT', 'DeskPos', 'WorldZone',
    'isCompanyConfigured', 'getCompanyDir', 'ensureCompanyStructure',
    'readAgentGoal', 'readAgentRagMode', 'readAgentSelfRagCriteria',
    'countAgentVerifiedClaims', 'readTelegramConfig', 'listAgentTools',
    'writeToolConfig', 'setToolEnabled', 'readAgentModelMap', 'writeAgentModelMap',
    'readAgentSkills', 'appendConversationLog', '_safeReadText',
    'getConversationsDir', 'setCompanyDir', 'readHiredAgents', 'readActiveAgents',
    'getCompanyDay', 'readRecentConversations', '_ytDashboardProvider'
];

items.forEach(item => {
    // Be more careful: only replace at start of line (possibly with indentation)
    const re = new RegExp(`^(\\s*)(async\\s+)?(function|class|interface|const|let|var)\\s+${item}\\b`, 'm');
    content = content.replace(re, (match, indent, p2, p3) => {
        if (match.includes('export')) return match;
        return `${indent}export ${p2 || ''}${p3} ${item}`;
    });
});

fs.writeFileSync('src/extension.ts', content, 'utf-8');
console.log('Finalized extension.ts with exports and cleanup');
