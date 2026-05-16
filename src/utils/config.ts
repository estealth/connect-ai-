/* SHIN AI — Configuration Utilities
 *
 * extension.ts에서 추출된 설정 관리 및 프롬프트/도구 로딩 유틸리티.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// VS Code Configuration
// ============================================================

/** Read and validate the extension configuration from VS Code settings. */
export function getConfig() {
    const cfg = vscode.workspace.getConfiguration('connectAiLab');

    let ollamaBase = (cfg.get<string>('ollamaUrl', 'http://127.0.0.1:11434') || '').trim();
    if (!/^https?:\/\//i.test(ollamaBase)) ollamaBase = 'http://127.0.0.1:11434';

    const defaultModel = (cfg.get<string>('defaultModel', '') || '').trim();

    const rawTimeout = cfg.get<number>('requestTimeout', 300);
    const timeoutSec = (typeof rawTimeout === 'number' && isFinite(rawTimeout))
        ? Math.min(1800, Math.max(5, rawTimeout))
        : 300;

    return {
        ollamaBase,
        defaultModel,
        maxTreeFiles: 200,
        timeout: timeoutSec * 1000,
        localBrainPath: cfg.get<string>('localBrainPath', '') || ''
    };
}

// ============================================================
// Engine detection
// ============================================================

/* LM Studio가 포트나 경로 컨벤션을 바꾸면 한 곳만 고치면 됨. */
export function _isLMStudioEngine(ollamaBase: string): boolean {
    return ollamaBase.includes('1234') || ollamaBase.includes('v1');
}

// ============================================================
// Prompt & Tool Seed loading
// ============================================================

const _PROMPTS_DIR = path.join(__dirname, '..', 'assets', 'prompts');
const _promptCache = new Map<string, string>();

/** Load an LLM prompt template from assets/prompts/. Cached after first load. */
export function _loadPrompt(file: string): string {
    let cached = _promptCache.get(file);
    if (cached !== undefined) return cached;
    try {
        cached = fs.readFileSync(path.join(_PROMPTS_DIR, file), 'utf-8');
    } catch (e: any) {
        console.error(`[SHIN AI] prompt 로드 실패 ${file}:`, e?.message || e);
        cached = '';
    }
    _promptCache.set(file, cached);
    return cached;
}

const _TOOL_SEEDS_DIR = path.join(__dirname, '..', 'assets', 'tool-seeds');
const _toolSeedCache = new Map<string, string>();

/** Load a tool seed script/readme from assets/tool-seeds/<agent>/<tool>.{py,md}. Cached. */
export function _loadToolSeed(rel: string): string {
    let cached = _toolSeedCache.get(rel);
    if (cached !== undefined) return cached;
    try {
        cached = fs.readFileSync(path.join(_TOOL_SEEDS_DIR, rel), 'utf-8');
    } catch (e: any) {
        console.error(`[SHIN AI] tool-seed 로드 실패 ${rel}:`, e?.message || e);
        cached = '';
    }
    _toolSeedCache.set(rel, cached);
    return cached;
}

// ============================================================
// Constants
// ============================================================

export const MAX_HTTP_BODY = 5 * 1024 * 1024;      // 5MB cap on /api/* request bodies
export const MAX_STREAM_BUFFER = 2 * 1024 * 1024;  // 2MB cap on per-stream line buffer
export const MAX_CONTEXT_SIZE = 12_000;             // chars for context window

export const EXCLUDED_DIRS = new Set([
    'node_modules', '.git', '.vscode', 'out', 'dist', 'build',
    '.next', '.cache', '__pycache__', '.DS_Store', 'coverage',
    '.turbo', '.nuxt', '.output', 'vendor', 'target'
]);
