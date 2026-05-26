import * as vscode from 'vscode';

export interface DisplayMessage {
    text: string;
    role: string;
    profileImage?: string;
}

export interface ChatHistoryItem {
    role: string;
    content: string;
}

export interface ChatSession {
    id: string;
    title: string;
    preview: string;
    workspace: string;
    workspaceName: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    chat: ChatHistoryItem[];
    display: DisplayMessage[];
}

export interface CompanyState {
    companyDir: string;
    companyName: string;
    hiredAgents: string[];
    activeAgents: string[];
    isConfigured: boolean;
    companyDay: number;
    worldLayout: any;
    deskPositions: any;
    githubUrl: string | null;
    fileCount: number | null;
    lastSync: string | null;
    syncing: boolean;
}

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface TrackerTask {
  id: string;
  title: string;
  description?: string;
  owner: 'agent' | 'user' | 'mixed';
  agentIds?: string[];
  createdAt: string;
  dueAt?: string;
  status: 'pending' | 'in_progress' | 'done' | 'cancelled';
  completedAt?: string;
  sessionDir?: string;
  nudges?: number; 
  evidence?: string;
  calendarEventId?: string; 
  priority?: TaskPriority; 
  recurrence?: 'daily' | 'weekly' | 'monthly';
  nextRunAt?: string;
  preAlarmsSent?: string[];
}

export type CorporateMessage = 
    | { type: 'agentPulse'; agent: string; icon: string; ms: number; log?: string }
    | { type: 'agentConfer'; turns: { from: string; to: string; text: string }[] }
    | { type: 'error'; value: string }
    | { type: 'brainInject'; title: string; relPath: string }
    | { type: 'skillInject'; agentId: string; agentName: string; agentEmoji: string; agentColor: string; name: string; displayName: string; description: string }
    | { type: 'graphData'; data: { nodes: any[]; links: any[] }; highlightTitle: string | null }
    | { type: 'agentMapExternallyChanged' }
    | { type: 'statusUpdate'; value: string }
    | { type: 'companyState'; value: CompanyState }
    | { type: 'highlight_node'; note: string }
    | { type: 'agentEnd'; agent: string }
    | { type: 'thinking_start'; prompt?: string }
    | { type: 'context_done'; workspace: boolean; brainCount?: number; web?: boolean }
    | { type: 'brain_read'; note: string }
    | { type: 'answer_start' }
    | { type: 'answer_chunk'; text: string }
    | { type: 'answer_complete'; sources?: any[] }
    | { type: 'multiDispatch'; payload?: any; brief?: string; tasks?: any[] }
    | { type: 'agentBusy'; agentId?: string; agent?: string; task?: string; taskEmoji?: string; elapsedSec?: number }
    | { type: 'agentChunk'; agentId?: string; agent?: string; text?: string; value?: string }
    | { type: 'agentStart'; agent: string; task: string }
    | { type: 'response'; value: string }
    | { type: 'systemNote'; value: string }
    | { type: 'corporateReport'; brief: string; report: string; sessionPath: string; sessionRel: string }
    | { type: 'agentDispatch'; brief: string; tasks: { agent: string; task: string }[]; userPrompt: string };
