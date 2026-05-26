import * as vscode from 'vscode';
import { listPendingApprovals } from '../extension'; // Move later

export class StatusBarManager {
    private dashStatusBar: vscode.StatusBarItem;
    private aprStatusBar: vscode.StatusBarItem;
    private intervalId: NodeJS.Timeout | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.dashStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.aprStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    }

    public init() {
        this.dashStatusBar.text = '$(organization) 우리 회사';
        this.dashStatusBar.tooltip = '우리 회사 — 에이전트 팀 + 오늘의 일 한 눈에';
        this.dashStatusBar.command = 'shinAi.dashboard.open';
        this.dashStatusBar.show();
        this.context.subscriptions.push(this.dashStatusBar);

        this.aprStatusBar.command = 'shinAi.dashboard.open';
        this.aprStatusBar.tooltip = '승인 대기 액션이 있어요 — 클릭해서 처리';
        this.context.subscriptions.push(this.aprStatusBar);

        this.refreshAprBadge();
        this.intervalId = setInterval(() => this.refreshAprBadge(), 8000);
    }

    public refreshAprBadge() {
        try {
            const n = listPendingApprovals().length;
            if (n > 0) {
                this.aprStatusBar.text = `$(warning) 승인 ${n}건`;
                this.aprStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                this.aprStatusBar.show();
            } else {
                this.aprStatusBar.hide();
            }
        } catch { /* ignore */ }
    }

    public dispose() {
        if (this.intervalId) clearInterval(this.intervalId);
    }
}
