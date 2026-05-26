const fs = require('fs');

let content = fs.readFileSync('src/ui/sidebar-chat.ts', 'utf-8');

// Find the END of the class
const classEndPattern = /\n    }\r?\n}\r?\n/;
const match = content.match(classEndPattern);
if (!match) {
    console.error('Could not find class end pattern');
    process.exit(1);
}

const classEndIdx = match.index + match[0].length;
const classPart = content.slice(0, classEndIdx);

const dispatchLogic = `
/**
 * Dispatch tracking for duplicate prevention and status updates.
 */
export interface ActiveDispatch {
    promptKey: string;
    startedAt: number;
    step: string;
    heartbeatTimer: NodeJS.Timeout | null;
    heartbeatCount: number;
    fromTelegram: boolean;
}

const ACTIVE_DISPATCH_TTL_MS = 300000; // 5 mins
const _activeDispatches = new Map<string, ActiveDispatch>();

export function _normalizeForDispatchKey(s: string): string {
    return (s || '').toLowerCase().replace(/[\\s\\p{P}\\p{S}]+/gu, '').slice(0, 80);
}

export function _findActiveDispatch(prompt: string): ActiveDispatch | null {
    const now = Date.now();
    const key = _normalizeForDispatchKey(prompt);
    for (const [k, v] of _activeDispatches.entries()) {
        if (now - v.startedAt > ACTIVE_DISPATCH_TTL_MS) {
            if (v.heartbeatTimer) clearInterval(v.heartbeatTimer);
            _activeDispatches.delete(k);
        }
    }
    return _activeDispatches.get(key) || null;
}

export function _startActiveDispatch(prompt: string, fromTelegram: boolean): ActiveDispatch {
    const key = _normalizeForDispatchKey(prompt);
    const old = _activeDispatches.get(key);
    if (old?.heartbeatTimer) clearInterval(old.heartbeatTimer);
    const entry: ActiveDispatch = {
        promptKey: key,
        startedAt: Date.now(),
        step: '준비 중',
        heartbeatTimer: null,
        heartbeatCount: 0,
        fromTelegram,
    };
    _activeDispatches.set(key, entry);
    return entry;
}

export function _updateActiveDispatchStep(prompt: string, step: string) {
    const key = _normalizeForDispatchKey(prompt);
    const entry = _activeDispatches.get(key);
    if (entry) entry.step = step;
}

export function _endActiveDispatch(prompt: string) {
    const key = _normalizeForDispatchKey(prompt);
    const entry = _activeDispatches.get(key);
    if (entry?.heartbeatTimer) clearInterval(entry.heartbeatTimer);
    _activeDispatches.delete(key);
}
`;

fs.writeFileSync('src/ui/sidebar-chat.ts', classPart + dispatchLogic, 'utf-8');
console.log('Cleaned up sidebar-chat.ts and fixed dispatch logic exports');
