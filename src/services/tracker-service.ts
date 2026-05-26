import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TrackerTask, TaskPriority } from './types';
import { getCompanyDir } from '../paths';
import { _safeReadText, _safeWriteText } from '../utils/file';
import { isCalendarWriteConnected, deleteCalendarEvent, updateCalendarEventForTask } from './calendar-service';
import { sendTelegramReport } from '../utils/telegram';
import { AGENTS } from '../agents';

const _NUDGE_WINDOW_MS = 24 * 60 * 60 * 1000;

export class TrackerService {
    private static _instance: TrackerService;
    private _trackerChangeEmitter = new vscode.EventEmitter<void>();
    public readonly onTrackerChanged = this._trackerChangeEmitter.event;

    private _trackerNudgeTimer: NodeJS.Timeout | null = null;
    private _recurrenceTimer: NodeJS.Timeout | null = null;
    private _preAlarmTimer: NodeJS.Timeout | null = null;

    private constructor() {}

    public static getInstance(): TrackerService {
        if (!TrackerService._instance) {
            TrackerService._instance = new TrackerService();
        }
        return TrackerService._instance;
    }

    public readTracker(): { tasks: TrackerTask[] } {
        const p = path.join(getCompanyDir(), 'tracker.json');
        const txt = _safeReadText(p);
        try {
            const data = JSON.parse(txt || '{"tasks":[]}');
            return Array.isArray(data.tasks) ? data : { tasks: [] };
        } catch { return { tasks: [] }; }
    }

    public writeTracker(t: { tasks: TrackerTask[] }) {
        const p = path.join(getCompanyDir(), 'tracker.json');
        _safeWriteText(p, JSON.stringify(t, null, 2));
        this._trackerChangeEmitter.fire();
    }

    public addTrackerTask(partial: Partial<TrackerTask> & { title: string; owner: TrackerTask['owner'] }): TrackerTask {
        const t = this.readTracker();
        const newTask: TrackerTask = {
            id: Math.random().toString(36).substring(2, 11),
            createdAt: new Date().toISOString(),
            status: 'pending',
            ...partial
        };
        t.tasks.push(newTask);
        this.writeTracker(t);
        return newTask;
    }

    public updateTrackerTask(id: string, patch: Partial<TrackerTask>): TrackerTask | null {
        const t = this.readTracker();
        const idx = t.tasks.findIndex(x => x.id === id);
        if (idx < 0) return null;
        const prev = t.tasks[idx];
        t.tasks[idx] = { ...prev, ...patch };
        const cur = t.tasks[idx];
        if ((patch.status === 'done' || patch.status === 'cancelled') && !cur.completedAt) {
            cur.completedAt = new Date().toISOString();
        }
        this.writeTracker(t);

        if (cur.calendarEventId && isCalendarWriteConnected()) {
            const becameCancelled = patch.status === 'cancelled' && prev.status !== 'cancelled';
            const titleOrDueChanged = (patch.title && patch.title !== prev.title) || (patch.dueAt && patch.dueAt !== prev.dueAt);
            const becameDone = patch.status === 'done' && prev.status !== 'done';
            if (becameCancelled) {
                deleteCalendarEvent(cur.calendarEventId).then(ok => {
                    if (ok) this.updateTrackerTask(cur.id, { calendarEventId: undefined });
                }).catch(() => { /* silent */ });
            } else if (becameDone || titleOrDueChanged) {
                updateCalendarEventForTask(cur).catch(() => { /* silent */ });
            }
        }
        return t.tasks[idx];
    }

    public coercePriority(v: unknown): TaskPriority {
        const s = String(v || '').toLowerCase();
        if (s === 'urgent' || s === 'high' || s === 'medium' || s === 'low') return s as TaskPriority;
        return 'medium';
    }

    public formatDueLabel(iso: string): string {
        try {
            if (!iso) return '';
            const d = new Date(iso);
            if (isNaN(d.getTime())) return iso;
            const now = new Date();
            const diff = d.getTime() - now.getTime();
            const days = Math.floor(diff / 86400000);
            if (days === 0) return '오늘';
            if (days === 1) return '내일';
            if (days < 0) return `${Math.abs(days)}일 전`;
            return `${days}일 후`;
        } catch { return iso; }
    }

    public trackerToMarkdown(opts: { onlyOpen?: boolean; max?: number } = {}): string {
        const t = this.readTracker();
        let tasks = t.tasks;
        if (opts.onlyOpen) {
            tasks = tasks.filter(x => x.status !== 'done' && x.status !== 'cancelled');
        }
        const PRIO_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        tasks.sort((a, b) => PRIO_ORDER[this.coercePriority(a.priority)] - PRIO_ORDER[this.coercePriority(b.priority)]);
        if (opts.max) tasks = tasks.slice(0, opts.max);
        
        return tasks.map(tk => {
            const ag = (tk.agentIds || []).map(id => AGENTS[id]?.emoji || '🤖').join('');
            const prio = tk.priority === 'urgent' ? '🚨' : tk.priority === 'high' ? '🔥' : '';
            const due = tk.dueAt ? ` (due: ${this.formatDueLabel(tk.dueAt)})` : '';
            return `- [${tk.status === 'done' ? 'x' : ' '}] ${prio}${ag} ${tk.title}${due}`;
        }).join('\n');
    }

