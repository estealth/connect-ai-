const fs = require('fs');

function fixSidebar() {
    let content = fs.readFileSync('src/ui/sidebar-chat.ts', 'utf-8');
    
    const newImports = `import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { 
    AGENTS, SPECIALIST_IDS, AGENT_ORDER 
} from '../agents';
import { 
    getConfig, _isLMStudioEngine
} from '../utils/config';
import { 
    _getBrainDir, _isBrainDirExplicitlySet, getCompanyDir 
} from '../paths';
import {
    gitExec, gitExecSafe, gitRun, validateGitRemoteUrl, isGitAvailable,
    classifyGitError, getRemoteDefaultBranch, ensureInitialCommit,
    ensureBrainGitignore, safeResolveInside, safeBasename
} from '../utils/git';
import { 
    _pythonCmd, _isPythonMissing, _pythonMissingHint, runCommandCaptured 
} from '../utils/python';
import { 
    _quickLLMCall 
} from '../llm/client';
import { 
    _classifyModel, _autoOrchestrateModelMap, listInstalledModels, getAgentModel
} from '../llm/models';
import { 
    estimateModelMemoryGB, getSystemSpecs 
} from '../system-specs';
import { 
    DEFAULT_CONTEXT_SLICE, MAX_CONTEXT_SIZE, MAX_STREAM_BUFFER, EXCLUDED_DIRS, GIT_OPERATION_TIMEOUT_MS
} from '../constants';
import { OfficePanel } from './office-panel';

// Imported from extension.ts
import {
    sendTelegramReport, sendTelegramLong, _pushTelegramHistory,
    _readYtOAuthClient, startYouTubeOAuthFlow, appendAgentMemory,
    promoteGroundedClaimsFromOutput, _harvestActionItems, addTrackerTask,
    getCompanyMetrics, updateCompanyMetrics, _personalizePrompt,
    readAgentSharedContext, autoMarkTrackerFromDispatch, rebuildUnifiedSchedule,
    readCompanyName, _safeGitAutoSync, _safeGitAutoSyncCompany,
    isAgentActive, _resolveFlexiblePath, _renderUnifiedDiff, _globMatch, _grepFiles,
    _revealInOsExplorer, _openInDefaultApp, _ensureBrainDir,
    buildKnowledgeGraph, buildWorldDeskPositions,
    _activeChatProvider, CONFER_PROMPT, CEO_REPORT_PROMPT,
    DECISIONS_EXTRACT_PROMPT, WORLD_LAYOUT, CUSTOM_MAP_DESKS,
    SYSTEM_PROMPT, setAutoSyncRunning,
    writeAgentGoal, writeAgentRagMode, writeAgentSelfRagCriteria,
    writeCompanyConfig, readCompanyConfig,
    setAgentActive, markAgentHired, _maybeRecommendCoderModel,
    routeBrainInjectionToAgents, buildSpecialistPrompt, buildAgentConfigStatus,
    makeSessionDir, readSecretaryBridgeMode, _isCasualChat, _extractFirstJsonObject,
    prefetchAgentRealtimeData, PendingApproval, BrainGraph, CompanyDashboardPanel,
    SECRETARY_TRIAGE_PROMPT, CEO_CHAT_PROMPT, CEO_PLANNER_PROMPT,
    _RENDER_GRAPH_HTML, _extCtx, isCompanyConfigured, ensureCompanyStructure,
    readAgentGoal, readAgentRagMode, readAgentSelfRagCriteria,
    countAgentVerifiedClaims, readTelegramConfig, listAgentTools,
    writeToolConfig, setToolEnabled, readAgentModelMap, writeAgentModelMap,
    readAgentSkills, appendConversationLog, _safeReadText,
    getConversationsDir, setCompanyDir, readHiredAgents, readActiveAgents,
    getCompanyDay, readRecentConversations, ALWAYS_ON_AGENTS, LOCKED_AGENTS_DEFAULT,
    _ytDashboardProvider, _autoSyncRunning
} from '../extension';
`;

    content = content.replace(/^[\s\S]*?(?=export class SidebarChatProvider)/, newImports + "\n\n");
    fs.writeFileSync('src/ui/sidebar-chat.ts', content, 'utf-8');
}

function fixOffice() {
    let content = fs.readFileSync('src/ui/office-panel.ts', 'utf-8');
    const newImports = `import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SidebarChatProvider } from './sidebar-chat';
import { _pythonCmd } from '../utils/python';
import { _loadWebviewAsset } from './templates';
import { getCompanyDir, _isBrainDirExplicitlySet } from '../paths';

// Imported from extension.ts
import { 
    _activeChatProvider, _extCtx, WORLD_LAYOUT, CUSTOM_MAP_DESKS,
    buildWorldDeskPositions, DeskPos, WorldZone, _safeReadText, getConversationsDir, 
    setCompanyDir, ensureCompanyStructure, readCompanyName,
    readHiredAgents, readActiveAgents, getCompanyDay
} from '../extension';

import { AGENTS, AGENT_ORDER } from '../agents';
`;
    content = content.replace(/^[\s\S]*?(?=export class RevenueDashboardPanel)/, newImports + "\n\n");
    fs.writeFileSync('src/ui/office-panel.ts', content, 'utf-8');
}

function fixDash() {
    let content = fs.readFileSync('src/ui/dashboard-providers.ts', 'utf-8');
    const newImports = `import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { _loadWebviewAsset } from './templates';
import { AGENTS } from '../agents';
import { getCompanyDir } from '../paths';

// Imported from extension.ts
import {
    resolveApproval, listPendingApprovals, _approvalsPendingDir,
    _youtubeCommentReplyDraftBatch, isYoutubeOAuthConnected,
    fetchYouTubeAnalyticsSummary, _safeReadText
} from '../extension';
`;
    content = content.replace(/^[\s\S]*?(?=export class ApprovalsPanelProvider)/, newImports + "\n\n");
    fs.writeFileSync('src/ui/dashboard-providers.ts', content, 'utf-8');
}

fixSidebar();
fixOffice();
fixDash();

console.log('Final import fix applied.');
