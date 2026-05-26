import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import axios from 'axios';
import { getCompanyDir } from '../paths';
import { _safeReadText, _safeWriteText } from '../utils/file';
import { LlmService } from './llm-service';
import { ApprovalService } from './approval-service';

const YT_OAUTH_REDIRECT = 'http://127.0.0.1:5814/yt-oauth-callback';
const YT_OAUTH_SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl'
].join(' ');

const YT_OAUTH_CLIENT_ID_KEY = 'YOUTUBE_OAUTH_CLIENT_ID';
const YT_OAUTH_CLIENT_SECRET_KEY = 'YOUTUBE_OAUTH_CLIENT_SECRET';

export class YouTubeService {
    private static _instance: YouTubeService;

    private constructor() {}

    public static getInstance(): YouTubeService {
        if (!YouTubeService._instance) {
            YouTubeService._instance = new YouTubeService();
        }
        return YouTubeService._instance;
    }

    public _readYtOAuthClient(): { id: string; secret: string } {
        const cfgPath = path.join(getCompanyDir(), '_agents', 'youtube', 'config.md');
        const txt = _safeReadText(cfgPath);
        const idM = txt.match(new RegExp(`${YT_OAUTH_CLIENT_ID_KEY}\\s*[:：=]\\s*([^\\r\\n]+)`));
        const secM = txt.match(new RegExp(`${YT_OAUTH_CLIENT_SECRET_KEY}\\s*[:：=]\\s*([^\\r\\n]+)`));
        return { id: idM ? idM[1].trim() : '', secret: secM ? secM[1].trim() : '' };
    }

    private _readYtOAuthTokens(): { access_token?: string; refresh_token?: string; expires_at?: number } | null {
        const p = path.join(getCompanyDir(), '_agents', 'youtube', 'tools', 'youtube_account.json');
        const txt = _safeReadText(p);
        try { return JSON.parse(txt || '{}'); } catch { return null; }
    }

    private _writeYtOAuthTokens(t: { access_token?: string; refresh_token?: string; expires_at?: number }) {
        const p = path.join(getCompanyDir(), '_agents', 'youtube', 'tools', 'youtube_account.json');
        _safeWriteText(p, JSON.stringify(t, null, 2));
    }

    public isYoutubeOAuthConnected(): boolean {
        const t = this._readYtOAuthTokens();
        return !!(t && (t.refresh_token || (t.access_token && t.expires_at && t.expires_at > Date.now())));
    }

