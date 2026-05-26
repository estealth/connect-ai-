const fs = require('fs');
const path = require('path');

// I'll read extension.ts and extract functions related to config
const extContent = fs.readFileSync('src/extension.ts', 'utf-8');

function extractFunction(name) {
    const re = new RegExp(`(function\\s+${name}\\b[\\s\\S]*?\\n})`, 'm');
    const m = extContent.match(re);
    return m ? m[1] : null;
}

const configFunctions = [
    'getCompanyDir', 'setCompanyDir', 'isCompanyConfigured', 'readCompanyName',
    '_extractCompanyName', 'ensureCompanyStructure', 'getCompanyDay',
    'readHiredAgents', 'readActiveAgents', 'setAgentActive', 'markAgentHired',
    'readAgentGoal', 'writeAgentGoal', 'readAgentRagMode', 'writeAgentRagMode',
    'readAgentSelfRagCriteria', 'writeAgentSelfRagCriteria',
    'countAgentVerifiedClaims', 'readTelegramConfig', 'listAgentTools',
    'writeToolConfig', 'setToolEnabled', 'readAgentModelMap', 'writeAgentModelMap',
    'readAgentSkills', 'appendConversationLog', '_safeReadText',
    'getConversationsDir', 'readRecentConversations', 'readAgentSharedContext',
    'readSecretaryBridgeMode', 'isYoutubeOAuthConnected', '_isBrainDirExplicitlySet',
    '_ensureBrainDir', 'validateGitRemoteUrl'
];

let configUtils = `/* SHIN AI — Configuration Utilities */
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
    DEFAULT_OLLAMA_URL, DEFAULT_REQUEST_TIMEOUT_SEC, MAX_REQUEST_TIMEOUT_SEC,
    MIN_REQUEST_TIMEOUT_SEC, MAX_TREE_FILES, LM_STUDIO_PORT
} from '../constants';

export function getConfig() {
    const cfg = vscode.workspace.getConfiguration('shinAi');
    let ollamaBase = (cfg.get<string>('ollamaUrl', DEFAULT_OLLAMA_URL) || '').trim();
    if (!/^https?:\\/\\//i.test(ollamaBase)) ollamaBase = DEFAULT_OLLAMA_URL;
    const defaultModel = (cfg.get<string>('defaultModel', '') || '').trim();
    const rawTimeout = cfg.get<number>('requestTimeout', DEFAULT_REQUEST_TIMEOUT_SEC);
    const timeoutSec = (typeof rawTimeout === 'number' && isFinite(rawTimeout))
        ? Math.min(MAX_REQUEST_TIMEOUT_SEC, Math.max(MIN_REQUEST_TIMEOUT_SEC, rawTimeout))
        : DEFAULT_REQUEST_TIMEOUT_SEC;
    return {
        ollamaBase,
        defaultModel,
        maxTreeFiles: MAX_TREE_FILES,
        timeout: timeoutSec * 1000,
        localBrainPath: cfg.get<string>('localBrainPath', '') || ''
    };
}

export function _isLMStudioEngine(ollamaBase: string): boolean {
    return ollamaBase.includes(LM_STUDIO_PORT) || ollamaBase.includes('v1');
}

export function _loadPrompt(file: string): string {
    const dir = path.join(__dirname, '..', '..', 'assets', 'prompts');
    try { return fs.readFileSync(path.join(dir, file), 'utf-8'); } catch { return ''; }
}

export function _loadToolSeed(rel: string): string {
    const dir = path.join(__dirname, '..', '..', 'assets', 'tool-seeds');
    try { return fs.readFileSync(path.join(dir, rel), 'utf-8'); } catch { return ''; }
}
`;

configFunctions.forEach(fn => {
    let body = extractFunction(fn);
    if (body) {
        // Ensure it's exported
        if (!body.startsWith('export')) body = 'export ' + body;
        configUtils += '\n' + body + '\n';
    }
});

fs.writeFileSync('src/utils/config.ts', configUtils, 'utf-8');
console.log('Restored utils/config.ts with functions from extension.ts');
