const fs = require('fs');

// Fix dashboard-providers.ts
let dash = fs.readFileSync('src/ui/dashboard-providers.ts', 'utf-8');
const dashImports = `import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { _loadWebviewAsset } from './templates';
import { AGENTS } from '../agents';

// Imported from extension.ts
import {
    resolveApproval, listPendingApprovals, _approvalsPendingDir,
    _youtubeCommentReplyDraftBatch, isYoutubeOAuthConnected,
    fetchYouTubeAnalyticsSummary, getCompanyDir, _safeReadText
} from '../extension';
`;
dash = dash.replace(/^[\s\S]*?(?=export class ApprovalsPanelProvider)/, dashImports + "\n\n");
fs.writeFileSync('src/ui/dashboard-providers.ts', dash, 'utf-8');

// Fix office-panel.ts
let office = fs.readFileSync('src/ui/office-panel.ts', 'utf-8');
const officeImports = `import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SidebarChatProvider } from './sidebar-chat';
import { _pythonCmd } from '../utils/python';
import { _loadWebviewAsset } from './templates';

// Imported from extension.ts
import { 
    _activeChatProvider, _extCtx, WORLD_LAYOUT, CUSTOM_MAP_DESKS,
    buildWorldDeskPositions, DeskPos, WorldZone,
    _isBrainDirExplicitlySet,
    getCompanyDir, _safeReadText, getConversationsDir, 
    setCompanyDir, ensureCompanyStructure, readCompanyName,
    readHiredAgents, readActiveAgents, getCompanyDay
} from '../extension';

import { AGENTS, AGENT_ORDER } from '../agents';
`;
office = office.replace(/^[\s\S]*?(?=export class RevenueDashboardPanel)/, officeImports + "\n\n");
fs.writeFileSync('src/ui/office-panel.ts', office, 'utf-8');

console.log('Fixed dashboard-providers.ts and office-panel.ts imports');
