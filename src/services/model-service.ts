import axios from 'axios';
import * as vscode from 'vscode';
import { getConfig, _isLMStudioEngine } from '../utils/config';
import { getSystemSpecs, estimateModelMemoryGB } from '../system-specs';
import { AGENTS, AGENT_ORDER } from '../agents';

export class ModelService {
    public static async listInstalledModels(): Promise<{ id: string; backend: 'ollama' | 'lmstudio' }[]> {
        const out: { id: string; backend: 'ollama' | 'lmstudio' }[] = [];
        const { ollamaBase } = getConfig();
        const isLMStudio = _isLMStudioEngine(ollamaBase);

        const queryOllama = async () => {
            try {
                const r = await axios.get('http://127.0.0.1:11434/api/tags', { timeout: 1500 });
                const models = r.data?.models || [];
                for (const m of models) if (m?.name) out.push({ id: m.name, backend: 'ollama' });
            } catch { /* ignore */ }
        };

        const queryLMStudio = async () => {
            try {
                const r = await axios.get('http://127.0.0.1:1234/v1/models', { timeout: 1500 });
                const models = r.data?.data || [];
                for (const m of models) if (m?.id) out.push({ id: m.id, backend: 'lmstudio' });
            } catch { /* ignore */ }
        };

        if (isLMStudio) {
            await queryLMStudio();
            if (out.length === 0) await queryOllama();
        } else {
            await queryOllama();
        }
        return out;
    }

    public static autoOrchestrateModelMap(installed: { id: string; backend: string }[]): Record<string, string> {
        const specs = getSystemSpecs();
        const map: Record<string, string> = {};
        const sorted = [...installed].sort((a, b) => estimateModelMemoryGB(b.id) - estimateModelMemoryGB(a.id));
        
        const big = sorted.find(m => estimateModelMemoryGB(m.id) > 10 && estimateModelMemoryGB(m.id) <= specs.safeModelBudgetGB);
        const mid = sorted.find(m => estimateModelMemoryGB(m.id) > 5 && estimateModelMemoryGB(m.id) <= Math.min(10, specs.safeModelBudgetGB));
        const small = sorted.find(m => estimateModelMemoryGB(m.id) <= 5);

        for (const aid of AGENT_ORDER) {
            if (aid === 'ceo' || aid === 'developer' || aid === 'business') {
                if (big) map[aid] = big.id;
                else if (mid) map[aid] = mid.id;
            } else {
                if (mid) map[aid] = mid.id;
                else if (small) map[aid] = small.id;
            }
        }
        return map;
    }

    public static maybeRecommendCoderModel(webview: vscode.Webview) {
        const specs = getSystemSpecs();
        if (specs.totalRamGB >= 32) {
            webview.postMessage({ type: 'recommendModel', agentId: 'developer', modelId: 'qwen2.5-coder:14b', reason: '시니어 코더 모델 (강력 추천)' });
        } else if (specs.totalRamGB >= 16) {
            webview.postMessage({ type: 'recommendModel', agentId: 'developer', modelId: 'qwen2.5-coder:7b', reason: '균형 잡힌 코더 모델' });
        }
    }
}
