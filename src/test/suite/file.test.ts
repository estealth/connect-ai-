import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import { _resolveFlexiblePath, _globToRegex, _renderUnifiedDiff } from '../../utils/file';

describe('File Utils Test Suite', () => {
    it('should correctly convert glob to regex', () => {
        const re = _globToRegex('*.ts');
        assert.ok(re.test('test.ts'));
        assert.ok(!re.test('test.js'));
        assert.ok(!re.test('dir/test.ts')); // * should not match across dirs in this impl

        const re2 = _globToRegex('**/*.ts');
        assert.ok(re2.test('dir/test.ts'));
        assert.ok(re2.test('a/b/c/test.ts'));
    });

    it('should block system paths in _resolveFlexiblePath', () => {
        const root = os.platform() === 'win32' ? 'C:\\my\\project' : '/my/project/root';
        const sysPath = os.platform() === 'win32' ? 'C:\\Windows\\System32\\cmd.exe' : '/etc/passwd';
        const result = _resolveFlexiblePath(sysPath, root);
        assert.ok(result !== null);
        assert.ok(result.reason !== undefined);
        assert.ok(result.reason.includes('시스템 보호 경로'));
    });

    it('should render unified diff correctly', () => {
        const before = 'line 1\nline 2\nline 3';
        const after = 'line 1\nline 2 modified\nline 3';
        const diff = _renderUnifiedDiff('test.txt', before, after, 1);
        assert.ok(diff.includes('-line 2'));
        assert.ok(diff.includes('+line 2 modified'));
    });
});
