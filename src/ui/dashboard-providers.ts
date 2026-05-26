import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { _loadWebviewAsset } from './templates';
import { AGENTS } from '../agents';
import { getCompanyDir } from '../paths';

// Imported from extension.ts
import {
    resolveApproval, listPendingApprovals, _approvalsPendingDir,
    _youtubeCommentReplyDraftBatch, isYoutubeOAuthConnected,
    fetchYouTubeAnalyticsSummary, _safeReadText
} from '../extension';


export interface YouTubeChannelSummary {
    id: string;
    title: string;
    desc: string;
    thumb: string;
    subs: number;
    views: number;
    videos: number;
    uploadsPlaylist: string;
}

export interface YouTubeVideo {
    id: string;
    title: string;
    thumb: string;
    views: number;
    likes: number;
    comments: number;
    publishedAt: string;
}

export type DashboardMessage = 
    | { type: 'state'; my?: YouTubeChannelSummary; myVideos?: YouTubeVideo[]; engagementPct?: string; competitors?: YouTubeChannelSummary[]; pendingComments?: number; oauthConnected?: boolean; analytics?: any; error?: string; toast?: string; items?: any[] }
    | { type: 'toast'; text: string; err?: boolean };

export class ApprovalsPanelProvider implements vscode.WebviewViewProvider {

    public static readonly viewId = 'shinAi.approvals';
    private _view?: vscode.WebviewView;
    private _refreshTicker: NodeJS.Timeout | null = null;

    resolveWebviewView(view: vscode.WebviewView): void {
        this._view = view;
        view.webview.options = { enableScripts: true };
        view.webview.html = this._html();
        view.webview.onDidReceiveMessage(async (msg) => {
            if (msg?.type === 'refresh') this._post();
            else if (msg?.type === 'openDash') {
                vscode.commands.executeCommand('shinAi.dashboard.open');
            } else if (msg?.type === 'approve' && msg.id) {
                const r = await resolveApproval(msg.id, 'approved');
                this._post(r.message);
            } else if (msg?.type === 'reject' && msg.id) {
                const r = await resolveApproval(msg.id, 'rejected');
                this._post(r.message);
            } else if (msg?.type === 'open' && msg.id) {
                try {
                    const ap = listPendingApprovals().find(a => a.id.endsWith(msg.id));
                    if (ap) {
                        const p = path.join(_approvalsPendingDir(), `${ap.id}.md`);
                        const doc = await vscode.workspace.openTextDocument(p);
                        vscode.window.showTextDocument(doc);
                    }
                } catch { /* ignore */ }
            }
        });
        /* Poll-refresh — pending approvals can be created from any agent any
           time, so the panel needs to re-render even when the user isn't
           interacting with it. 8s is a sweet spot — fast enough to feel
           live, slow enough to not drain battery. */
        this._refreshTicker = setInterval(() => this._post(), 8000);
        view.onDidDispose(() => {
            if (this._refreshTicker) clearInterval(this._refreshTicker);
            this._refreshTicker = null;
            this._view = undefined;
        });
        this._post();
    }

    public refresh() { this._post(); }

    private _post(toast?: string) {
        if (!this._view) return;
        const items = listPendingApprovals().map((a: any) => {
            const ag = AGENTS[a.agentId];
            return {
                id: a.id, shortId: a.id.slice(-9),
                agent: a.agentId,
                emoji: ag?.emoji || '🤖',
                name: ag?.name || a.agentId,
                kind: a.kind,
                title: a.title,
                summary: a.summary,
                createdAt: a.createdAt,
            };
        });
        this._view.webview.postMessage({ type: 'state', items, toast });
    }

