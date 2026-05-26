import * as vscode from 'vscode';

let _extCtx: vscode.ExtensionContext | null = null;

export function setExtensionContext(context: vscode.ExtensionContext) {
    _extCtx = context;
}

export function getExtensionContext(): vscode.ExtensionContext {
    if (!_extCtx) {
        throw new Error('Extension context not initialized. Call setExtensionContext first.');
    }
    return _extCtx;
}
