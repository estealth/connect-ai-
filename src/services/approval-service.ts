import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getCompanyDir } from '../paths';
import { _safeReadText, _safeWriteText } from '../utils/file';

export interface PendingApproval {
    id: string;
    agentId: string;
    kind: string;
    title: string;
    summary: string;
    payload: any;
    createdAt: string;
}

export function _approvalsPendingDir() { return path.join(getCompanyDir(), 'approvals', 'pending'); }
export function _approvalsHistoryDir() { return path.join(getCompanyDir(), 'approvals', 'history'); }

export class ApprovalService {
    private static _instance: ApprovalService;

    private constructor() {}

    public static getInstance(): ApprovalService {
        if (!ApprovalService._instance) {
            ApprovalService._instance = new ApprovalService();
        }
        return ApprovalService._instance;
    }

    public createApproval(req: Omit<PendingApproval, 'id' | 'createdAt'>): PendingApproval {
        const dir = _approvalsPendingDir();
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const id = Math.random().toString(36).substring(2, 11);
        const ap: PendingApproval = { ...req, id, createdAt: new Date().toISOString() };
        const p = path.join(dir, `${id}.md`);
        const body = `---
agentId: ${ap.agentId}
kind: ${ap.kind}
title: ${ap.title}
createdAt: ${ap.createdAt}
---

${ap.summary}

---
\`\`\`json
${JSON.stringify(ap.payload, null, 2)}
\`\`\`
`;
        fs.writeFileSync(p, body, 'utf-8');
        return ap;
    }

    public listPendingApprovals(): PendingApproval[] {
        const dir = _approvalsPendingDir();
        if (!fs.existsSync(dir)) return [];
        try {
            return fs.readdirSync(dir).filter(f => f.endsWith('.md')).map(f => {
                const txt = _safeReadText(path.join(dir, f));
                const id = path.basename(f, '.md');
                const m = txt.match(/---([\s\S]+?)---/);
                const metadata: any = {};
                if (m) {
                    m[1].split('\n').forEach(line => {
                        const [k, ...v] = line.split(':');
                        if (k && v.length) metadata[k.trim()] = v.join(':').trim();
                    });
                }
                const payloadM = txt.match(/```json([\s\S]+?)```/);
                let payload = {};
                if (payloadM) {
                    try { payload = JSON.parse(payloadM[1]); } catch { /* ignore */ }
                }
                const summary = txt.replace(/---[\s\S]+?---/, '').replace(/```json[\s\S]+?```/, '').trim();
                return {
                    id,
                    agentId: metadata.agentId || 'unknown',
                    kind: metadata.kind || 'unknown',
                    title: metadata.title || 'No Title',
                    summary,
                    payload,
                    createdAt: metadata.createdAt || '',
                };
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch { return []; }
    }

    public async resolveApproval(id: string, decision: 'approved' | 'rejected', reason: string = ''): Promise<{ ok: boolean; message: string; ap?: PendingApproval }> {
        const pending = path.join(_approvalsPendingDir(), `${id}.md`);
        if (!fs.existsSync(pending)) return { ok: false, message: '작업을 찾을 수 없습니다.' };
        
        const aps = this.listPendingApprovals();
        const ap = aps.find(a => a.id === id);
        if (!ap) return { ok: false, message: '파싱 실패' };

        const historyDir = _approvalsHistoryDir();
        if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });
        const historyPath = path.join(historyDir, `${id}.md`);

        const txt = fs.readFileSync(pending, 'utf-8');
        const resolved = txt + `\n\n--- RESOLVED ---\ndecision: ${decision}\nresolvedAt: ${new Date().toISOString()}\nreason: ${reason}\n`;
        fs.writeFileSync(historyPath, resolved, 'utf-8');
        fs.unlinkSync(pending);

        return { ok: true, message: decision === 'approved' ? '승인되었습니다.' : '반려되었습니다.', ap };
    }
}
