/* SHIN AI — Git Utilities
 * 
 * extension.ts에서 추출된 Git 관련 유틸리티 함수들.
 * 파일 시스템 안전 헬퍼(safeResolveInside, safeBasename)도 포함.
 */

import * as path from 'path';
import { spawnSync } from 'child_process';

// ============================================================
// Git execution helpers
// ============================================================

/**
 * Run a git subcommand with argv form (no shell interpolation).
 * Returns stdout on success, throws on failure. Never blocks longer than `timeout`.
 */
export function gitExec(args: string[], cwd: string, timeout = 15000): string {
    const res = spawnSync('git', args, {
        cwd,
        encoding: 'utf-8',
        timeout,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } // never block on credential prompt
    });
    if (res.error) throw res.error;
    if (res.status !== 0) {
        const err: any = new Error(`git ${args[0]} failed: ${res.stderr?.trim() || 'unknown'}`);
        err.code = res.status;
        err.stderr = res.stderr;
        throw err;
    }
    return res.stdout || '';
}

/** Same as gitExec but swallows errors and returns null. */
export function gitExecSafe(args: string[], cwd: string, timeout = 15000): string | null {
    try { return gitExec(args, cwd, timeout); }
    catch { return null; }
}

/**
 * Lower-level git runner that returns status/stdout/stderr without throwing.
 */
export function gitRun(args: string[], cwd: string, timeout = 30000): { status: number | null; stdout: string; stderr: string; error?: Error } {
    const res = spawnSync('git', args, {
        cwd,
        encoding: 'utf-8',
        timeout,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });
    return {
        status: res.status,
        stdout: res.stdout || '',
        stderr: res.stderr || '',
        error: res.error
    };
}

// ============================================================
// Git validation & helpers
// ============================================================

/** Validate a git remote URL (HTTPS or SSH). Returns null if valid, error message if invalid. */
export function validateGitRemoteUrl(url: string): string | null {
    if (!url || typeof url !== 'string') return '빈 URL';
    const trimmed = url.trim();
    const httpsLike = /^https?:\/\/[A-Za-z0-9.-]+\/[A-Za-z0-9._\-/]+?$/;
    const sshLike = /^git@[A-Za-z0-9.-]+:[A-Za-z0-9._\-/]+?(\.git)?$/;
    if (httpsLike.test(trimmed) || sshLike.test(trimmed)) return null;
    return `유효하지 않은 git URL 형식: ${trimmed}`;
}

let _gitAvailable: boolean | null = null;

/** Detect whether `git` is on PATH. Cached after first call. */
export function isGitAvailable(): boolean {
    if (_gitAvailable !== null) return _gitAvailable;
    try {
        const r = spawnSync('git', ['--version'], { encoding: 'utf-8', timeout: 5000 });
        _gitAvailable = (r.status === 0);
    } catch {
        _gitAvailable = false;
    }
    return _gitAvailable;
}

export type GitErrorKind = 'auth' | 'network' | 'not_repo' | 'conflict' | 'unknown';

/** Translate raw git stderr into a user-actionable Korean message + machine-readable kind. */
export function classifyGitError(stderr: string): { kind: GitErrorKind; message: string } {
    const s = (stderr || '').toLowerCase();
    if (s.includes('authentication') || s.includes('could not read username') || s.includes('permission denied') || s.includes('403') || s.includes('invalid credentials'))
        return { kind: 'auth', message: '🔐 인증 실패 — GitHub 토큰/SSH 키를 확인하세요' };
    if (s.includes('could not resolve') || s.includes('unable to access') || s.includes('network') || s.includes('timed out') || s.includes('connection refused'))
        return { kind: 'network', message: '🌐 네트워크 오류 — 인터넷 연결을 확인하세요' };
    if (s.includes('not a git repository'))
        return { kind: 'not_repo', message: '📂 git 저장소가 아닙니다' };
    if (s.includes('conflict') || s.includes('merge'))
        return { kind: 'conflict', message: '⚠️ 병합 충돌이 발생했습니다' };
    return { kind: 'unknown', message: `git 오류: ${stderr.trim().slice(0, 200)}` };
}

/** Detect remote default branch ("main" / "master" / etc). Returns "main" as fallback. */
export function getRemoteDefaultBranch(cwd: string): string {
    try {
        const out = gitExec(['remote', 'show', 'origin'], cwd, 10000);
        const m = out.match(/ref:\s+refs\/heads\/([^\s]+)\s+HEAD/);
        if (m) return m[1];
    } catch { /* fall through */ }
    return 'main';
}

/** Ensure brain folder has at least one commit so `push` has something to ship. */
export function ensureInitialCommit(cwd: string) {
    const hasCommits = gitExecSafe(['log', '--oneline', '-1'], cwd);
    if (hasCommits) return;
    const placeholder = path.join(cwd, '.gitkeep');
    const fs = require('fs');
    if (!fs.existsSync(placeholder)) fs.writeFileSync(placeholder, '');
    gitExecSafe(['add', '.gitkeep'], cwd);
    gitExecSafe(['commit', '-m', 'init'], cwd);
}

/** Auto-create a sensible .gitignore in the brain folder so junk files don't pollute the remote. */
export function ensureBrainGitignore(brainDir: string) {
    const fs = require('fs');
    const gi = path.join(brainDir, '.gitignore');
    if (fs.existsSync(gi)) return;
    const lines = [
        '.DS_Store',
        'Thumbs.db',
        'node_modules/',
        '__pycache__/',
        '*.pyc',
        '.env',
        '*.log',
        'sessions/',
    ];
    fs.writeFileSync(gi, lines.join('\n') + '\n');
}

// ============================================================
// File-system safety helpers
// ============================================================

/**
 * Resolve `relPath` against `root` and confirm the result stays within `root`.
 * Returns absolute path on success, null if traversal is detected.
 */
export function safeResolveInside(root: string, relPath: string): string | null {
    if (typeof relPath !== 'string' || relPath.length === 0) return null;
    const resolvedRoot = path.resolve(root);
    const abs = path.resolve(resolvedRoot, relPath);
    const rel = path.relative(resolvedRoot, abs);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return abs;
}

const MAX_FILE_NAME_LEN = 200;

/** Sanitize a filename to be safe for the filesystem. */
export function safeBasename(name: string): string | null {
    if (typeof name !== 'string' || !name) return null;
    const base = path.basename(name).replace(/[\x00-\x1f\\/:*?"<>|]/g, '_').trim();
    if (!base || base.startsWith('.') || base.length > MAX_FILE_NAME_LEN) return null;
    return base;
}
