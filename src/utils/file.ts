import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import axios from 'axios';

const _SYSTEM_PATH_BLOCKLIST = [
    '/etc', '/System', '/usr/bin', '/usr/sbin', '/bin', '/sbin', '/var/db',
    '/private/etc', '/private/var/db',
];

export function _resolveFlexiblePath(input: string, root: string): { abs: string; reason?: string } | null {
    if (typeof input !== 'string') return null;
    let s = input.trim();
    if (!s) return null;
    
    s = s.replace(/\$\{?(HOME|USER|USERNAME|TMPDIR|TEMP|TMP|APPDATA|LOCALAPPDATA|USERPROFILE|HOMEDRIVE|HOMEPATH)\}?/g, (_m, k) => {
        if (k === 'HOME') return process.env.HOME || os.homedir();
        if (k === 'USER' || k === 'USERNAME') return process.env.USER || process.env.USERNAME || os.userInfo().username || _m;
        if (k === 'TMPDIR' || k === 'TEMP' || k === 'TMP') return process.env.TMPDIR || process.env.TEMP || process.env.TMP || os.tmpdir();
        const v = process.env[k]; return v || _m;
    });
    
    if (s === '~') s = os.homedir();
    else if (s.startsWith('~/') || s.startsWith('~\\')) s = path.join(os.homedir(), s.slice(2));
    
    let abs = path.isAbsolute(s) ? path.resolve(s) : path.resolve(root, s);
    abs = path.normalize(abs);
    
    for (const blocked of _SYSTEM_PATH_BLOCKLIST) {
        if (abs === blocked || abs.startsWith(blocked + path.sep)) {
            return { abs, reason: `시스템 보호 경로(${blocked})에는 쓰지 않습니다. 사용자 홈/워크스페이스 안의 경로를 지정해주세요.` };
        }
    }
    
    if (process.platform === 'win32') {
        const upper = abs.toUpperCase();
        const winDirs = [
            (process.env.WINDIR || 'C:\\WINDOWS').toUpperCase(),
            (process.env.PROGRAMFILES || 'C:\\PROGRAM FILES').toUpperCase(),
            (process.env['PROGRAMFILES(X86)'] || 'C:\\PROGRAM FILES (X86)').toUpperCase(),
            (process.env.PROGRAMDATA || 'C:\\PROGRAMDATA').toUpperCase(),
            (process.env.SYSTEMROOT || 'C:\\WINDOWS').toUpperCase(),
        ];
        for (const w of winDirs) {
            if (upper === w || upper.startsWith(w + path.sep)) {
                return { abs, reason: `시스템 보호 경로(${w})에는 쓰지 않습니다. Documents·Desktop·다른 사용자 폴더로 지정해주세요.` };
            }
        }
    }
    return { abs };
}

export function _safeReadText(p: string): string {
    try {
        if (!fs.existsSync(p)) return '';
        return fs.readFileSync(p, 'utf-8');
    } catch { return ''; }
}

export function _safeWriteText(p: string, text: string) {
    try {
        const dir = path.dirname(p);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(p, text, 'utf-8');
    } catch (e) {
        console.error(`[_safeWriteText] failed for ${p}:`, e);
    }
}

export function _globToRegex(pattern: string): RegExp {
    let re = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    re = re.replace(/\*\*\//g, '__GLOBSTAR_SLASH__');
    re = re.replace(/\*\*/g, '__GLOBSTAR__');
    re = re.replace(/\*/g, '[^/]*');
    re = re.replace(/\?/g, '[^/]');
    re = re.replace(/__GLOBSTAR_SLASH__/g, '(?:.*/)?');
    re = re.replace(/__GLOBSTAR__/g, '.*');
    return new RegExp('^' + re + '$', 'i');
}

export function _renderUnifiedDiff(filename: string, oldStr: string, newStr: string, ctx: number = 3): string {
    const diff = require('diff');
    const d = diff.createTwoFilesPatch(filename, filename, oldStr, newStr, '', '', { context: ctx });
    return d;
}

export function _globMatch(pattern: string, root: string, maxResults: number = 200): string[] {
    const re = _globToRegex(pattern);
    const results: string[] = [];
    const skipDirs = new Set(['node_modules', '.git', '.next', 'dist', 'out', 'build', '.cache', '__pycache__', '.venv', 'venv', '.idea', '.vscode']);
    function walk(dir: string, depth: number) {
        if (results.length >= maxResults || depth > 12) return;
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
            if (results.length >= maxResults) return;
            if (e.name.startsWith('.git')) continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                if (skipDirs.has(e.name)) continue;
                walk(full, depth + 1);
            } else if (e.isFile()) {
                const rel = path.relative(root, full).split(path.sep).join('/');
                if (re.test(rel)) results.push(rel);
            }
        }
    }
    walk(root, 0);
    return results;
}

export function _grepFiles(pattern: string, root: string, fileGlob?: string): { file: string; matches: { line: number; text: string }[] }[] {
    let regex: RegExp;
    try { regex = new RegExp(pattern, 'i'); }
    catch { return []; }
    const fileRe = fileGlob ? _globToRegex(fileGlob) : null;
    const results: { file: string; matches: { line: number; text: string }[] }[] = [];
    const skipDirs = new Set(['node_modules', '.git', '.next', 'dist', 'out', 'build', '.cache', '__pycache__', '.venv', 'venv', '.idea', '.vscode']);
    const MAX_FILES = 50;
    const MAX_PER_FILE = 10;
    const MAX_FILE_BYTES = 1024 * 1024;
    function walk(dir: string, depth: number) {
        if (results.length >= MAX_FILES || depth > 12) return;
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
            if (results.length >= MAX_FILES) return;
            if (e.name.startsWith('.git')) continue;
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                if (skipDirs.has(e.name)) continue;
                walk(full, depth + 1);
            } else if (e.isFile()) {
                const rel = path.relative(root, full).split(path.sep).join('/');
                if (fileRe && !fileRe.test(rel)) continue;
                try {
                    const stat = fs.statSync(full);
                    if (stat.size > MAX_FILE_BYTES) continue;
                    const buf = fs.readFileSync(full);
                    if (buf.slice(0, 512).includes(0)) continue;
                    const content = buf.toString('utf-8');
                    const lines = content.split('\n');
                    const matches: { line: number; text: string }[] = [];
                    for (let i = 0; i < lines.length; i++) {
                        if (regex.test(lines[i])) {
                            matches.push({ line: i + 1, text: lines[i].slice(0, 200) });
                            if (matches.length >= MAX_PER_FILE) break;
                        }
                    }
                    if (matches.length > 0) results.push({ file: rel, matches });
                } catch { /* skip */ }
            }
        }
    }
    walk(root, 0);
    return results;
}

export function _revealInOsExplorer(targetPath: string): { ok: boolean; message: string } {
    try {
        if (!fs.existsSync(targetPath)) return { ok: false, message: '파일이 존재하지 않습니다.' };
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(targetPath));
        return { ok: true, message: '탐색기에서 열었습니다.' };
    } catch (e: any) {
        return { ok: false, message: e?.message || String(e) };
    }
}

export function _openInDefaultApp(targetPath: string): { ok: boolean; message: string } {
    try {
        if (!fs.existsSync(targetPath)) return { ok: false, message: '파일이 존재하지 않습니다.' };
        const cmd = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
        const { spawn } = require('child_process');
        spawn(cmd, [targetPath], { shell: true });
        return { ok: true, message: '기본 앱으로 열었습니다.' };
    } catch (e: any) {
        return { ok: false, message: e?.message || String(e) };
    }
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