    private _html(): string {
        /* Slim sidebar version — full UX lives in the editor-pane dashboard.
           Here we show: top 3 pending approvals (compact), big "둘러보기"
           CTA. Quick approval actions still inline so the user can decide
           without context-switching. */
        return `<!doctype html><html><head><meta charset="utf-8"><style>${_loadWebviewAsset('sidebar-brand.css')}</style></head><body>
<div class="sb-head">
  <span class="sb-title">⏳ 승인 대기</span>
  <span class="sb-badge" id="cnt">0</span>
</div>
<div class="sb-cta">
  <button class="sb-btn primary" id="openDash">🏢 우리 회사 →</button>
</div>
<div id="list" class="sb-body"></div>
<div class="sb-toast" id="toast"></div>
<script>
const vscode = acquireVsCodeApi();
const list = document.getElementById('list');
const cnt  = document.getElementById('cnt');
const toast = document.getElementById('toast');
document.getElementById('openDash').onclick = () => vscode.postMessage({ type: 'openDash' });
function showToast(msg, isErr) { toast.textContent = msg; toast.classList.toggle('err', !!isErr); toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2400); }
function esc(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
window.addEventListener('message', e => {
  const m = e.data;
  if (m.type !== 'state') return;
  cnt.textContent = m.items.length;
  if (m.toast) showToast(m.toast, /실패|찾지 못|FAIL/.test(m.toast));
  if (m.items.length === 0) {
    list.innerHTML = '<div class="sb-empty">✅ 대기 액션 없음</div>';
    return;
  }
  /* Show top 3 only — rest in the dashboard. */
  list.innerHTML = m.items.slice(0, 3).map((it: any) =>
    '<div class="sb-card"><div class="sb-card-head"><span>' + it.emoji + '</span>'
    + '<span class="sb-card-title">' + esc(it.title) + '</span></div>'
    + '<div class="sb-card-meta">' + esc(it.name) + ' · ' + esc(it.shortId) + '</div>'
    + '<div class="sb-card-actions">'
    +   '<button class="sb-btn primary" data-act="approve" data-id="' + esc(it.shortId) + '">✅</button>'
    +   '<button class="sb-btn danger"  data-act="reject"  data-id="' + esc(it.shortId) + '">✖️</button>'
    +   '<button class="sb-btn"          data-act="open"    data-id="' + esc(it.shortId) + '">📄</button>'
    + '</div></div>'
  ).join('');
  if (m.items.length > 3) {
    list.innerHTML += '<div class="sb-more">+' + (m.items.length - 3) + '건 더 — 둘러보기에서 확인</div>';
  }
  list.querySelectorAll('button[data-act]').forEach((btn: any) => {
    btn.onclick = () => vscode.postMessage({ type: btn.dataset.act, id: btn.dataset.id });
  });
});
vscode.postMessage({ type: 'refresh' });
</script>
</body></html>`;
    }
}

export class YouTubeDashboardProvider implements vscode.WebviewViewProvider {
    public static readonly viewId = 'shinAi.youtube';
    private _view?: vscode.WebviewView;

    resolveWebviewView(view: vscode.WebviewView): void {
        this._view = view;
        view.webview.options = { enableScripts: true };
        view.webview.html = this._html();
        view.webview.onDidReceiveMessage(async (msg) => {
            try {
                if (msg?.type === 'refresh') {
                    await this._sendChannelData();
                } else if (msg?.type === 'openDash') {
                    vscode.commands.executeCommand('shinAi.dashboard.open');
                } else if (msg?.type === 'addCompetitor' && msg.handleOrId) {
                    await this._addCompetitor(msg.handleOrId);
                } else if (msg?.type === 'removeCompetitor' && msg.id) {
                    await this._removeCompetitor(msg.id);
                } else if (msg?.type === 'queueComments') {
                    const r = await _youtubeCommentReplyDraftBatch({});
                    this._view?.webview.postMessage({ type: 'toast', text: r.reason ? `⚠️ ${r.reason}` : `📺 ${r.drafted}건 큐 생성, ${r.skipped}건 스킵`, err: !!r.reason });
                    await this._sendChannelData();
                } else if (msg?.type === 'connectOAuth') {
                    vscode.commands.executeCommand('shinAi.youtube.connectOAuth');
                }
            } catch (e: any) {
                this._view?.webview.postMessage({ type: 'toast', text: `⚠️ ${e?.message || e}`, err: true });
            }
        });
        view.onDidDispose(() => { this._view = undefined; });
        this._sendChannelData().catch(() => { /* ignore boot errors */ });
    }

    public refresh() { this._sendChannelData().catch(() => {}); }

    private _competitorsPath(): string {
        return path.join(getCompanyDir(), '_agents', 'youtube', 'competitors.json');
    }
    private _readCompetitors(): string[] {
        try {
            const txt = _safeReadText(this._competitorsPath());
            const arr = JSON.parse(txt || '[]');
            return Array.isArray(arr) ? arr.filter((x: any) => typeof x === 'string') : [];
        } catch { return []; }
    }
    private _writeCompetitors(ids: string[]) {
        try {
            fs.mkdirSync(path.dirname(this._competitorsPath()), { recursive: true });
            fs.writeFileSync(this._competitorsPath(), JSON.stringify(ids, null, 2));
        } catch { /* ignore */ }
    }

