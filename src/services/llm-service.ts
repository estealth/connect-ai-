import axios from 'axios';
import { getConfig, _isLMStudioEngine } from '../utils/config';

export class LlmService {
    public static async quickLLMCall(systemPrompt: string, userMsg: string, maxTokens = 64): Promise<string> {
        const config = getConfig();
        const isLMStudio = _isLMStudioEngine(config.ollamaBase);
        let base = config.ollamaBase;
        if (base.endsWith('/')) base = base.slice(0, -1);
        if (isLMStudio && !base.endsWith('/v1')) base += '/v1';
        const targetUrl = isLMStudio ? base + '/chat/completions' : base + '/api/chat';

        const payload = {
            model: config.defaultModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMsg }
            ],
            stream: false,
            options: { num_predict: maxTokens }
        };

        try {
            const res = await axios.post(targetUrl, payload, { timeout: config.timeout });
            if (isLMStudio) {
                return res.data?.choices?.[0]?.message?.content || '';
            } else {
                return res.data?.message?.content || '';
            }
        } catch (e: any) {
            console.error('[quickLLMCall] failed:', e?.message || e);
            throw e;
        }
    }
}
