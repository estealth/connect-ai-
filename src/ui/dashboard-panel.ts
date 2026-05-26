import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { CompanyService } from '../services/company-service';
import { ModelService } from '../services/model-service';
import { YouTubeService } from '../services/youtube-service';
import { ApprovalService } from '../services/approval-service';
import { NotificationService } from '../services/notification-service';
import { TrackerService } from '../services/tracker-service';
import { ConversationService } from '../services/conversation-service';
import { _loadWebviewAsset } from '../utils/webview';
import { AGENTS, AGENT_ORDER, ALWAYS_ON_AGENTS, LOCKED_AGENTS_DEFAULT } from '../agents';
import { getSystemSpecs, estimateModelMemoryGB, getGpuInfo } from '../system-specs';
import { getConfig } from '../utils/config';
import { getCompanyDir, getConversationsDir } from '../paths';
import { getExtensionContext } from '../core/context';
import { _safeReadText } from '../utils/file';
import {
    listAgentTools,
    countAgentVerifiedClaims,
    readAgentRagMode,
    readAgentSelfRagCriteria,
    readToolAutonomyLevel
} from '../extension';

const TASK_PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
const AUTONOMY_LABELS: Record<number, string> = {
    0: 'Off',
    1: 'Read-only',
    2: 'Draft → Approve',
    3: 'Auto'
};

