import re
import os

def absolute_final_fix():
    ext_path = 'src/extension.ts'
    task_tree_path = 'src/ui/task-tree.ts'
    
    with open(ext_path, 'r', encoding='utf-8') as f:
        ext_content = f.read()

    # 1. Create task-tree.ts
    # I'll extract it from the ext_content (look for the _OBSOLETE_ versions I made earlier)
    # Actually, I'll just write it from scratch with the known logic
    task_tree_content = """
import * as vscode from 'vscode';
import * as path from 'path';
import { readTracker } from '../extension';
import { TrackerTask, TaskPriority } from '../services/types';

export class TaskTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly task?: TrackerTask,
        public readonly isPriorityHeader?: boolean
    ) {
        super(label, collapsibleState);
    }
}

export class TaskTreeProvider implements vscode.TreeDataProvider<TaskTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<TaskTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TaskTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
        const tracker = readTracker();
        const tasks: TrackerTask[] = tracker.tasks || [];

        if (!element) {
            // Root: show priority groups
            return [
                new TaskTreeItem('🚨 Urgent', vscode.TreeItemCollapsibleState.Expanded, undefined, true),
                new TaskTreeItem('🔥 High', vscode.TreeItemCollapsibleState.Expanded, undefined, true),
                new TaskTreeItem('📅 Normal', vscode.TreeItemCollapsibleState.Collapsed, undefined, true),
                new TaskTreeItem('❄️ Low', vscode.TreeItemCollapsibleState.Collapsed, undefined, true),
            ];
        }

        if (element.isPriorityHeader) {
            const prio = element.label.split(' ')[1].toLowerCase() as TaskPriority;
            const filtered = tasks.filter(t => t.priority === prio && t.status !== 'done' && t.status !== 'cancelled');
            return filtered.map(t => {
                const item = new TaskTreeItem(t.title, vscode.TreeItemCollapsibleState.None, t);
                item.contextValue = 'taskItem';
                item.id = t.id;
                return item;
            });
        }

        return [];
    }
}
"""
    with open(task_tree_path, 'w', encoding='utf-8') as f:
        f.write(task_tree_content)

    # 2. Fix extension.ts
    # Restore _autoSyncRunning at the top
    if 'export let _autoSyncRunning = false;' not in ext_content:
        ext_content = ext_content.replace('import * as vscode', 'export let _autoSyncRunning = false;\nimport * as vscode', 1)
    
    # Remove the redundant one at the bottom if it exists
    ext_content = ext_content.replace('export { _autoSyncRunning };', '// re-exported')

    # Fix UI imports (they were already there but maybe confused)
    ext_content = ext_content.replace("from './ui/task-tree'", "from './ui/task-tree'")

    # Ensure all missing methods in office-panel.ts and sidebar-chat.ts are exported
    # I already did this in final_cleanup.py, but I'll make sure for _migrate...
    ext_content = ext_content.replace('function _migrateCompanyToBrain', 'export function _migrateCompanyToBrain')
    
    # Fix the return type of addTrackerTask in wrapper
    # It was: export function addTrackerTask(req: any): any { return TrackerService.getInstance().addTrackerTask(req); }
    # This is correct.

    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(ext_content)

    # 3. Fix visibility in UI (REALLY this time)
    ui_files = ['src/ui/dashboard-panel.ts', 'src/ui/connections-panel.ts', 'src/ui/revenue-panel.ts']
    for p in ui_files:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                c = f.read()
            # Use regex to find private constructor and private _panel
            c = re.sub(r'private\s+constructor', 'public constructor', c)
            c = re.sub(r'private\s+(_panel|_fetchAndPost)', r'public \1', c)
            with open(p, 'w', encoding='utf-8') as f:
                f.write(c)

    print("Absolute final fix completed.")

absolute_final_fix()
