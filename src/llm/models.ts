import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { getCompanyDir } from '../paths';
import { getSystemSpecs, estimateModelMemoryGB } from '../system-specs';
import { getConfig, _isLMStudioEngine } from '../utils/config';

export function _agentModelsPath(): string {
  return path.join(getCompanyDir(), '_shared', 'agent_models.json');
}

export function readAgentModelMap(): Record<string, string> {
  try {
    const p = _agentModelsPath();
    if (!fs.existsSync(p)) return {};
    const data = JSON.parse(fs.readFileSync(p, 'utf-8') || '{}');
    return (data && typeof data === 'object') ? data : {};
  } catch { return {}; }
}

export function writeAgentModelMap(map: Record<string, string>) {
  try {
    const p = _agentModelsPath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(map, null, 2));
  } catch (e: any) {
    console.warn('[agentModels] write failed:', e?.message || e);
  }
}

export function getAgentModel(agentId: string, fallback: string): string {
  const map = readAgentModelMap();
  return (map[agentId] || '').trim() || fallback;
}

export function getAgentModelOrDefault(agentId: string): string {
  const { defaultModel } = getConfig();
  return getAgentModel(agentId, defaultModel || '');
}

export type ModelTier = 'tiny' | 'small' | 'medium' | 'large' | 'vision' | 'coder';

export function _classifyModel(modelId: string): ModelTier[] {
  const id = modelId.toLowerCase();
  const tiers: ModelTier[] = [];
  if (/vision|llava|vl\b|glm.*v|gemma.?4.*e|qwen.?2.?vl|moondream/i.test(id)) tiers.push('vision');
  if (/coder|code-?(?:llama|qwen)/i.test(id)) tiers.push('coder');
  const paramM = id.match(/(\d+(?:\.\d+)?)\s*b\b/);
  let paramB = paramM ? parseFloat(paramM[1]) : 0;
  const moeM = id.match(/a(\d+(?:\.\d+)?)b/);
  if (moeM) paramB = parseFloat(moeM[1]);
  const isExplicitlyTiny = /lfm2\.?5|gemma.?4.?e2b|phi-?3-mini|llama.?3\.?2.?(?:1b|3b)|qwen.?2\.?5.?(?:0\.5b|1\.5b|3b)/i.test(id);
  if (isExplicitlyTiny || (paramB > 0 && paramB <= 3)) tiers.push('tiny');
  else if (paramB <= 8) tiers.push('small');
  else if (paramB <= 14) tiers.push('medium');
  else if (paramB > 14) tiers.push('large');
  else tiers.push('small');
  return tiers;
}

export function _autoOrchestrateModelMap(installed: { id: string; backend: string }[]): Record<string, string> {
  if (installed.length === 0) return {};
  const specs = getSystemSpecs();
  const safeInstalled = installed.filter(m => {
    const need = estimateModelMemoryGB(m.id);
    return need <= specs.safeModelBudgetGB;
  });
  const candidates = safeInstalled.length > 0 ? safeInstalled : (
    installed.length > 0
      ? [installed.slice().sort((a, b) => estimateModelMemoryGB(a.id) - estimateModelMemoryGB(b.id))[0]]
      : []
  );
  const byTier: Record<ModelTier, string[]> = { tiny: [], small: [], medium: [], large: [], vision: [], coder: [] };
  for (const m of candidates) {
    const tiers = _classifyModel(m.id);
    for (const t of tiers) byTier[t].push(m.id);
  }
  const ROLE_PREFERENCES: Record<string, ModelTier[]> = {
    ceo: ['tiny', 'small', 'medium'],
    secretary: ['small', 'tiny', 'medium'],
    youtube: ['large', 'medium', 'small'],
    researcher: ['large', 'medium', 'small'],
    business: ['medium', 'large', 'small'],
    writer: ['medium', 'small', 'large'],
    editor: ['medium', 'small'],
    designer: ['vision', 'medium', 'small'],
    developer: ['coder', 'large', 'medium'],
    instagram: ['medium', 'small'],
  };
  const map: Record<string, string> = {};
  for (const agentId of Object.keys(ROLE_PREFERENCES)) {
    const prefs = ROLE_PREFERENCES[agentId];
    for (const tier of prefs) {
      const candidates = byTier[tier];
      if (candidates && candidates.length > 0) {
        map[agentId] = candidates[0];
        break;
      }
    }
  }
  return map;
}

export async function listInstalledModels(): Promise<{ id: string; backend: 'ollama' | 'lmstudio' }[]> {
  const out: { id: string; backend: 'ollama' | 'lmstudio' }[] = [];
  const { ollamaBase } = getConfig();
  const isLMStudio = _isLMStudioEngine(ollamaBase);
  const queryOllama = async () => {
    try {
      const r = await axios.get('http://127.0.0.1:11434/api/tags', { timeout: 1500 });
      const models = r.data?.models || [];
      for (const m of models) {
        if (m?.name) out.push({ id: m.name, backend: 'ollama' });
      }
    } catch { /* ollama not running */ }
  };
  const queryLMStudio = async () => {
    try {
      const r = await axios.get('http://127.0.0.1:1234/v1/models', { timeout: 1500 });
      const models = r.data?.data || [];
      for (const m of models) {
        if (m?.id) out.push({ id: m.id, backend: 'lmstudio' });
      }
    } catch { /* LM Studio not running */ }
  };
  if (isLMStudio) {
    await queryLMStudio();
    if (out.length === 0) await queryOllama();
  } else {
    await queryOllama();
    if (out.length === 0) await queryLMStudio();
  }
  return out;
}