    private async _ensureYtAccessToken(): Promise<string | null> {
        const t = this._readYtOAuthTokens();
        if (!t) return null;
        if (t.access_token && t.expires_at && t.expires_at > Date.now() + 30_000) return t.access_token;
        if (!t.refresh_token) return null;
        const cl = this._readYtOAuthClient();
        if (!cl.id || !cl.secret) return null;
        try {
            const params = new URLSearchParams({
                client_id: cl.id,
                client_secret: cl.secret,
                refresh_token: t.refresh_token,
                grant_type: 'refresh_token',
            });
            const r = await axios.post('https://oauth2.googleapis.com/token', params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 10000,
            });
            const newAt = r.data?.access_token;
            const expiresIn = r.data?.expires_in || 3600;
            if (!newAt) return null;
            this._writeYtOAuthTokens({ ...t, access_token: newAt, expires_at: Date.now() + expiresIn * 1000 });
            return newAt;
        } catch { return null; }
    }

    public async startYouTubeOAuthFlow(): Promise<{ ok: boolean; message: string }> {
        const cl = this._readYtOAuthClient();
        if (!cl.id || !cl.secret) {
            return { ok: false, message: `먼저 \`_agents/youtube/config.md\`에 Client ID/Secret을 설정하세요.` };
        }
        return new Promise((resolve) => {
            const state = Math.random().toString(36).slice(2, 12);
            const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?'
                + new URLSearchParams({
                    client_id: cl.id,
                    redirect_uri: YT_OAUTH_REDIRECT,
                    response_type: 'code',
                    scope: YT_OAUTH_SCOPES,
                    access_type: 'offline',
                    prompt: 'consent',
                    state,
                }).toString();
            
            let server: http.Server | null = null;
            let resolved = false;
            const timer = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                try { server?.close(); } catch { /* ignore */ }
                resolve({ ok: false, message: '⏱️ OAuth 시간 초과 (5분).' });
            }, 5 * 60_000);

            server = http.createServer(async (req, res) => {
                try {
                    const url = new URL(req.url || '/', `http://127.0.0.1:5814`);
                    if (!url.pathname.startsWith('/yt-oauth-callback')) {
                        res.writeHead(404); res.end(); return;
                    }
                    const code = url.searchParams.get('code') || '';
                    const stateBack = url.searchParams.get('state') || '';
                    if (stateBack !== state || !code) {
                        res.writeHead(400); res.end('Invalid state or code');
                        if (!resolved) { resolved = true; clearTimeout(timer); try { server?.close(); } catch {} resolve({ ok: false, message: 'OAuth mismatch' }); }
                        return;
                    }
                    const params = new URLSearchParams({
                        client_id: cl.id,
                        client_secret: cl.secret,
                        code,
                        redirect_uri: YT_OAUTH_REDIRECT,
                        grant_type: 'authorization_code',
                    });
                    const tk = await axios.post('https://oauth2.googleapis.com/token', params.toString(), {
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        timeout: 15000,
                    });
                    this._writeYtOAuthTokens({ 
                        access_token: tk.data?.access_token, 
                        refresh_token: tk.data?.refresh_token, 
                        expires_at: Date.now() + (tk.data?.expires_in || 3600) * 1000 
                    });
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>✅ YouTube 연결 완료</h1>');
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timer);
                        try { server?.close(); } catch {}
                        resolve({ ok: true, message: '✅ YouTube OAuth 연결 완료.' });
                    }
                } catch (e: any) {
                    res.writeHead(500); res.end('Error');
                    if (!resolved) { resolved = true; clearTimeout(timer); try { server?.close(); } catch {} resolve({ ok: false, message: 'OAuth failure' }); }
                }
            });
            server.listen(5814, '127.0.0.1', () => vscode.env.openExternal(vscode.Uri.parse(authUrl)));
        });
    }

    public async fetchYouTubeAnalyticsSummary(): Promise<any> {
        const at = await this._ensureYtAccessToken();
        if (!at) throw new Error('OAuth 토큰 없음');
        const end = new Date();
        const start = new Date(Date.now() - 28 * 86_400_000);
        const fmt = (d: Date) => d.toISOString().slice(0, 10);
        const baseParams = { ids: 'channel==MINE', startDate: fmt(start), endDate: fmt(end) };
        const headers = { Authorization: `Bearer ${at}` };
        
        const totals = await axios.get('https://youtubeanalytics.googleapis.com/v2/reports', {
            params: { ...baseParams, metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained' },
            headers, timeout: 12000,
        });
        const row = totals.data?.rows?.[0] || [];
        const cols = (totals.data?.columnHeaders || []).map((c: any) => c.name);
        const get = (name: string) => { const i = cols.indexOf(name); return i >= 0 ? row[i] : null; };

        return {
            views: get('views'),
            minutes: get('estimatedMinutesWatched'),
            avgDuration: get('averageViewDuration'),
            avgPercentage: get('averageViewPercentage'),
            subsGained: get('subscribersGained'),
        };
    }

    public async youtubeCommentReplyDraftBatch(opts: { maxComments?: number; maxPerVideo?: number } = {}): Promise<{ drafted: number; skipped: number; reason?: string }> {
        const cfgPath = path.join(getCompanyDir(), '_agents', 'youtube', 'config.md');
        const cfgTxt = _safeReadText(cfgPath);
        const apiM = cfgTxt.match(/YOUTUBE_API_KEY\s*[:：=]\s*([A-Za-z0-9_\-]+)/);
        const chM  = cfgTxt.match(/YOUTUBE_CHANNEL_ID\s*[:：=]\s*([A-Za-z0-9_\-]+)/);
        if (!apiM || !chM) return { drafted: 0, skipped: 0, reason: 'YOUTUBE_API_KEY 또는 YOUTUBE_CHANNEL_ID 미설정' };
        
        const apiKey = apiM[1];
        const channelId = chM[1];
        const maxComments = opts.maxComments ?? 10;
        const maxPerVideo = opts.maxPerVideo ?? 3;

        let uploads = '';
        try {
            const r = await axios.get(`https://www.googleapis.com/youtube/v3/channels`, {
                params: { part: 'contentDetails', id: channelId, key: apiKey },
                timeout: 10000,
            });
            uploads = r.data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || '';
        } catch { return { drafted: 0, skipped: 0, reason: '채널 조회 실패' }; }
        if (!uploads) return { drafted: 0, skipped: 0, reason: '업로드 플레이리스트 미발견' };

        let videoIds: string[] = [];
        try {
            const r = await axios.get(`https://www.googleapis.com/youtube/v3/playlistItems`, {
                params: { part: 'contentDetails', playlistId: uploads, maxResults: 5, key: apiKey },
                timeout: 10000,
            });
            videoIds = (r.data?.items || []).map((it: any) => it.contentDetails?.videoId).filter(Boolean);
        } catch { return { drafted: 0, skipped: 0, reason: '최근 영상 조회 실패' }; }

        const approvalService = ApprovalService.getInstance();
        const pendingNow = approvalService.listPendingApprovals();
        const existingCommentIds = new Set(pendingNow.filter(a => a.kind === 'youtube.comment_reply').map(a => String(a.payload?.commentId || '')));
        
        let drafted = 0, skipped = 0;
        for (const videoId of videoIds) {
            if (drafted >= maxComments) break;
            let comments: any[] = [];
            try {
                const r = await axios.get(`https://www.googleapis.com/youtube/v3/commentThreads`, {
                    params: { part: 'snippet', videoId, maxResults: maxPerVideo, order: 'time', key: apiKey, textFormat: 'plainText' },
                    timeout: 10000,
                });
                comments = r.data?.items || [];
            } catch { continue; }
            for (const c of comments) {
                if (drafted >= maxComments) break;
                const top = c.snippet?.topLevelComment?.snippet;
                const commentId = c.snippet?.topLevelComment?.id;
                if (!top || !commentId) continue;
                if (existingCommentIds.has(commentId)) { skipped++; continue; }
                if ((c.snippet?.totalReplyCount || 0) > 0) { skipped++; continue; }
                
                const author = top.authorDisplayName || '익명';
                const text = (top.textDisplay || '').slice(0, 500);
                try {
                    const draft = await LlmService.quickLLMCall(
                        `당신은 크리에이터의 YouTube 댓글 답장 작성기입니다.`,
                        `[작성자] ${author}\n[댓글]\n${text}\n\n답장 초안 작성.`,
                        200
                    );
                    if (draft) {
                        approvalService.createApproval({
                            agentId: 'youtube',
                            title: `${author}님 댓글에 답장`,
                            summary: `*원댓글:* ${text.slice(0, 200)}\n\n*답장 초안:* ${draft.trim()}`,
                            kind: 'youtube.comment_reply',
                            payload: { videoId, commentId, replyText: draft.trim(), author, originalText: text },
                        });
                        drafted++;
                    }
                } catch { continue; }
            }
        }
        return { drafted, skipped };
    }
}
