import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let _dashboardExtensionUri: vscode.Uri | null = null;

/**
 * Initialize the template loader with the extension URI.
 * Must be called during extension activation.
 */
export function initTemplateLoader(uri: vscode.Uri) {
    _dashboardExtensionUri = uri;
}

/**
 * Webview 정적 자산 로더. CSS·JS 템플릿이 너무 커져서 파일 분리된 것을 로드합니다.
 */
export function _loadWebviewAsset(name: string): string {
    if (!_dashboardExtensionUri) return '';
    try {
        const p = path.join(_dashboardExtensionUri.fsPath, 'assets', 'webview', name);
        return fs.readFileSync(p, 'utf-8');
    } catch (e: any) {
        console.warn(`[SHIN AI] webview asset 로드 실패 ${name}:`, e?.message || e);
        return '';
    }
}
