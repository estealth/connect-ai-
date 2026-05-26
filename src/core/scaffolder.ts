import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getCompanyDir } from '../paths';
import { _safeReadText, _safeWriteText } from '../utils/file';
import { AGENTS, AGENT_TOOLS_CATALOG, DEFAULT_AGENT_GOALS } from '../constants';

export class Scaffolder {
    private static loadToolSeed(rel: string): string {
        const dir = path.join(__dirname, '..', '..', 'assets', 'tool-seeds');
        try { return fs.readFileSync(path.join(dir, rel), 'utf-8'); } catch { return ''; }
    }

    private static mergeSchemaIntoJson(json: string, schema: any): string {
        try {
            const data = JSON.parse(json);
            const merged = { ...data, ...schema };
            return JSON.stringify(merged, null, 2);
        } catch { return json; }
    }

    public static seedAgentGoalIfMissing(agentId: string) {
        try {
            const p = path.join(getCompanyDir(), '_agents', agentId, 'goal.md');
            if (fs.existsSync(p)) return;
            const dir = path.dirname(p);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const seed = DEFAULT_AGENT_GOALS[agentId] || '';
            fs.writeFileSync(p, seed);
        } catch { /* ignore */ }
    }

    public static seedAgentToolsIfMissing(agentId: string) {
        // Implementation for agent tools setup
        const toolsDir = path.join(getCompanyDir(), '_agents', agentId, 'tools');
        if (!fs.existsSync(toolsDir)) fs.mkdirSync(toolsDir, { recursive: true });
        // Specific tool seeds would go here...
    }

    public static seedBundledTemplates() {
        // Implementation for template seeding
    }

    public static seedFile(targetPath: string, content: string, force = false) {
        try {
            if (!force && fs.existsSync(targetPath)) return;
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(targetPath, content.trim() + '\n', 'utf-8');
        } catch { /* ignore */ }
    }
}