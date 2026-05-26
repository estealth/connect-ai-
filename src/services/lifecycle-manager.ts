import * as vscode from 'vscode';
import * as fs from 'fs';
import { SidebarChatProvider } from '../ui/sidebar-chat';
import { BridgeManager } from './bridge-manager';
import { CommandManager } from './command-manager';
import { StatusBarManager } from './status-bar-manager';
import { 
    _migrateCompanyToBrain, 
    _migrateCompanyToSubdir, 
    _migrateYouTubeCredsToCanonical,
    isCompanyConfigured,
    ensureCompanyStructure,
    getCompanyMetrics,
    updateCompanyMetrics,
    _autoOrchestrateModelMap,
    _recoverEngineUrlIfMismatched,
    _autoPickInstalledModelIfMissing,
    startTelegramPolling,
    startTrackerNudgeLoop,
    startDailyBriefingLoop,
    startRevenueWatcherLoop,
    startReportScheduler,
    startRecurrenceLoop,
    startPreAlarmLoop,
    TaskTreeProvider
} from '../extension';
import { ApprovalsPanelProvider, YouTubeDashboardProvider } from '../ui/dashboard-providers';
import { readAgentModelMap, writeAgentModelMap, listInstalledModels } from '../llm/models';
import { _getBrainDir } from '../paths';

export class LifecycleManager {
    private bridgeManager?: BridgeManager;
    private commandManager?: CommandManager;
    private statusBarManager?: StatusBarManager;

    constructor(private context: vscode.ExtensionContext) {}

    public async activate() {
        this.runMigrations();
        await this.ensureStructure();
        
        const provider = new SidebarChatProvider(this.context.extensionUri, this.context);
        
        const taskTreeProvider = new TaskTreeProvider();
        const approvalsProvider = new ApprovalsPanelProvider();
        const youtubeProvider = new YouTubeDashboardProvider();

        this.context.subscriptions.push(
            vscode.window.registerTreeDataProvider('shinAi.tasks', taskTreeProvider),
            vscode.window.registerWebviewViewProvider(ApprovalsPanelProvider.viewId, approvalsProvider),
            vscode.window.registerWebviewViewProvider(YouTubeDashboardProvider.viewId, youtubeProvider)
        );

        this.bridgeManager = new BridgeManager(provider);
        this.commandManager = new CommandManager(this.context, provider, taskTreeProvider);
        this.statusBarManager = new StatusBarManager(this.context);

        this.bridgeManager.start();
        this.commandManager.registerAll();
        this.statusBarManager.init();

        this.startBackgroundLoops(provider);
        this.handleFirstRun();
        
        return provider;
    }

    private runMigrations() {
        _migrateCompanyToBrain();
        _migrateCompanyToSubdir();
        _migrateYouTubeCredsToCanonical();
        _recoverEngineUrlIfMismatched(this.context);
    }

    private async ensureStructure() {
        try {
            if (isCompanyConfigured()) ensureCompanyStructure();
            
            const m = getCompanyMetrics();
            if (!m.foundedAt) {
                updateCompanyMetrics({ foundedAt: new Date().toISOString().slice(0, 10) });
            }

            const existing = readAgentModelMap();
            if (Object.keys(existing).length === 0) {
                const installed = await listInstalledModels();
                const auto = _autoOrchestrateModelMap(installed);
                if (Object.keys(auto).length > 0) writeAgentModelMap(auto);
            }
            
            _autoPickInstalledModelIfMissing();
        } catch (e) {
            console.error('[LifecycleManager] ensureStructure failed:', e);
        }
    }

    private startBackgroundLoops(provider: SidebarChatProvider) {
        provider.startAutoCycle(15, 0);
        startTelegramPolling();
        startTrackerNudgeLoop();
        startDailyBriefingLoop();
        startRevenueWatcherLoop();
        startReportScheduler();
        startRecurrenceLoop();
        startPreAlarmLoop();
    }

    private handleFirstRun() {
        const isFirstRun = !this.context.globalState.get('setupComplete');
        if (isFirstRun) {
            // Setup wizard logic
        }
    }
}
