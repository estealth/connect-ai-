
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
