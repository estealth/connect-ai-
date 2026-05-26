import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { getConfig, _isLMStudioEngine } from '../utils/config';

export function auditLLMCost(modelName: string, promptTokens: number, completionTokens: number, durationMs: number): void {
    const logPath = path.join(__dirname, '../../cost_log.csv');
    const timestamp = new Date().toISOString();
    
    // 로컬 Ollama 구동 시 하드웨어 요금은 0원 처리
    const costKRW = modelName.includes('gemini') ? (promptTokens * 0.001) /* 예시 클라우드 환산 요금 */ : 0;
    
    const logLine = `${timestamp},${modelName},${promptTokens},${completionTokens},${durationMs}ms,${costKRW}KRW\n`;
    
    // 파일이 없으면 헤더 생성 후 누적 적립
    if (!fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, 'Timestamp,Model,PromptTokens,CompletionTokens,Duration,Cost\n', 'utf-8');
    }
    fs.appendFileSync(logPath, logLine, 'utf-8');
    console.log(`⚙️ [Audit] ${modelName} 로그 적립 완료. 총 토큰: ${promptTokens + completionTokens}`);
}

export async function _quickLLMCall(systemPrompt: string, userMsg: string, maxTokens = 64): Promise<string> {
    const { ollamaBase, defaultModel, timeout } = getConfig();
    const isLMStudio = _isLMStudioEngine(ollamaBase);
    const apiUrl = isLMStudio ? `${ollamaBase}/v1/chat/completions` : `${ollamaBase}/api/chat`;
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg }
    ];
    const tmo = Math.min(timeout || 60000, 60000);
    const startMs = Date.now();
    if (isLMStudio) {
        const body = { model: defaultModel, messages, stream: false, max_tokens: maxTokens, temperature: 0.2 };
        const r = await axios.post(apiUrl, body, { timeout: tmo });
        const durationMs = Date.now() - startMs;
        const promptTokens = r.data?.usage?.prompt_tokens || 0;
        const completionTokens = r.data?.usage?.completion_tokens || 0;
        auditLLMCost(defaultModel, promptTokens, completionTokens, durationMs);
        return r.data?.choices?.[0]?.message?.content?.toString().trim() || '';
    }
    const body = { model: defaultModel, messages, stream: false, options: { num_predict: maxTokens, temperature: 0.2 } };
    const r = await axios.post(apiUrl, body, { timeout: tmo });
    const durationMs = Date.now() - startMs;
    const promptTokens = r.data?.prompt_eval_count || 0;
    const completionTokens = r.data?.eval_count || 0;
    auditLLMCost(defaultModel, promptTokens, completionTokens, durationMs);
    return r.data?.message?.content?.toString().trim() || '';
}

/**
 * 추후 extension.ts 내의 인라인 스트리밍 로직 대체를 위한 뼈대 함수입니다.
 */
export async function streamLLMCall(
    systemPrompt: string, 
    userMsg: string, 
    onChunk: (text: string) => void,
    abortSignal?: AbortSignal
): Promise<string> {
    // TODO: implement streaming abstraction here
    throw new Error('Not implemented yet');
}
