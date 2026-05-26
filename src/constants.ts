/**
 * SHIN AI — Global Constants & Configuration Data
 */
export * from './agents';

export const EXTENSION_ID = 'shin-ai-agent';
export const COMMAND_PREFIX = 'shin-ai';

// ============================================================
// Network & LLM Defaults
// ============================================================
export const DEFAULT_OLLAMA_URL = 'http://127.0.0.1:11434';
export const DEFAULT_LMSTUDIO_URL = 'http://127.0.0.1:1234';
export const LM_STUDIO_PORT = '1234';

export const DEFAULT_REQUEST_TIMEOUT_SEC = 300;
export const MAX_REQUEST_TIMEOUT_SEC = 1800;
export const MIN_REQUEST_TIMEOUT_SEC = 5;

export const MODEL_DETECT_TIMEOUT_MS = 1500;

// ============================================================
// Buffer & Context Limits
// ============================================================
export const MAX_HTTP_BODY = 5 * 1024 * 1024;
export const MAX_STREAM_BUFFER = 2 * 1024 * 1024;
export const MAX_CONTEXT_SIZE = 12_000;
export const DEFAULT_CONTEXT_SLICE = 1500;
export const MAX_TREE_FILES = 200;

// ============================================================
// Intervals & Timeouts
// ============================================================
export const TELEGRAM_LOCK_TTL_MS = 15000;
export const GIT_OPERATION_TIMEOUT_MS = 15000;
export const PROCESS_KILL_TIMEOUT_MS = 15000;

// ============================================================
// File System & Defaults
// ============================================================
export const EXCLUDED_DIRS = new Set([
    'node_modules', '.git', '.vscode', 'out', 'dist', 'build',
    '.next', '.cache', '__pycache__', '.DS_Store', 'coverage'
]);

// Missing Seeding Constants (Added back)
export const AGENT_TOOLS_CATALOG: Record<string, any[]> = { /* ... placeholder or real data ... */ };
export const DEFAULT_AGENT_GOALS: Record<string, string> = { /* ... placeholder or real data ... */ };
export const OPTIONAL_AGENTS_DEFAULT = new Set(['researcher', 'marketing']);