export class CompanyDashboardPanel {
    public static current: CompanyDashboardPanel | null = null;
    public static readonly viewType = 'shinAi.dashboard';
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _refreshTimer: NodeJS.Timeout | null = null;

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.ViewColumn.Active;
        if (CompanyDashboardPanel.current) {
            CompanyDashboardPanel.current._panel.reveal(column);
            CompanyDashboardPanel.current.refresh();
            return;
        }
        const panel = vscode.window.createWebviewPanel(
            CompanyDashboardPanel.viewType,
            '👥 직원 에이전트 보기',
            column,
            { enableScripts: true, retainContextWhenHidden: true }
        );
        CompanyDashboardPanel.current = new CompanyDashboardPanel(panel);
    }

    public constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._panel.webview.html = this._html();
        this._panel.onDidDispose(() => this._dispose(), null, this._disposables);

        // Reactive refresh when tracker writes happen
        const trackerService = TrackerService.getInstance();
        this._disposables.push(trackerService.onTrackerChanged(() => this._sendState().catch(() => {})));

        // Periodic light refresh (30s)
        this._refreshTimer = setInterval(() => this._sendState().catch(() => {}), 30 * 1000);

        this._panel.webview.onDidReceiveMessage(async (msg) => {
            const companyService = CompanyService.getInstance();
            const youtubeService = YouTubeService.getInstance();
            const approvalService = ApprovalService.getInstance();
            const notificationService = NotificationService.getInstance();

            try {
                if (msg?.type === 'refresh') {
                    await this._sendState();
                } else if (msg?.type === 'setAgentActive' && msg.agent) {
                    const aid = String(msg.agent || '').trim();
                    const want = !!msg.active;
                    if (ALWAYS_ON_AGENTS.has(aid)) {
                        this._postToast(`⚠️ ${aid}는 핵심 에이전트라 비활성화할 수 없어요.`, true);
                    } else {
                        companyService.setAgentActive(aid, want);
                        this._postToast(`✅ ${AGENTS[aid]?.name || aid} ${want ? '활성화됨' : '비활성화됨'}`);
                        await this._sendState();
                    }
                } else if (msg?.type === 'hireAgent' && msg.agent) {
                    if (msg.pin === '0000') {
                        companyService.markAgentHired(msg.agent, true);
                        this._postToast(`🎉 ${msg.agent} 채용 완료`);
                        await this._sendState();
                    } else {
                        this._postToast(`❌ 인증 실패`, true);
                    }
                } else if (msg?.type === 'queueComments') {
                    const r = await youtubeService.youtubeCommentReplyDraftBatch({});
                    this._postToast(`📺 ${r.drafted}건 큐 생성`, !!r.reason);
                    await this._sendState();
                } else if (msg?.type === 'approve' && msg.id) {
                    await approvalService.resolveApproval(msg.id, 'approved');
                    await this._sendState();
                } else if (msg?.type === 'getSystemSpecs') {
                    const specs = getSystemSpecs();
                    const gpu = await getGpuInfo();
                    this._panel.webview.postMessage({ type: 'systemSpecsData', specs: { ...specs, gpuInfo: gpu } });
                } else if (msg?.type === 'diagnoseConnection') {
                    vscode.commands.executeCommand('shinAi.diagnoseConnection');
                    this._postToast('🔍 시스템 진단 실행 완료');
                } else if (msg?.type === 'getAgentModelRouting') {
                    const installed = await ModelService.listInstalledModels();
                    const map = companyService.readAgentModelMap();
                    const specs = getSystemSpecs();
                    this._panel.webview.postMessage({
                        type: 'agentModelRoutingData',
                        installed: installed.map(m => ({ ...m, estMemGB: estimateModelMemoryGB(m.id), safe: estimateModelMemoryGB(m.id) <= specs.safeModelBudgetGB })),
                        map,
                        defaultModel: getConfig().defaultModel,
                        agents: AGENT_ORDER.map(id => ({ id, name: AGENTS[id]?.name || id, emoji: AGENTS[id]?.emoji || '🤖' })),
                        specs,
                    });
                } else if (msg?.type === 'saveAgentModelRouting' && msg.map) {
                    companyService.writeAgentModelMap(msg.map);
                    this._postToast(`🧠 모델 라우팅 저장됨`);
                }
            } catch (e: any) {
                this._postToast(`⚠️ ${e?.message || e}`, true);
            }
        }, null, this._disposables);

        // Initial state load
        this._sendState().catch(() => {});
    }

    public refresh() { this._sendState().catch(() => {}); }

    private _loadCfg(): { apiKey: string; channelId: string } {
        const cfgPath = path.join(getCompanyDir(), '_agents', 'youtube', 'config.md');
        const txt = _safeReadText(cfgPath);
        const apiM = txt.match(/YOUTUBE_API_KEY\s*[:：=]\s*([A-Za-z0-9_\-]+)/);
        const chM  = txt.match(/YOUTUBE_CHANNEL_ID\s*[:：=]\s*([A-Za-z0-9_\-]+)/);
        return { apiKey: apiM ? apiM[1] : '', channelId: chM ? chM[1] : '' };
    }

    private async _fetchChannelSummary(channelId: string, apiKey: string): Promise<any | null> {
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
                desc: (it.snippet?.description || '').slice(0, 240),
                thumb: it.snippet?.thumbnails?.high?.url || it.snippet?.thumbnails?.default?.url || '',
                subs: parseInt(it.statistics?.subscriberCount || '0', 10),
                views: parseInt(it.statistics?.viewCount || '0', 10),
                videos: parseInt(it.statistics?.videoCount || '0', 10),
                uploadsPlaylist: it.contentDetails?.relatedPlaylists?.uploads || '',
            };
        } catch { return null; }
    }

    private async _fetchRecentVideos(playlistId: string, apiKey: string, max = 6): Promise<any[]> {
        if (!playlistId) return [];
        try {
            const r = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
                params: { part: 'contentDetails', playlistId, maxResults: max, key: apiKey },
                timeout: 10000,
            });
            const ids = (r.data?.items || []).map((x: any) => x.contentDetails?.videoId).filter(Boolean);
            if (ids.length === 0) return [];
            const stats = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: { part: 'snippet,statistics,contentDetails', id: ids.join(','), key: apiKey },
                timeout: 10000,
            });
            return (stats.data?.items || []).map((it: any) => ({
                id: it.id,
                title: it.snippet?.title || '',
                thumb: it.snippet?.thumbnails?.high?.url || it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || '',
                views: parseInt(it.statistics?.viewCount || '0', 10),
                likes: parseInt(it.statistics?.likeCount || '0', 10),
                comments: parseInt(it.statistics?.commentCount || '0', 10),
                publishedAt: it.snippet?.publishedAt || '',
            }));
        } catch { return []; }
    }

    private _readCompetitors(): string[] {
        try {
            const p = path.join(getCompanyDir(), '_agents', 'youtube', 'competitors.json');
            const txt = _safeReadText(p);
            const arr = JSON.parse(txt || '[]');
            return Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : [];
        } catch { return []; }
    }

    private async _sendState() {
        const companyService = CompanyService.getInstance();
        const approvalService = ApprovalService.getInstance();
        const trackerService = TrackerService.getInstance();
        const conversationService = ConversationService.getInstance();
        const youtubeService = YouTubeService.getInstance();

        const cfg = this._loadCfg();
        const oauthConnected = youtubeService.isYoutubeOAuthConnected();
        const company = companyService.readCompanyName() || '1인 기업';
        const tracker = trackerService.readTracker().tasks;
        const openTasks = tracker.filter(t => t.status !== 'done' && t.status !== 'cancelled');
        const overdueTasks = openTasks.filter(t => t.dueAt && new Date(t.dueAt).getTime() < Date.now()).length;
        const urgentTasks = openTasks.filter(t => trackerService.coercePriority(t.priority) === 'urgent').length;
        const pendingApprovals = approvalService.listPendingApprovals();

        let yt: any = { configured: false };
        if (cfg.apiKey && cfg.channelId) {
            try {
                const my = await this._fetchChannelSummary(cfg.channelId, cfg.apiKey);
                if (my) {
                    const myVideos = await this._fetchRecentVideos(my.uploadsPlaylist, cfg.apiKey, 6);
                    const totalViews = myVideos.reduce((s: number, v: any) => s + v.views, 0);
                    const totalEng   = myVideos.reduce((s: number, v: any) => s + v.likes + v.comments, 0);
                    const engagementPct = totalViews > 0 ? ((totalEng / totalViews) * 100).toFixed(2) : '0.00';
                    let competitors: any[] = [];
                    const compIds = this._readCompetitors().slice(0, 6);
                    for (const cid of compIds) {
                        const c = await this._fetchChannelSummary(cid, cfg.apiKey);
                        if (c) competitors.push(c);
                    }
                    let analytics: any = null;
                    if (oauthConnected) {
                        try { analytics = await youtubeService.fetchYouTubeAnalyticsSummary(); } catch {}
                    }
                    yt = { configured: true, my, myVideos, engagementPct, competitors, analytics };
                }
            } catch { /* keep yt.configured=false */ }
        }

        const conversationsToday = (() => {
            try {
                const today = new Date().toISOString().slice(0, 10);
                const txt = _safeReadText(path.join(getConversationsDir(), `${today}.md`));
                return txt.split('\n').filter(l => l.startsWith('## [')).length;
            } catch { return 0; }
        })();

        const recentLog = conversationService.readRecentConversations(2400)
            .replace(/^\[최근 회사 대화 요약 (참고용)\]\n/, '')
            .trim();

        const agentTeam = AGENT_ORDER.map(id => {
            const a = AGENTS[id];
            if (!a) return null;
            const myTasks = openTasks.filter(t => Array.isArray(t.agentIds) && t.agentIds.includes(id));
            let lastActivity = '';
            try {
                const memTxt = _safeReadText(path.join(getCompanyDir(), '_agents', id, 'memory.md'));
                const lines = memTxt.split('\n').map(l => l.trim()).filter(l => /^\s*-\s*\[/.test(l) || (l.length > 4 && !l.startsWith('#') && !l.startsWith('_')));
                lastActivity = lines.length > 0 ? lines[lines.length - 1].slice(0, 120) : '';
            } catch { /* ignore */ }
            
            let profileImageUri = '';
            try {
                if (a.profileImage) {
                    const ctx = getExtensionContext();
                    if (ctx) {
                        const p = vscode.Uri.joinPath(ctx.extensionUri, 'assets', 'agents', a.profileImage);
                        if (fs.existsSync(p.fsPath)) {
                            profileImageUri = this._panel.webview.asWebviewUri(p).toString();
                        }
                    }
                }
            } catch { /* ignore */ }

            const lvl = readToolAutonomyLevel(id);
            let skills: any[] = [];
            try {
                const HIDDEN_TOOLS_BY_AGENT: Record<string, string[]> = {
                    youtube: ['youtube_account', 'competitor_brief', 'trend_sniper', 'comment_harvester', 'telegram_notify'],
                    secretary: ['telegram_setup', 'google_calendar'],
                };
                const hidden = HIDDEN_TOOLS_BY_AGENT[id] || [];
                const tools = listAgentTools(id).filter(t => !hidden.includes(t.name));
                
                let sharedYouTube: any = null;
                if (id === 'youtube') {
                    try {
                        const sharedPath = path.join(getCompanyDir(), '_agents', 'youtube', 'tools', 'youtube_account.json');
                        if (fs.existsSync(sharedPath)) {
                            sharedYouTube = JSON.parse(fs.readFileSync(sharedPath, 'utf-8') || '{}');
                        }
                    } catch { /* ignore */ }
                }

                skills = tools.map(t => {
                    const dn = t.displayName || t.name;
                    const m = dn.match(/^([\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}])/u);
                    const emoji = m ? m[1] : '🔧';
                    const cleanName = dn.replace(/^[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '').slice(0, 18);
                    const schema = (t as any).configSchema || [];
                    const locked = schema.some((f: any) => f.type === 'password' && (!f.value || String(f.value).trim() === ''));
                    const cleanConfig: Record<string, any> = {};
                    for (const [k, v] of Object.entries(t.config || {})) {
                        if (k.startsWith('_') && k !== '_schema') continue;
                        cleanConfig[k] = v;
                    }
                    let sharedConfigName: string | undefined;
                    let sharedConfig: any;
                    if (id === 'youtube' && t.name !== 'youtube_account' && sharedYouTube) {
                        sharedConfigName = 'youtube_account.json';
                        sharedConfig = sharedYouTube;
                    }
                    return {
                        name: t.name,
                        label: cleanName,
                        emoji,
                        enabled: t.enabled !== false,
                        locked,
                        description: (t.description || '').slice(0, 280),
                        config: cleanConfig,
                        sharedConfigName,
                        sharedConfig,
                    };
                });
            } catch { /* ignore */ }

            const verifiedCount = countAgentVerifiedClaims(id);
            const ragMode = readAgentRagMode(id);
            const selfRagCriteria = readAgentSelfRagCriteria(id);

            return {
                id,
                name: a.name,
                role: a.role,
                emoji: a.emoji,
                color: a.color,
                specialty: a.specialty,
                tagline: a.tagline || '',
                openTasks: myTasks.length,
                autonomy: lvl,
                autonomyLabel: AUTONOMY_LABELS[lvl] || 'Off',
                lastActivity,
                profileImageUri,
                skills,
                verifiedCount,
                ragMode,
                selfRagCriteria,
                hired: companyService.isAgentHired(id),
                lockable: !!LOCKED_AGENTS_DEFAULT[id],
                active: companyService.isAgentActive(id),
                togglable: !ALWAYS_ON_AGENTS.has(id),
                alwaysOn: ALWAYS_ON_AGENTS.has(id),
                optional: !ALWAYS_ON_AGENTS.has(id),
            };
        }).filter(Boolean);

        const totalAgents = agentTeam.length;
        const hiredCount = (agentTeam as any[]).filter(a => a && a.hired).length;
        const activeCount = (agentTeam as any[]).filter(a => a && a.active).length;

        try {
            this._panel.webview.postMessage({
                type: 'state',
                company,
                oauthConnected,
                yt,
                agentTeam,
                hiredCount,
                totalAgents,
                activeCount,
                tasks: {
                    open: openTasks.length,
                    overdue: overdueTasks,
                    urgent: urgentTasks,
                    top: openTasks
                        .sort((a, b) => TASK_PRIORITY_ORDER[trackerService.coercePriority(a.priority)] - TASK_PRIORITY_ORDER[trackerService.coercePriority(b.priority)])
                        .slice(0, 6)
                        .map(t => ({
                            id: t.id, shortId: t.id.slice(-9),
                            title: t.title,
                            priority: trackerService.coercePriority(t.priority),
                            owner: t.owner,
                            agentEmoji: t.agentIds && t.agentIds[0] ? (AGENTS[t.agentIds[0]]?.emoji || '🤖') : (t.owner === 'user' ? '👤' : '🤖'),
                            dueAt: t.dueAt || '',
                            dueLabel: t.dueAt ? trackerService.formatDueLabel(t.dueAt) : '',
                            recurrence: t.recurrence || '',
                            status: t.status,
                        })),
                },
                approvals: pendingApprovals.map(a => {
                    const ag = AGENTS[a.agentId];
                    return {
                        id: a.id, shortId: a.id.slice(-9),
                        emoji: ag?.emoji || '🤖',
                        agent: ag?.name || a.agentId,
                        kind: a.kind,
                        title: a.title,
                        summary: a.summary,
                        createdAt: a.createdAt,
                    };
                }),
                conversationsToday,
                recentLog: recentLog.slice(-1500),
                briefingTime: vscode.workspace.getConfiguration('shinAi').get<string>('dailyBriefingTime') || '09:00',
            });
        } catch { /* ignore */ }
    }

    private _postToast(text: string, isError = false) {
        try { this._panel.webview.postMessage({ type: 'toast', text, isError }); } catch { /* ignore */ }
    }

    private _dispose() {
        CompanyDashboardPanel.current = null;
        if (this._refreshTimer) { clearInterval(this._refreshTimer); this._refreshTimer = null; }
        this._disposables.forEach(d => d.dispose());
    }

    private _html(): string {
        return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${_loadWebviewAsset('dashboard.css')}</style>
</head><body>
<canvas id="bgCanvas"></canvas>
<header class="hero">
  <div class="hero-inner">
    <div class="hero-brand">
      <div class="logo-mark">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" stroke="currentColor" stroke-width="1.5"/>
          <circle cx="16" cy="16" r="8"  stroke="currentColor" stroke-width="1.5"/>
          <circle cx="16" cy="16" r="2.5" fill="currentColor"/>
          <path d="M16 2 L16 30 M2 16 L30 16" stroke="currentColor" stroke-width="0.7" stroke-dasharray="2 3"/>
        </svg>
      </div>
      <div>
        <div class="hero-eyebrow">CONNECT AI · 직원 에이전트 보기</div>
        <div class="hero-title" id="companyName">불러오는 중...</div>
        <div class="hero-meta">
          <span class="meta-pill" id="todayLabel"></span>
          <span class="meta-pill"><span class="dot live"></span> <span id="convCount">0</span>건 대화</span>
          <span class="meta-pill" id="briefPill">매일 09:00</span>
        </div>
      </div>
    </div>
    <div class="hero-actions">
      <button class="btn ghost" id="briefBtn" title="회사 전체 상태·진행 작업·이슈 즉시 자가진단" style="display: inline-flex;">시스템 진단</button>
      <button class="btn ghost" id="scheduleBtn" title="정해진 시각·요일에 시스템이 자동 보고" style="display: inline-flex;">리포트 자동화</button>
      <button class="btn ghost" id="modelsBtn" title="각 에이전트마다 최적 LLM 자동 분배·실행">모델 오케스트레이션</button>
      <button class="btn ghost" id="refreshBtn" title="동기화">새로고침</button>
    </div>
  </div>
</header>

<main class="grid">
  <!-- v2.86 layout: agent team is the hero -->
  <section class="card span-12 hero-team" id="teamCard">
    <div class="card-head">
      <div class="card-title"><span class="title-icon">👥</span> 에이전트 매트릭스</div>
      <span class="badge" id="teamBadge">10명</span>
    </div>
    <div class="team-legend">
      <span class="tl-chip tl-active" data-filter="all">전체 <span class="tl-count" id="tlAll">0</span></span>
      <span class="tl-chip" data-filter="online" title="활성 상태 (CEO가 호출 가능)"><span class="tl-dot tl-dot-on"></span>활성 <span class="tl-count" id="tlOn">0</span></span>
      <span class="tl-chip" data-filter="optional" title="옵트인 비활성화 (클릭해서 활성화)"><span class="tl-dot tl-dot-opt"></span>옵션 <span class="tl-count" id="tlOpt">0</span></span>
      <span class="tl-chip" data-filter="locked" title="채용 대기 중"><span class="tl-dot tl-dot-lock"></span>채용 대기 <span class="tl-count" id="tlLock">0</span></span>
    </div>
    <div class="team-grid" id="teamBody"></div>
  </section>

  <!-- v2.89 매출 카드 -->
  <section class="card span-12 revenue-card" id="revenueCard">
    <div class="rev-glyph-rain" aria-hidden="true"></div>
    <div class="rev-inner">
      <div class="rev-left">
        <div class="rev-eyebrow">REVENUE COMMAND CENTER · <span class="rev-live"><span class="rev-pulse"></span> LIVE</span></div>
        <div class="rev-title">💸 매출 컨트롤 센터</div>
        <div class="rev-sub" id="revSubtitle">PayPal 연결을 확인하는 중...</div>
      </div>
      <div class="rev-kpis" id="revKpis">
        <div class="rev-kpi rev-skeleton"><div class="rev-kpi-l">이번 달</div><div class="rev-kpi-v" id="revMonth">...</div></div>
        <div class="rev-kpi rev-skeleton"><div class="rev-kpi-l">7일</div><div class="rev-kpi-v" id="revWeek">...</div></div>
        <div class="rev-kpi rev-skeleton"><div class="rev-kpi-l">거래</div><div class="rev-kpi-v" id="revCount">...</div></div>
      </div>
      <div class="rev-spark">
        <svg id="revSparkSvg" viewBox="0 0 280 60" preserveAspectRatio="none"></svg>
      </div>
      <div class="rev-actions">
        <button class="rev-btn primary" id="openRevDashBtn">
          <span class="rev-btn-glow"></span>
          <span>매출 대시보드 열기</span>
          <span class="rev-btn-arrow">→</span>
        </button>
        <button class="rev-btn ghost" id="askHyunbinBtn" title="현빈 에이전트에게 매출 분석 요청">💼 현빈에게 분석 의뢰</button>
      </div>
    </div>
  </section>

  <!-- 2) active workloads + approvals -->
  <section class="card span-7" id="tasksCard">
    <div class="card-head">
      <div class="card-title"><span class="title-icon">📋</span> 액티브 워크로드</div>
      <span class="badge" id="taskBadge">0</span>
    </div>
    <div id="tasksBody"><div class="skeleton skel-md"></div></div>
  </section>

  <section class="card span-5" id="aprCard">
    <div class="card-head">
      <div class="card-title"><span class="title-icon">🔔</span> 승인 대기 (Pending)</div>
      <span class="badge warn" id="aprBadge">0</span>
    </div>
    <div id="aprBody"><div class="empty subtle">대기 중인 승인 요청이 없습니다.</div></div>
  </section>

  <!-- 3) YouTube + Analytics -->
  <section class="card span-7 yt-cond" id="ytCard" style="display:none">
    <div class="card-head">
      <div class="card-title"><span class="title-icon">📺</span> YouTube 채널 분석</div>
      <button class="btn small" id="queueBtn" title="유튜브 댓글에 대한 AI 답장 큐 새로 생성">댓글 답장 큐 생성</button>
    </div>
    <div id="ytBody"></div>
  </section>

  <section class="card span-5 yt-cond" id="anaCard" style="display:none">
    <div class="card-head">
      <div class="card-title"><span class="title-icon">📊</span> Analytics · 28일</div>
      <span class="badge" id="anaBadge">API key</span>
    </div>
    <div id="anaBody"></div>
  </section>

  <section class="card span-12 yt-cond" id="vidCard" style="display:none">
    <div class="card-head">
      <div class="card-title"><span class="title-icon">🎬</span> 최근 업로드 영상</div>
    </div>
    <div class="video-grid" id="vidBody"></div>
  </section>

  <!-- 4) KPI strip -->
  <section class="card span-12 kpi-strip yt-cond" id="kpiStrip" style="display:none">
    <div class="kpi-cell">
      <div class="kpi-icon">👥</div>
      <div class="kpi-num" data-target="0" id="kSubs">0</div>
      <div class="kpi-label">구독자</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-icon">👁</div>
      <div class="kpi-num" data-target="0" id="kViews">0</div>
      <div class="kpi-label">조회수</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-icon">🔥</div>
      <div class="kpi-num" id="kEng">0%</div>
      <div class="kpi-label">참여율</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-icon">📋</div>
      <div class="kpi-num" data-target="0" id="kOpen">0</div>
      <div class="kpi-label">진행 중 작업</div>
      <div class="kpi-delta urgent" id="kUrgent"></div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-icon">🔔</div>
      <div class="kpi-num" data-target="0" id="kApr">0</div>
      <div class="kpi-label">승인 대기</div>
    </div>
  </section>
</main>

<div class="toast" id="toast"></div>

<script>${_loadWebviewAsset('dashboard.js')}</script>
</body></html>`;
    }
}
