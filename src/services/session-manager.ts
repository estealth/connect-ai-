import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { 
    appendConversationLog as extAppendLog,
    makeSessionDir as extMakeDir,
    sendTelegramLong, readTelegramConfig
} from '../extension';

export class SessionManager {
    public makeSessionDir(): string {
        return extMakeDir();
    }

    public appendConversationLog(entry: { speaker: string; emoji: string; body: string; section?: string }) {
        extAppendLog(entry);
    }

    public async maybeMirrorToTelegram(text: string) {
        try {
            const tg = readTelegramConfig();
            if (tg.token && tg.chatId) await sendTelegramLong(text);
        } catch (e) {
            console.error('[SessionManager] Telegram mirror failed:', e);
        }
    }
}