    private async _addCompetitor(handleOrId: string) {
        const cfg = this._loadCfg();
        if (!cfg.apiKey) { this._view?.webview.postMessage({ type: 'toast', text: '⚠️ YOUTUBE_API_KEY 미설정', err: true }); return; }
        let channelId = handleOrId.trim();
        /* Resolve @handle / channel name → channelId via search.list. */
        if (!/^UC[A-Za-z0-9_-]{20,}$/.test(channelId)) {
            try {
                const r = await axios.get('https://www.googleapis.com/youtube/v3/search', {
                    params: { part: 'snippet', q: channelId.replace(/^@/, ''), type: 'channel', maxResults: 1, key: cfg.apiKey },
                    timeout: 10000,
                });
                const found = r.data?.items?.[0]?.snippet?.channelId;
                if (found) channelId = found;
                else { this._view?.webview.postMessage({ type: 'toast', text: `⚠️ 채널 못 찾음: ${handleOrId}`, err: true }); return; }
            } catch (e: any) {
                this._view?.webview.postMessage({ type: 'toast', text: `⚠️ 검색 실패: ${e?.message || e}`, err: true }); return;
            }
        }
        const list = this._readCompetitors();
        if (list.includes(channelId)) { this._view?.webview.postMessage({ type: 'toast', text: '이미 등록됨' }); return; }
        list.push(channelId);
        this._writeCompetitors(list);
        this._view?.webview.postMessage({ type: 'toast', text: '✅ 경쟁 채널 추가됨' });
        await this._sendChannelData();
    }

    private async _removeCompetitor(id: string) {
        const list = this._readCompetitors().filter((x: any) => x !== id);
        this._writeCompetitors(list);
        await this._sendChannelData();
    }

    private _loadCfg(): { apiKey: string; channelId: string } {
        const cfgPath = path.join(getCompanyDir(), '_agents', 'youtube', 'config.md');
        const txt = _safeReadText(cfgPath);
        const apiM = txt.match(/YOUTUBE_API_KEY\s*[:：=]\s*([A-Za-z0-9_\-]+)/);
        const chM  = txt.match(/YOUTUBE_CHANNEL_ID\s*[:：=]\s*([A-Za-z0-9_\-]+)/);
        return { apiKey: apiM ? apiM[1] : '', channelId: chM ? chM[1] : '' };
    }

