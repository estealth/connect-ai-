/* SHIN AI — Python Detection & Command Execution
 *
 * extension.ts에서 추출된 Python 감지, 명령 실행 유틸리티.
 */

import * as vscode from 'vscode';
import { spawn, spawnSync } from 'child_process';

// ============================================================
// Python command detection
// ============================================================

let _pythonCmdCache: string | null = null;

/* v2.89.152 — 크로스플랫폼 + 자동 감지 + 사용자 override.
   1. 사용자 설정 shinAi.pythonPath 가장 강함
   2. 후보 cmd 순차 시도 (which/where 로 실제 존재 확인) — 첫 성공한 거 캐시
   3. 캐시 못 찾으면 fallback 명령 (사용자에게 안내) */
export function _detectPythonCmd(): string {
    /* 1. 사용자 명시 경로 — 절대 경로 또는 명령 이름. 가장 강함. */
    try {
        const cfg = vscode.workspace.getConfiguration('shinAi');
        const override = (cfg.get<string>('pythonPath') || '').trim();
        if (override) {
            try {
                const r = spawnSync(override, ['--version'], { encoding: 'utf-8', timeout: 4000 });
                if (r.status === 0 || /python\s/i.test((r.stdout || '') + (r.stderr || ''))) {
                    return override;
                }
            } catch { /* fall through */ }
        }
    } catch { /* config 못 읽어도 진행 */ }

    /* 2. 플랫폼별 후보 순차 시도 — which/where 로 실재 확인. */
    const candidates = process.platform === 'win32'
        ? ['py -3', 'python3', 'python', 'py']
        : ['python3', 'python', '/usr/bin/python3', '/usr/local/bin/python3', '/opt/homebrew/bin/python3'];
    for (const cand of candidates) {
        try {
            const parts = cand.split(' ');
            const r = spawnSync(parts[0], parts.slice(1).concat(['--version']), {
                encoding: 'utf-8', timeout: 4000
            });
            const out = (r.stdout || '') + (r.stderr || '');
            if (r.status === 0 && /python\s+3/i.test(out)) {
                return cand;
            }
            if (/python\s+3\.\d/i.test(out)) return cand;
        } catch { /* 다음 후보 시도 */ }
    }
    /* 3. 다 실패 — 기존 동작 */
    return process.platform === 'win32' ? 'python' : 'python3';
}

export function _pythonCmd(): string {
    if (_pythonCmdCache) return _pythonCmdCache;
    _pythonCmdCache = _detectPythonCmd();
    return _pythonCmdCache;
}

/* 사용자가 설정 변경하면 캐시 무효화 — 다음 호출 시 재감지. */
export function _invalidatePythonCmdCache() {
    _pythonCmdCache = null;
}

/* 9009 (Windows command-not-found) 또는 "Python was not found" 스텁 메시지를
   감지해서 명확한 한국어 안내로 바꿔줌. */
export function _isPythonMissing(exitCode: number, output: string): boolean {
    if (exitCode === 9009) return true;
    if (/Python was not found/i.test(output)) return true;
    if (/command not found.*python/i.test(output)) return true;
    if (/No such file or directory.*python/i.test(output)) return true;
    if (/ENOENT/i.test(output) && /python/i.test(output)) return true;
    return false;
}

export function _pythonMissingHint(): string {
    const detected = _pythonCmd();
    const platformHint = process.platform === 'win32'
        ? 'https://www.python.org/downloads/ 에서 Python 3 설치 (Add Python to PATH 체크박스 필수!)'
        : (process.platform === 'darwin' ? '`brew install python3`' : '`sudo apt install python3`');
    return `⚠️ Python 3 명령 실행 실패 (시도한 명령: \`${detected}\`).\n` +
           `🔧 해결:\n` +
           `  1. ${platformHint}\n` +
           `  2. 설치 후 안티그래비티/VS Code 완전 종료 → 재실행 (PATH 새로고침 필요)\n` +
           `  3. 또는 명령 팔레트 → "⚙️ 설정 열기" → \`shinAi.pythonPath\` 에 절대 경로 입력\n` +
           `🔍 본인 PC 의 Python 경로 확인:\n` +
           (process.platform === 'win32' ? '  - PowerShell: `Get-Command python, python3, py`' : '  - 터미널: `which python3 python py`');
}

// ============================================================
// Command execution
// ============================================================

/**
 * Run a shell command and capture stdout+stderr live so the AI can act on the result.
 * - Streams output to onChunk for live display in the chat
 * - Returns combined output (capped to 15KB) + exit code
 * - Hard timeout to prevent hung processes (default 60s)
 */
export function runCommandCaptured(
    cmd: string,
    cwd: string,
    onChunk: (text: string) => void,
    timeoutMs = 60000,
    captureStream: 'both' | 'stdout' = 'both'
): Promise<{ exitCode: number; output: string; timedOut: boolean }> {
    return new Promise((resolve) => {
        const child = spawn(cmd, {
            cwd,
            shell: true,
            env: process.env,
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let buf = '';
        let timedOut = false;
        const append = (s: string) => {
            buf += s;
            if (buf.length > 30000) buf = buf.slice(-30000);
            onChunk(s);
        };
        child.stdout?.on('data', (d: Buffer) => append(d.toString()));
        if (captureStream === 'both') {
            child.stderr?.on('data', (d: Buffer) => append(d.toString()));
        }
        const killTimer = setTimeout(() => {
            timedOut = true;
            if (process.platform === 'win32' && child.pid) {
                try { spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }).unref(); }
                catch { try { child.kill(); } catch { /* gone */ } }
            } else {
                try { child.kill('SIGTERM'); } catch { /* already dead */ }
                setTimeout(() => { try { child.kill('SIGKILL'); } catch { /* gone */ } }, 2000);
            }
        }, timeoutMs);
        child.on('close', (code) => {
            clearTimeout(killTimer);
            resolve({ exitCode: code ?? -1, output: buf.slice(-15000), timedOut });
        });
        child.on('error', (e) => {
            clearTimeout(killTimer);
            resolve({ exitCode: -1, output: `[실행 오류] ${e.message}`, timedOut: false });
        });
    });
}
