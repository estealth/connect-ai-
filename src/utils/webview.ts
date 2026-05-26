import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getExtensionContext } from '../core/context';

export function _loadWebviewAsset(name: string): string {
    const ctx = getExtensionContext();
    if (!ctx) return '';
    try {
        const p = path.join(ctx.extensionPath, 'assets', 'webview', name);
        if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
        return '';
    } catch { return ''; }
}
