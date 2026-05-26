import * as vscode from 'vscode';
import * as path from 'path';
import { getCompanyDir, getConversationsDir } from '../paths';
import { _safeReadText, _safeWriteText } from '../utils/file';
import { getExtensionContext } from '../core/context';
import { readTelegramConfig, sendTelegramReport } from '../utils/telegram';
import { CompanyService } from './company-service';
import { TrackerService } from './tracker-service';
import { ConversationService } from './conversation-service';

export interface ReportScheduleEntry {
    id: string;
    type: 'daily_brief' | 'weekly_summary' | 'performance_report';
    time: string;
    days?: number[];
    enabled: boolean;
}

export class NotificationService {
    private static _instance: NotificationService;
    private _dailyBriefingTimer: NodeJS.Timeout | null = null;
    private readonly _DAILY_BRIEFING_KEY = 'dailyBriefingLastSentDate';

    private constructor() {}

    public static getInstance(): NotificationService {
        if (!NotificationService._instance) {
            NotificationService._instance = new NotificationService();
        }
        return NotificationService._instance;
    }

    public readReportSchedule(): { entries: ReportScheduleEntry[] } {
        const p = path.join(getCompanyDir(), '_shared', 'report_schedule.json');
        try {
            const d = JSON.parse(_safeReadText(p) || '{"entries":[]}');
            return Array.isArray(d.entries) ? d : { entries: [] };
        } catch { return { entries: [] }; }
    }

    public writeReportSchedule(s: { entries: ReportScheduleEntry[] }) {
        const p = path.join(getCompanyDir(), '_shared', 'report_schedule.json');
        _safeWriteText(p, JSON.stringify(s, null, 2));
    }

    public startDailyBriefingLoop() {
        if (this._dailyBriefingTimer) return;
        this._dailyBriefingTimer = setInterval(() => this.runDailyBriefingOnce(), 60 * 1000);
    }

    private _parseBriefingTime(raw: string): { hour: number; minute: number } | null {
        if (!raw || raw.trim() === '' || raw.trim().toLowerCase() === 'off') return null;
        const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return null;
        const hour = parseInt(m[1], 10);
        const minute = parseInt(m[2], 10);
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
        return { hour, minute };
    }

    public async runDailyBriefingOnce(force = false): Promise<void> {
        try {
            const cfg = vscode.workspace.getConfiguration('shinAi');
            const timeStr = cfg.get<string>('dailyBriefingTime') || '09:00';
            const time = this._parseBriefingTime(timeStr);
            if (!time && !force) return;

            if (time && !force) {
                const now = new Date();
                if (now.getHours() !== time.hour || now.getMinutes() !== time.minute) return;
            }

            const { token, chatId } = readTelegramConfig();
            if (!token || !chatId) return;

            const today = new Date().toISOString().slice(0, 10);
            const ctx = getExtensionContext();
            const lastSent = ctx?.globalState.get<string>(this._DAILY_BRIEFING_KEY, '');
            if (!force && lastSent === today) return;

            const companyService = CompanyService.getInstance();
            const trackerService = TrackerService.getInstance();
            const conversationService = ConversationService.getInstance();

            const company = companyService.readCompanyName() || '1인 기업';
            const dateStr = new Date().toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            let calBlock = '';
            try {
                const cal = _safeReadText(path.join(getCompanyDir(), '_shared', 'calendar_cache.md')).trim();
                if (cal) {
                    const calLines = cal.split('\n').filter(l => l.trim().startsWith('-')).slice(0, 6);
                    if (calLines.length > 0) calBlock = `\n*📅 오늘 일정*\n${calLines.join('\n')}\n`;
                }
            } catch { /* ignore */ }
            if (!calBlock) calBlock = '\n*📅 오늘 일정*\n_등록된 일정이 없어요._\n';

            const taskBlock = `\n*✅ 우선순위 할 일 (상위 5)*\n${trackerService.trackerToMarkdown({ onlyOpen: true, max: 5 })}\n`;
            
            let yhBlock = '';
            try {
                const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                const txt = _safeReadText(path.join(getConversationsDir(), `${yest}.md`));
                if (txt.trim()) yhBlock = `\n*📝 어제 회사 활동 (요약 컨텍스트)*\n${txt.slice(-700)}\n`;
            } catch { /* ignore */ }

            const body = `🌅 *${company} — 아침 브리핑*\n_${dateStr}_\n${calBlock}${taskBlock}${yhBlock}\n_명령: \`/today\` 다시 보기 · \`/tools\` 도구 상태_`;
            await sendTelegramReport(body);
            
            if (ctx) ctx.globalState.update(this._DAILY_BRIEFING_KEY, today);
            
            conversationService.appendConversationLog({ speaker: '비서', emoji: '🌅', section: '데일리 브리핑', body: body.slice(0, 1000) });
        } catch (e) {
            console.error('[NotificationService] briefing failed:', e);
        }
    }
}
