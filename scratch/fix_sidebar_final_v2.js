const fs = require('fs');

let content = fs.readFileSync('src/ui/sidebar-chat.ts', 'utf-8');

// Update imports
const newImports = `import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';
import { 
    AGENTS, SPECIALIST_IDS, AGENT_ORDER 
} from '../agents';
import { 
    getConfig, isCompanyConfigured, getCompanyDir, ensureCompanyStructure,
    readAgentGoal, readAgentRagMode, readAgentSelfRagCriteria, 
    countAgentVerifiedClaims, readTelegramConfig, listAgentTools, 
    writeToolConfig, setToolEnabled, readAgentModelMap, writeAgentModelMap,
    readAgentSkills, appendConversationLog, _safeReadText,
    getConversationsDir, setCompanyDir, readHiredAgents, readActiveAgents,
    getCompanyDay, readRecentConversations
} from '../utils/config';
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
} from '../utils/os';
import { 
    DEFAULT_CONTEXT_SLICE, MAX_CONTEXT_SIZE 
} from '../constants';

// Imported from extension.ts
import {
    sendTelegramReport, sendTelegramLong, _pushTelegramHistory,
    _readYtOAuthClient, startYouTubeOAuthFlow, appendAgentMemory,
    promoteGroundedClaimsFromOutput, _harvestActionItems, addTrackerTask,
    getCompanyMetrics, updateCompanyMetrics, _personalizePrompt,
    readAgentSharedContext, autoMarkTrackerFromDispatch, rebuildUnifiedSchedule,
    readCompanyName, _safeGitAutoSync, _safeGitAutoSyncCompany,
    isAgentActive, _getBrainDir, _resolveFlexiblePath,
    _renderUnifiedDiff, _globMatch, _grepFiles,
    _revealInOsExplorer, _openInDefaultApp, safeResolveInside,
    _isBrainDirExplicitlySet, _ensureBrainDir, validateGitRemoteUrl, gitExecSafe,
    buildKnowledgeGraph, buildWorldDeskPositions,
    _activeChatProvider, CONFER_PROMPT, CEO_REPORT_PROMPT,
    DECISIONS_EXTRACT_PROMPT, MAX_STREAM_BUFFER, EXCLUDED_DIRS,
    _autoSyncRunning, WORLD_LAYOUT, CUSTOM_MAP_DESKS,
    SYSTEM_PROMPT, setAutoSyncRunning,
    writeAgentGoal, writeAgentRagMode, writeAgentSelfRagCriteria,
    gitRun, gitExec, isGitAvailable, ensureBrainGitignore,
    ensureInitialCommit, getRemoteDefaultBranch, classifyGitError,
    writeCompanyConfig, readCompanyConfig,
    setAgentActive, markAgentHired, _maybeRecommendCoderModel,
    _isLMStudioEngine, safeBasename, routeBrainInjectionToAgents,
    buildSpecialistPrompt, buildAgentConfigStatus, makeSessionDir,
    readSecretaryBridgeMode, _isCasualChat, _extractFirstJsonObject,
    prefetchAgentRealtimeData,
    PendingApproval, BrainGraph, CompanyDashboardPanel,
    OfficePanel, SECRETARY_TRIAGE_PROMPT, CEO_CHAT_PROMPT, CEO_PLANNER_PROMPT,
    _RENDER_GRAPH_HTML, GIT_OPERATION_TIMEOUT_MS, _extCtx
} from '../extension';
`;

// Replace everything before the class
content = content.replace(/^[\s\S]*?(?=export class SidebarChatProvider)/, newImports + "\n\n");

// Fix _autoSyncRunning assignments
content = content.replace(/_autoSyncRunning\s*=\s*true/g, 'setAutoSyncRunning(true)');
content = content.replace(/_autoSyncRunning\s*=\s*false/g, 'setAutoSyncRunning(false)');

fs.writeFileSync('src/ui/sidebar-chat.ts', content, 'utf-8');
console.log('Updated sidebar-chat.ts imports and fixed assignments');
