import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getConversationsDir } from '../paths';
import { _safeReadText, _safeWriteText } from '../utils/file';

export class ConversationService {
    private static _instance: ConversationService;

    private constructor() {}

    public static getInstance(): ConversationService {
        if (!ConversationService._instance) {
            ConversationService._instance = new ConversationService();
        }
        return ConversationService._instance;
    }

    public appendConversationLog(entry: { speaker: string; emoji?: string; section?: string; body: string }) {
        try {
            const dir = getConversationsDir();
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            const today = new Date().toISOString().slice(0, 10);
            const p = path.join(dir, `${today}.md`);
            const time = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
            const header = `## [${time}] ${entry.emoji || '💬'} ${entry.speaker}${entry.section ? ` (${entry.section})` : ''}`;
            const cleanBody = entry.body.trim();
            const block = `\n${header}\n${cleanBody}\n`;
            fs.appendFileSync(p, block, 'utf-8');
        } catch (e) {
            console.error('[ConversationService] append failed:', e);
        }
    }

    public readRecentConversations(maxChars = 2500): string {
        try {
            const dir = getConversationsDir();
            if (!fs.existsSync(dir)) return '';
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort().reverse();
            let total = '';
            for (const f of files) {
                const txt = _safeReadText(path.join(dir, f));
                total = txt + '\n' + total;
                if (total.length > maxChars * 2) break;
            }
            return total.slice(-maxChars);
        } catch { return ''; }
    }
}
