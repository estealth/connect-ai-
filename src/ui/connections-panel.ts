import * as vscode from 'vscode';
import { ConnectionService, API_SERVICES } from '../services/connection-service';
import { _loadWebviewAsset } from '../utils/webview';

export class ApiConnectionsPanel {
    public static current: ApiConnectionsPanel | null = null;
    public static readonly viewType = 'shinAi.apiConnections';
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow() {
        const column = vscode.ViewColumn.Active;
        if (ApiConnectionsPanel.current) {
            ApiConnectionsPanel.current._panel.reveal(column);
            ApiConnectionsPanel.current.refresh();
            return;
        }
        const panel = vscode.window.createWebviewPanel(
            ApiConnectionsPanel.viewType,
            '🔌 외부 연결 (API 키)',
            column,
            { enableScripts: true, retainContextWhenHidden: true }
        );
        ApiConnectionsPanel.current = new ApiConnectionsPanel(panel);
    }

    public constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._panel.webview.html = this._html();
        this._panel.onDidDispose(() => this._dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (msg) => {
            const svc = ConnectionService.getInstance();
            try {
                if (msg?.type === 'load') {
                    this._post();
                } else if (msg?.type === 'save' && msg.serviceId && msg.values) {
                    const r = await svc.saveApiConnection(msg.serviceId, msg.values);
                    this._panel.webview.postMessage({ type: 'saved', serviceId: msg.serviceId, ok: r.ok, error: r.error, note: r.note });
                    this._post();
                } else if (msg?.type === 'wizard' && msg.command) {
                    vscode.commands.executeCommand(msg.command);
                } else if (msg?.type === 'openHelp' && msg.url) {
                    vscode.env.openExternal(vscode.Uri.parse(msg.url));
                }
            } catch (e: any) {
                this._panel.webview.postMessage({ type: 'saved', serviceId: msg?.serviceId, ok: false, error: e?.message || String(e) });
            }
        }, null, this._disposables);
        this._post();
    }

    public refresh() { this._post(); }

    private _post() {
        try {
            const svc = ConnectionService.getInstance();
            const values = svc.readAllApiConnections();
            this._panel.webview.postMessage({
                type: 'state',
                services: API_SERVICES.map(s => ({
                    id: s.id, name: s.name, icon: s.icon, summary: s.summary,
                    helpUrl: s.helpUrl || '',
                    wizardCommand: s.wizardCommand || '',
                    comingSoon: !!s.comingSoon,
                    fields: s.fields,
                    values: values[s.id] || {},
                })),
            });
        } catch { /* ignore */ }
    }

    private _dispose() {
        ApiConnectionsPanel.current = null;
        this._disposables.forEach(d => d.dispose());
    }

    private _html(): string {
        return `<!doctype html><html><head><meta charset="utf-8"><style>${_loadWebviewAsset('api-panel.css')}</style></head><body>
<header class="hero">
  <div class="hero-inner">
    <div class="hero-mark">🔌</div>
    <div>
      <div class="eyebrow">SHIN AI · 외부 연결</div>
      <h1>API 키 한 곳에서 관리</h1>
    </div>
  </div>
</header>
<main id="grid" class="grid"></main>
<script>${_loadWebviewAsset('api-panel.js')}</script>
</body></html>`;
    }
}