    private async _fetchChannelSummary(channelId: string, apiKey: string): Promise<YouTubeChannelSummary | null> {
        try {
            const r = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
                params: { part: 'snippet,statistics,contentDetails', id: channelId, key: apiKey },
                timeout: 10000,
            });
            const it = r.data?.items?.[0];
            if (!it) return null;
            return {
                id: channelId,
                title: it.snippet?.title || '',
                desc: (it.snippet?.description || '').slice(0, 200),
                thumb: it.snippet?.thumbnails?.default?.url || '',
                subs: parseInt(it.statistics?.subscriberCount || '0', 10),
                views: parseInt(it.statistics?.viewCount || '0', 10),
                videos: parseInt(it.statistics?.videoCount || '0', 10),
                uploadsPlaylist: it.contentDetails?.relatedPlaylists?.uploads || '',
            };
        } catch { return null; }
    }

    private async _fetchRecentVideos(playlistId: string, apiKey: string, max = 5): Promise<YouTubeVideo[]> {
        if (!playlistId) return [];
        try {
            const r = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
                params: { part: 'snippet,contentDetails', playlistId, maxResults: max, key: apiKey },
                timeout: 10000,
            });
            const ids = (r.data?.items || []).map((x: { contentDetails: { videoId: string } }) => x.contentDetails?.videoId).filter(Boolean);
            if (ids.length === 0) return [];
            const stats = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: { part: 'snippet,statistics', id: ids.join(','), key: apiKey },
                timeout: 10000,
            });
            return (stats.data?.items || []).map((it: { id: string, snippet: any, statistics: any }) => ({
                id: it.id,
                title: it.snippet?.title || '',
                thumb: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || '',
                views: parseInt(it.statistics?.viewCount || '0', 10),
                likes: parseInt(it.statistics?.likeCount || '0', 10),
                comments: parseInt(it.statistics?.commentCount || '0', 10),
                publishedAt: it.snippet?.publishedAt || '',
            }));
        } catch { return []; }
    }

    private async _sendChannelData(): Promise<void> {
        if (!this._view) return;
        const cfg = this._loadCfg();
        if (!cfg.apiKey || !cfg.channelId) {
            this._view.webview.postMessage({ type: 'state', error: 'API key / Channel ID 미설정. `_agents/youtube/config.md` 에서 채워주세요.' });
            return;
        }
        const oauthConnected = isYoutubeOAuthConnected();
        const my = await this._fetchChannelSummary(cfg.channelId, cfg.apiKey);
        if (!my) {
            this._view.webview.postMessage({ type: 'state', error: '내 채널 조회 실패 — API key 또는 channel id 확인 필요' });
            return;
        }
        const myVideos = await this._fetchRecentVideos(my.uploadsPlaylist, cfg.apiKey, 5);
        /* Compute simple engagement KPI: avg like rate per recent video. */
        const totalViews = myVideos.reduce((s, v) => s + v.views, 0);
        const totalEng   = myVideos.reduce((s, v) => s + v.likes + v.comments, 0);
        const engagementPct = totalViews > 0 ? ((totalEng / totalViews) * 100).toFixed(2) : '0.00';
        const competitors: YouTubeChannelSummary[] = [];
        for (const cid of this._readCompetitors().slice(0, 5)) {
            const c = await this._fetchChannelSummary(cid, cfg.apiKey);
            if (c) competitors.push(c);
        }
        const pendingComments = listPendingApprovals().filter((a: any) => a.kind === 'youtube.comment_reply').length;
        let analytics: any = null;
        if (oauthConnected) {
            try {
                analytics = await fetchYouTubeAnalyticsSummary();
            } catch { analytics = { error: 'Analytics 호출 실패' }; }
        }
        this._view.webview.postMessage({
            type: 'state',
            my, myVideos,
            engagementPct,
            competitors,
            pendingComments,
            oauthConnected,
            analytics,
        });
    }

    private _html(): string {
        /* Slim sidebar — top KPIs (subs / views / engagement / pending),
           "회사 둘러보기" CTA. Full UX lives in the dashboard editor pane. */
        return `<!doctype html><html><head><meta charset="utf-8"><style>${_loadWebviewAsset('sidebar-brand.css')}</style></head><body>
<div class="sb-head">
  <span class="sb-title">📺 YouTube</span>
  <span class="sb-badge" id="oauthBadge">API key</span>
</div>
<div class="kpi-mini-grid" id="kpis">
  <div class="kpi-mini"><div class="kpi-mini-num" id="kSubs">–</div><div class="kpi-mini-lbl">구독자</div></div>
  <div class="kpi-mini"><div class="kpi-mini-num" id="kViews">–</div><div class="kpi-mini-lbl">총 조회</div></div>
  <div class="kpi-mini"><div class="kpi-mini-num" id="kEng">–</div><div class="kpi-mini-lbl">참여율</div></div>
  <div class="kpi-mini"><div class="kpi-mini-num" id="kAprPending">0</div><div class="kpi-mini-lbl">답장 대기</div></div>
</div>
<div class="sb-cta">
  <button class="sb-btn primary" id="openDash">🏢 우리 회사 →</button>
</div>
<div class="sb-body">
  <button class="sb-btn" id="queueBtn" style="width:100%;justify-content:center;" title="유튜브 최근 영상의 미답 댓글을 응답 큐에 추가 — 승인 후 일괄 답변 가능">📥 댓글 큐 갱신</button>
  <button class="sb-btn" id="oauthBtn" style="width:100%;justify-content:center;display:none;">🔐 OAuth 연결</button>
</div>
<div class="sb-toast" id="toast"></div>
<script>
const vscode = acquireVsCodeApi();
const $ = (id) => document.getElementById(id);
const fmt = (n) => { n = Number(n)||0; if(n>=1e9) return (n/1e9).toFixed(1)+'B'; if(n>=1e6) return (n/1e6).toFixed(1)+'M'; if(n>=1e3) return (n/1e3).toFixed(1)+'K'; return String(n); };
function showToast(msg, isErr){ const t=$('toast'); t.textContent=msg; t.classList.toggle('err',!!isErr); t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2400); }
$('openDash').onclick = () => vscode.postMessage({ type: 'openDash' });
$('queueBtn').onclick = () => vscode.postMessage({ type: 'queueComments' });
$('oauthBtn').onclick = () => vscode.postMessage({ type: 'connectOAuth' });
window.addEventListener('message', e => {
  const m = e.data;
  if (m.type === 'toast') { showToast(m.text, m.err); return; }
  if (m.type !== 'state') return;
  if (m.error) {
    $('kSubs').textContent = '–'; $('kViews').textContent = '–'; $('kEng').textContent = '–';
    return;
  }
  $('oauthBadge').textContent = m.oauthConnected ? 'OAuth ✅' : 'API key';
  $('oauthBadge').style.color = m.oauthConnected ? '#34d399' : '#00ff8b';
  $('oauthBtn').style.display = m.oauthConnected ? 'none' : '';
  if (m.my) {
    $('kSubs').textContent = fmt(m.my.subs);
    $('kViews').textContent = fmt(m.my.views);
    $('kEng').textContent = (m.engagementPct || '0') + '%';
  }
  $('kAprPending').textContent = m.pendingComments || 0;
});
vscode.postMessage({ type: 'refresh' });
</script>
</body></html>`;
    }
}