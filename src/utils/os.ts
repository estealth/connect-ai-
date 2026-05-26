import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, spawnSync } from 'child_process';
import axios from 'axios';

export const _CONNECT_AI_VERSION = '2.89.156';

export function _versionLessThan(a: string, b: string): boolean {
    const pa = a.split('.').map(n => parseInt(n, 10) || 0);
    const pb = b.split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const ai = pa[i] || 0, bi = pb[i] || 0;
        if (ai !== bi) return ai < bi;
    }
    return false;
}

export async function _probeExistingBridge(): Promise<{ ours: boolean; version: string; pid: number }> {
    try {
        const r = await axios.get('http://127.0.0.1:4825/ping', { timeout: 1500 });
        const d = r.data;
        if (d && d.app === 'connect-ai-bridge') {
            return { ours: true, version: String(d.version || ''), pid: Number(d.pid || 0) };
        }
    } catch { /* not running or different app */ }
    return { ours: false, version: '', pid: 0 };
}

export function _killProcessesOnPort(port: number): number[] {
    const ourPid = process.pid;
    const killed: number[] = [];
    try {
        if (process.platform === 'win32') {
            const r = spawnSync('netstat', ['-ano'], { encoding: 'utf-8', timeout: 5000 });
            const lines = (r.stdout || '').split(/\r?\n/);
            const pidSet = new Set<number>();
            for (const line of lines) {
                if (!/LISTENING/i.test(line)) continue;
                if (!new RegExp(`[:.]${port}\\b`).test(line)) continue;
                const m = line.trim().split(/\s+/);
                const pid = parseInt(m[m.length - 1], 10);
                if (!isNaN(pid) && pid > 0 && pid !== ourPid) pidSet.add(pid);
            }
            for (const pid of pidSet) {
                const k = spawnSync('taskkill', ['/F', '/PID', String(pid)], { encoding: 'utf-8', timeout: 3000 });
                if (k.status === 0) killed.push(pid);
            }
        } else {
            const r = spawnSync('lsof', ['-ti', `:${port}`], { encoding: 'utf-8', timeout: 5000 });
            const pids = (r.stdout || '').split(/\r?\n/).map(s => parseInt(s.trim(), 10)).filter(p => !isNaN(p) && p > 0 && p !== ourPid);
            for (const pid of pids) {
                const k = spawnSync('kill', ['-9', String(pid)], { encoding: 'utf-8', timeout: 3000 });
                if (k.status === 0) killed.push(pid);
            }
        }
    } catch (e) {
        console.error('[SHIN AI] _killProcessesOnPort 실패:', e);
    }
    return killed;
}

export function _revealInOsExplorer(targetPath: string): { ok: boolean; message: string } {
    try {
        if (!fs.existsSync(targetPath)) {
            return { ok: false, message: `존재하지 않는 경로: ${targetPath}` };
        }
        if (process.platform === 'darwin') {
            spawn('open', ['-R', targetPath], { detached: true, stdio: 'ignore' }).unref();
        } else if (process.platform === 'win32') {
            spawn('explorer.exe', ['/select,', targetPath], { detached: true, stdio: 'ignore' }).unref();
        } else {
            const dir = fs.statSync(targetPath).isDirectory() ? targetPath : path.dirname(targetPath);
            spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' }).unref();
        }
        return { ok: true, message: `🗂 익스플로러 열림: ${targetPath}` };
    } catch (e: any) {
        return { ok: false, message: `익스플로러 열기 실패: ${e?.message || e}` };
    }
}

export function _openInDefaultApp(targetPath: string): { ok: boolean; message: string } {
    try {
        if (!fs.existsSync(targetPath)) {
            return { ok: false, message: `존재하지 않는 경로: ${targetPath}` };
        }
        if (process.platform === 'darwin') {
            spawn('open', [targetPath], { detached: true, stdio: 'ignore' }).unref();
        } else if (process.platform === 'win32') {
            spawn('cmd.exe', ['/c', 'start', '', targetPath], { detached: true, stdio: 'ignore' }).unref();
        } else {
            spawn('xdg-open', [targetPath], { detached: true, stdio: 'ignore' }).unref();
        }
        return { ok: true, message: `🚀 기본 앱으로 열림: ${targetPath}` };
    } catch (e: any) {
        return { ok: false, message: `파일 열기 실패: ${e?.message || e}` };
    }
}
