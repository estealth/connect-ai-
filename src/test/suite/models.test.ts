import * as assert from 'assert';
import { _classifyModel } from '../../llm/models';

describe('Models Utils Test Suite', () => {
    it('should classify vision models', () => {
        const tiers = _classifyModel('moondream:1.8b');
        assert.ok(tiers.includes('vision'));
        assert.ok(tiers.includes('tiny'));
    });

    it('should classify coder models', () => {
        const tiers = _classifyModel('qwen2.5-coder:7b');
        assert.ok(tiers.includes('coder'));
        assert.ok(tiers.includes('small'));
    });

    it('should correctly extract parameter size and assign tier', () => {
        // llama3.1:8b -> 8b -> small (<=8)
        assert.ok(_classifyModel('llama3.1:8b').includes('small'));
        // gemma2:27b -> 27b -> large (>14)
        assert.ok(_classifyModel('gemma2:27b').includes('large'));
        // phi3:14b -> 14b -> medium (<=14)
        const phiTiers = _classifyModel('phi3:14b');
        assert.ok(phiTiers.includes('medium'), `phi3:14b should be medium, got ${JSON.stringify(phiTiers)}`);
        // llama3.2:3b -> 3b -> tiny (<=3)
        assert.ok(_classifyModel('llama3.2:3b').includes('tiny'));
    });
});
