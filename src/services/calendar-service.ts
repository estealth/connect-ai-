import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { getCompanyDir } from '../paths';
import { _safeReadText } from '../utils/file';
import { TrackerTask } from './types';

export interface CalendarWriteConfig {
  CLIENT_ID?: string;
  CLIENT_SECRET?: string;
  REFRESH_TOKEN?: string;
  CALENDAR_ID?: string;
  DEFAULT_DURATION_MINUTES?: number;
}

export function readCalendarWriteConfig(): CalendarWriteConfig {
    const p = path.join(getCompanyDir(), '_agents', 'secretary', 'tools', 'google_calendar_write.json');
    const txt = _safeReadText(p);
    try { return JSON.parse(txt || '{}'); } catch { return {}; }
}

export function writeCalendarWriteConfig(cfg: Partial<CalendarWriteConfig>) {
    const p = path.join(getCompanyDir(), '_agents', 'secretary', 'tools', 'google_calendar_write.json');
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const cur = readCalendarWriteConfig();
    fs.writeFileSync(p, JSON.stringify({ ...cur, ...cfg }, null, 2));
}

export function isCalendarWriteConnected(): boolean {
    const c = readCalendarWriteConfig();
    return !!(c.CLIENT_ID && c.CLIENT_SECRET && c.REFRESH_TOKEN);
}

async function _getCalendarAccessToken(): Promise<string | null> {
    const c = readCalendarWriteConfig();
    if (!c.CLIENT_ID || !c.CLIENT_SECRET || !c.REFRESH_TOKEN) return null;
    try {
        const res = await axios.post(
            'https://oauth2.googleapis.com/token',
            new URLSearchParams({
                client_id: c.CLIENT_ID,
                client_secret: c.CLIENT_SECRET,
                refresh_token: c.REFRESH_TOKEN,
                grant_type: 'refresh_token',
            }).toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 12000,
                validateStatus: () => true,
            }
        );
        if (res.status >= 200 && res.status < 300 && res.data?.access_token) {
            return String(res.data.access_token);
        }
        return null;
    } catch { return null; }
}

export async function createCalendarEventForTask(task: TrackerTask): Promise<string | null> {
    if (!task.dueAt) return null;
    const access = await _getCalendarAccessToken();
    if (!access) return null;
    const cfg = readCalendarWriteConfig();
    const calendarId = (cfg.CALENDAR_ID || 'primary').trim() || 'primary';
    const dur = Number(cfg.DEFAULT_DURATION_MINUTES) > 0 ? Number(cfg.DEFAULT_DURATION_MINUTES) : 60;
    
    let startIso: string;
    let endIso: string;
    if (/^\d{4}-\d{2}-\d{2}$/.test(task.dueAt)) {
        const start = new Date(task.dueAt + 'T09:00:00');
        const end = new Date(start.getTime() + dur * 60_000);
        startIso = start.toISOString();
        endIso = end.toISOString();
    } else {
        try {
            const start = new Date(task.dueAt);
            const end = new Date(start.getTime() + dur * 60_000);
            startIso = start.toISOString();
            endIso = end.toISOString();
        } catch { return null; }
    }

    const body = {
        summary: task.title.slice(0, 200),
        description: (task.description || '') + `\n\n📋 추적 ID: ${task.id}\n생성: 비서(Secretary)`,
        start: { dateTime: startIso },
        end: { dateTime: endIso },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 5 }, { method: 'popup', minutes: 60 }] },
    };

    try {
        const res = await axios.post(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            body,
            {
                headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
                timeout: 12000,
                validateStatus: () => true,
            }
        );
        return (res.status >= 200 && res.status < 300 && res.data?.id) ? String(res.data.id) : null;
    } catch { return null; }
}

export async function updateCalendarEventForTask(task: TrackerTask): Promise<boolean> {
    if (!task.calendarEventId) return false;
    const access = await _getCalendarAccessToken();
    if (!access) return false;
    const cfg = readCalendarWriteConfig();
    const calendarId = (cfg.CALENDAR_ID || 'primary').trim() || 'primary';
    const dur = Number(cfg.DEFAULT_DURATION_MINUTES) > 0 ? Number(cfg.DEFAULT_DURATION_MINUTES) : 60;
    
    const body: any = {
        summary: (task.status === 'done' ? '✅ ' : task.status === 'cancelled' ? '✖️ ' : '') + task.title.slice(0, 200),
        description: (task.description || '') + `\n\n📋 추적 ID: ${task.id}\n상태: ${task.status}\n수정: 비서(Secretary)`,
    };
    
    if (task.dueAt) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(task.dueAt)) {
            const start = new Date(task.dueAt + 'T09:00:00');
            const end = new Date(start.getTime() + dur * 60_000);
            body.start = { dateTime: start.toISOString() };
            body.end = { dateTime: end.toISOString() };
        } else {
            try {
                const start = new Date(task.dueAt);
                const end = new Date(start.getTime() + dur * 60_000);
                body.start = { dateTime: start.toISOString() };
                body.end = { dateTime: end.toISOString() };
            } catch { /* skip */ }
        }
    }
    
    try {
        const r = await axios.patch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(task.calendarEventId)}`,
            body,
            {
                headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
                timeout: 12000, validateStatus: () => true,
            }
        );
        return r.status >= 200 && r.status < 300;
    } catch { return false; }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
    if (!eventId) return false;
    const access = await _getCalendarAccessToken();
    if (!access) return false;
    const cfg = readCalendarWriteConfig();
    const calendarId = (cfg.CALENDAR_ID || 'primary').trim() || 'primary';
    try {
        const r = await axios.delete(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            {
                headers: { Authorization: `Bearer ${access}` },
                timeout: 12000, validateStatus: () => true,
            }
        );
        return r.status >= 200 && r.status < 300;
    } catch { return false; }
}

export async function patchCalendarEvent(eventId: string, opts: {
    title?: string;
    startIso?: string;
    endIso?: string;
    description?: string;
    location?: string;
}): Promise<{ eventId: string; htmlLink?: string; startIso: string; endIso: string } | null> {
    if (!eventId) return null;
    const access = await _getCalendarAccessToken();
    if (!access) return null;
    const cfg = readCalendarWriteConfig();
    const calendarId = (cfg.CALENDAR_ID || 'primary').trim() || 'primary';
    const body: any = {};
    if (opts.title) body.summary = opts.title.slice(0, 200);
    if (opts.location) body.location = opts.location.slice(0, 200);
    if (opts.description) body.description = `${opts.description}\n\n수정: 비서(Secretary)`;
    if (opts.startIso) {
        const s = new Date(opts.startIso);
        if (!isNaN(s.getTime())) body.start = { dateTime: s.toISOString() };
    }
    if (opts.endIso) {
        const e = new Date(opts.endIso);
        if (!isNaN(e.getTime())) body.end = { dateTime: e.toISOString() };
    }
    try {
        const r = await axios.patch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            body,
            {
                headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
                timeout: 12000, validateStatus: () => true,
            }
        );
        if (r.status >= 200 && r.status < 300 && r.data?.id) {
            return {
                eventId: r.data.id,
                htmlLink: r.data.htmlLink,
                startIso: r.data.start?.dateTime || r.data.start?.date || '',
                endIso: r.data.end?.dateTime || r.data.end?.date || '',
            };
        }
        return null;
    } catch { return null; }
}
