import * as path from 'path';
import axios from 'axios';
import { getCompanyDir } from '../paths';
import { _safeReadText } from './file';

export interface TelegramConfig {
    token: string;
    chatId: string;
}

export function readTelegramConfig(): TelegramConfig {
    const p = path.join(getCompanyDir(), '_agents', 'secretary', 'tools', 'telegram_setup.json');
    const txt = _safeReadText(p);
    try {
        const d = JSON.parse(txt || '{}');
        return { token: String(d.BOT_TOKEN || ''), chatId: String(d.CHAT_ID || '') };
    } catch { return { token: '', chatId: '' }; }
}

export async function sendTelegramReport(text: string): Promise<boolean> {
    const { token, chatId } = readTelegramConfig();
    if (!token || !chatId) return false;
    try {
        const res = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        }, { timeout: 10000, validateStatus: () => true });
        return res.status >= 200 && res.status < 300;
    } catch (e: any) {
        console.error('[Telegram] send failed:', e?.message || e);
        return false;
    }
}
