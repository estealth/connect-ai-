import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getCompanyDir } from '../paths';
import { _safeReadText, _safeWriteText } from '../utils/file';
import { AGENTS, AGENT_ORDER } from '../agents';

export class CompanyService {
    private static _instance: CompanyService;

    private constructor() {}

    public static getInstance(): CompanyService {
        if (!CompanyService._instance) {
            CompanyService._instance = new CompanyService();
        }
        return CompanyService._instance;
    }

    public readCompanyName(): string {
        const p = path.join(getCompanyDir(), 'config.md');
        const txt = _safeReadText(p);
        const m = txt.match(/^COMPANY_NAME\s*[:：=]\s*([^\r\n]+)/m);
        return m ? m[1].trim() : '';
    }

    public getCompanyMetrics(): { tasksCompleted: number, knowledgeInjected: number, lastSessionDate: string, foundedAt?: string } {
        const p = path.join(getCompanyDir(), 'metrics.json');
        const txt = _safeReadText(p);
        try {
            const d = JSON.parse(txt || '{}');
            return {
                tasksCompleted: Number(d.tasksCompleted || 0),
                knowledgeInjected: Number(d.knowledgeInjected || 0),
                lastSessionDate: String(d.lastSessionDate || ''),
                foundedAt: d.foundedAt,
            };
        } catch { return { tasksCompleted: 0, knowledgeInjected: 0, lastSessionDate: '' }; }
    }

    public updateCompanyMetrics(updates: any) {
        const p = path.join(getCompanyDir(), 'metrics.json');
        const cur = this.getCompanyMetrics();
        _safeWriteText(p, JSON.stringify({ ...cur, ...updates }, null, 2));
    }

    public getCompanyDay(): number {
        const m = this.getCompanyMetrics();
        if (!m.foundedAt) return 1;
        const start = new Date(m.foundedAt).getTime();
        const now = Date.now();
        return Math.max(1, Math.floor((now - start) / 86400000) + 1);
    }

    public ensureCompanyStructure(): string {
        const dir = getCompanyDir();
        fs.mkdirSync(path.join(dir, '_shared'), { recursive: true });
        fs.mkdirSync(path.join(dir, '_agents'), { recursive: true });
        fs.mkdirSync(path.join(dir, 'sessions'), { recursive: true });
        fs.mkdirSync(path.join(dir, 'approvals', 'pending'), { recursive: true });
        fs.mkdirSync(path.join(dir, 'approvals', 'history'), { recursive: true });
        
        AGENT_ORDER.forEach(id => {
            const agentDir = path.join(dir, '_agents', id);
            fs.mkdirSync(agentDir, { recursive: true });
            const memPath = path.join(agentDir, 'memory.md');
            if (!fs.existsSync(memPath)) {
                fs.writeFileSync(memPath, `# ${AGENTS[id].emoji} ${AGENTS[id].name} 개인 메모리\n\n## 학습 기록\n`);
            }
            const skillsDir = path.join(agentDir, 'skills');
            fs.mkdirSync(skillsDir, { recursive: true });
            const promptPath = path.join(agentDir, 'prompt.md');
            if (!fs.existsSync(promptPath)) {
                fs.writeFileSync(promptPath, `# ${AGENTS[id].emoji} ${AGENTS[id].name} 페르소나 디테일\n\n`);
            }
        });
        return dir;
    }

    public isAgentHired(agentId: string): boolean {
        const p = path.join(getCompanyDir(), '_agents', agentId, 'hired.json');
        if (!fs.existsSync(p)) return false; 
        try { return JSON.parse(fs.readFileSync(p, 'utf-8')).hired === true; } catch { return false; }
    }

    public markAgentHired(agentId: string, hired: boolean) {
        const p = path.join(getCompanyDir(), '_agents', agentId, 'hired.json');
        _safeWriteText(p, JSON.stringify({ hired, updatedAt: new Date().toISOString() }, null, 2));
    }

    public isAgentActive(agentId: string): boolean {
        const p = path.join(getCompanyDir(), '_agents', agentId, 'active.json');
        if (!fs.existsSync(p)) return true; 
        try { return JSON.parse(fs.readFileSync(p, 'utf-8')).active !== false; } catch { return true; }
    }

    public setAgentActive(agentId: string, active: boolean) {
        const p = path.join(getCompanyDir(), '_agents', agentId, 'active.json');
        _safeWriteText(p, JSON.stringify({ active, updatedAt: new Date().toISOString() }, null, 2));
    }

    public readAgentModelMap(): Record<string, string> {
        const p = path.join(getCompanyDir(), '_shared', 'agent_model_map.json');
        try { return JSON.parse(_safeReadText(p) || '{}'); } catch { return {}; }
    }

    public writeAgentModelMap(map: Record<string, string>) {
        const p = path.join(getCompanyDir(), '_shared', 'agent_model_map.json');
        _safeWriteText(p, JSON.stringify(map, null, 2));
    }

    public readHiredAgents(): Record<string, any> {
        try {
            const p = path.join(getCompanyDir(), '_shared', 'hired.json');
            if (!fs.existsSync(p)) return {};
            return JSON.parse(fs.readFileSync(p, 'utf-8') || '{}');
        } catch { return {}; }
    }

    public readActiveAgents(): Record<string, any> {
        try {
            const p = path.join(getCompanyDir(), '_shared', 'active.json');
            if (!fs.existsSync(p)) return {};
            return JSON.parse(fs.readFileSync(p, 'utf-8') || '{}');
        } catch { return {}; }
    }
}
