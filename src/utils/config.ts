/* SHIN AI — Configuration Utilities */
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
    if (!/^https?:\/\//i.test(ollamaBase)) ollamaBase = DEFAULT_OLLAMA_URL;
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
    const dir = path.join(__dirname, '..', 'assets', 'prompts');
    try { return fs.readFileSync(path.join(dir, file), 'utf-8'); } catch { return ''; }
}

export function _loadToolSeed(rel: string): string {
    const dir = path.join(__dirname, '..', 'assets', 'tool-seeds');
    try { return fs.readFileSync(path.join(dir, rel), 'utf-8'); } catch { return ''; }
}
