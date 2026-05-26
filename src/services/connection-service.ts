import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { getCompanyDir } from '../paths';
import { _safeReadText, _safeWriteText } from '../utils/file';
import { AGENTS } from '../agents';

export interface ApiServiceDef {
    id: string;
    name: string;
    icon: string;
    summary: string;
    helpUrl?: string;
    wizardCommand?: string;
    comingSoon?: boolean;
    agentId: string;
    fields: { key: string; label: string; type: 'text' | 'password' | 'select'; help?: string; placeholder?: string; options?: string[] }[];
}

export const API_SERVICES: ApiServiceDef[] = [
    {
        id: 'telegram', name: '텔레그램 봇', icon: '📨', agentId: 'secretary',
        summary: '비서가 텔레그램으로 양방향 명령을 받고 보고합니다.',
        helpUrl: 'https://t.me/BotFather',
        fields: [
            { key: 'TELEGRAM_BOT_TOKEN', label: 'Bot Token', type: 'password', help: '@BotFather에서 발급' },
            { key: 'TELEGRAM_CHAT_ID', label: 'Chat ID', type: 'text', placeholder: '비워두면 자동 감지' },
        ],
    },
    {
        id: 'youtube', name: 'YouTube Data API', icon: '📺', agentId: 'youtube',
        summary: '채널 분석, 댓글 답장 큐 생성.',
        helpUrl: 'https://console.cloud.google.com/',
        fields: [
            { key: 'YOUTUBE_API_KEY', label: 'API Key', type: 'password' },
            { key: 'YOUTUBE_CHANNEL_ID', label: 'Channel ID', type: 'text' },
        ],
    },
    {
        id: 'paypal', name: 'PayPal (매출 분석)', icon: '💰', agentId: 'business',
        summary: '내 서비스의 결제 거래를 분석.',
        helpUrl: 'https://developer.paypal.com/dashboard/applications',
        fields: [
            { key: 'PAYPAL_MODE', label: '모드', type: 'select', options: ['sandbox', 'live'] },
            { key: 'PAYPAL_CLIENT_ID', label: 'Client ID', type: 'password' },
            { key: 'PAYPAL_CLIENT_SECRET', label: 'Client Secret', type: 'password' },
        ],
    },
    // ... more services
];

export class ConnectionService {
    private static _instance: ConnectionService;
    private constructor() {}
    public static getInstance(): ConnectionService {
        if (!ConnectionService._instance) ConnectionService._instance = new ConnectionService();
        return ConnectionService._instance;
    }

    public readAllApiConnections(): Record<string, Record<string, string>> {
        const out: Record<string, Record<string, string>> = {};
        for (const svc of API_SERVICES) {
            out[svc.id] = {};
            const cfgPath = path.join(getCompanyDir(), '_agents', svc.agentId, 'config.md');
            const txt = _safeReadText(cfgPath);
            for (const f of svc.fields) {
                const re = new RegExp('^' + f.key + '[ \\t]*[:：=][ \\t]*([^\\r\\n]+?)[ \\t]*$', 'm');
                const m = txt.match(re);
                out[svc.id][f.key] = m ? m[1].trim() : '';
            }
        }
        return out;
    }

    public async saveApiConnection(serviceId: string, values: Record<string, string>): Promise<{ ok: boolean; error?: string; note?: string }> {
        const svc = API_SERVICES.find(s => s.id === serviceId);
        if (!svc) return { ok: false, error: 'Unknown service' };
        
        let extraNote = '';
        if (serviceId === 'telegram') {
            let token = (values['TELEGRAM_BOT_TOKEN'] || '').trim().replace(/[\s ​-‍﻿]+/g, '').replace(/^bot/i, '');
            let chatId = (values['TELEGRAM_CHAT_ID'] || '').trim();
            if (!token) return { ok: false, error: '봇 토큰이 비어있어요' };
            
            if (!chatId) {
                try {
                    const upRes = await axios.get(`https://api.telegram.org/bot${encodeURIComponent(token)}/getUpdates`, { timeout: 8000, validateStatus: () => true });
                    const updates = upRes.data?.result || [];
                    if (updates.length > 0) {
                        chatId = String(updates[updates.length - 1]?.message?.chat?.id || '');
                        extraNote = `📲 Chat ID 자동 감지됨: ${chatId}`;
                    }
                } catch { /* skip auto-detect */ }
            }
            
            const jsonPath = path.join(getCompanyDir(), '_agents', 'secretary', 'tools', 'telegram_setup.json');
            _safeWriteText(jsonPath, JSON.stringify({ BOT_TOKEN: token, CHAT_ID: chatId }, null, 2));
            values['TELEGRAM_BOT_TOKEN'] = token;
            values['TELEGRAM_CHAT_ID'] = chatId;
        }

        const cfgPath = path.join(getCompanyDir(), '_agents', svc.agentId, 'config.md');
        let txt = _safeReadText(cfgPath);
        for (const f of svc.fields) {
            const v = (values[f.key] || '').trim();
            const re = new RegExp('^' + f.key + '\\s*[:：=]\\s*.*$', 'm');
            if (re.test(txt)) txt = txt.replace(re, `${f.key}: ${v}`);
            else txt = txt.trimEnd() + `\n${f.key}: ${v}\n`;
        }
        _safeWriteText(cfgPath, txt);
        return { ok: true, note: extraNote };
    }
}