    public startTrackerNudgeLoop() {
        if (this._trackerNudgeTimer) return;
        const runOnce = async () => {
            try {
                const tracker = this.readTracker();
                const now = Date.now();
                let changed = false;
                const nudges: string[] = [];
                for (const t of tracker.tasks) {
                    if (t.status === 'done' || t.status === 'cancelled') continue;
                    if (t.owner !== 'user' && t.owner !== 'mixed') continue;
                    const lastNudge = (t as any)._lastNudgeAt ? new Date((t as any)._lastNudgeAt).getTime() : 0;
                    if (now - lastNudge < _NUDGE_WINDOW_MS) continue;
                    const ageDays = (now - new Date(t.createdAt).getTime()) / 86_400_000;
                    const overdue = t.dueAt && new Date(t.dueAt).getTime() < now;
                    if (!overdue && ageDays < 1) continue;
                    nudges.push(`• \`${t.id.slice(-9)}\` ${t.title}${t.dueAt ? ` ⏰${t.dueAt.slice(0, 10)}` : ''}${overdue ? ' 🔴' : ''}`);
                    (t as any)._lastNudgeAt = new Date().toISOString();
                    t.nudges = (t.nudges || 0) + 1;
                    changed = true;
                }
                if (changed) this.writeTracker(tracker);
                if (nudges.length > 0) {
                    const body = `👀 *비서: 확인해주세요*\n\n진행되지 않은 사용자 작업이 있어요:\n\n${nudges.slice(0, 8).join('\n')}\n\n_완료: \`/done <id>\` · 취소: \`/cancel <id>\`_`;
                    await sendTelegramReport(body);
                }
            } catch { /* silent */ }
        };
        setTimeout(runOnce, 5 * 60 * 1000);
        this._trackerNudgeTimer = setInterval(runOnce, 60 * 60 * 1000);
    }

    public startRecurrenceLoop() {
        if (this._recurrenceTimer) return;
        const runOnce = () => {
            try {
                const tracker = this.readTracker();
                const now = Date.now();
                let anySpawned = false;
                for (const t of tracker.tasks) {
                    if (!t.recurrence) continue;
                    if (t.status === 'cancelled') continue;
                    if (!t.nextRunAt) {
                        const baseline = new Date(t.createdAt);
                        t.nextRunAt = this._computeNextRunAt(baseline, t.recurrence).toISOString();
                        continue;
                    }
                    const due = new Date(t.nextRunAt).getTime();
                    if (now < due) continue;
                    this.addTrackerTask({
                        title: t.title,
                        description: t.description,
                        owner: t.owner,
                        agentIds: t.agentIds,
                        priority: this.coercePriority(t.priority),
                        dueAt: t.nextRunAt,
                        status: t.owner === 'agent' ? 'in_progress' : 'pending',
                    });
                    let advance = new Date(t.nextRunAt);
                    while (advance.getTime() <= now) {
                        advance = this._computeNextRunAt(advance, t.recurrence);
                    }
                    t.nextRunAt = advance.toISOString();
                    anySpawned = true;
                }
                if (anySpawned) this.writeTracker(tracker);
            } catch { /* silent */ }
        };
        this._recurrenceTimer = setInterval(runOnce, 60 * 1000);
    }

    private _computeNextRunAt(prev: Date, cadence: 'daily' | 'weekly' | 'monthly'): Date {
        const next = new Date(prev.getTime());
        if (cadence === 'daily') next.setDate(next.getDate() + 1);
        else if (cadence === 'weekly') next.setDate(next.getDate() + 7);
        else if (cadence === 'monthly') next.setMonth(next.getMonth() + 1);
        return next;
    }

    public startPreAlarmLoop() {
        if (this._preAlarmTimer) return;
        const WINDOWS = [
            { key: 't1d', ms: 24 * 60 * 60_000, label: '내일' },
            { key: 't1h', ms:  1 * 60 * 60_000, label: '1시간 후' },
        ];
        const runOnce = async () => {
            try {
                const tracker = this.readTracker();
                const now = Date.now();
                let changed = false;
                const lines: string[] = [];
                for (const t of tracker.tasks) {
                    if (t.status === 'done' || t.status === 'cancelled') continue;
                    if (!t.dueAt) continue;
                    const due = new Date(t.dueAt).getTime();
                    if (isNaN(due) || due < now) continue;
                    const remaining = due - now;
                    const sent = t.preAlarmsSent || [];
                    for (const w of WINDOWS) {
                        if (sent.includes(w.key)) continue;
                        if (remaining <= w.ms) {
                            const a = (t.agentIds && t.agentIds[0]) ? AGENTS[t.agentIds[0]] : null;
                            const owner = a ? `${a.emoji} ${a.name}` : (t.owner === 'user' ? '👤 사용자' : '🤖 에이전트');
                            lines.push(`• ⏰${w.label} \`${t.id.slice(-9)}\` ${owner}: ${t.title}`);
                            sent.push(w.key);
                            t.preAlarmsSent = sent;
                            changed = true;
                        }
                    }
                }
                if (changed) this.writeTracker(tracker);
                if (lines.length > 0) {
                    const body = `🔔 *사전 알림*\n\n${lines.slice(0, 8).join('\n')}\n\n_미루기: \`/reschedule <id> <시간>\` · 완료: \`/done <id>\`_`;
                    await sendTelegramReport(body);
                }
            } catch { /* silent */ }
        };
        setTimeout(runOnce, 2 * 60 * 1000);
        this._preAlarmTimer = setInterval(runOnce, 60 * 60 * 1000);
    }
}
