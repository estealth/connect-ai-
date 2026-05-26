import * as assert from 'assert';
import { classifyGitError, validateGitRemoteUrl } from '../../utils/git';

describe('Git Utils Test Suite', () => {
    it('should validate git remote urls', () => {
        assert.strictEqual(validateGitRemoteUrl('https://github.com/user/repo.git'), null);
        assert.strictEqual(validateGitRemoteUrl('git@github.com:user/repo.git'), null);
        assert.ok(typeof validateGitRemoteUrl('invalid-url') === 'string'); // returns error message
    });

    it('should classify git errors correctly', () => {
        assert.strictEqual(classifyGitError('permission denied').kind, 'auth');
        assert.strictEqual(classifyGitError('could not resolve host').kind, 'network');
        assert.strictEqual(classifyGitError('merge conflict in test.txt').kind, 'conflict');
        assert.strictEqual(classifyGitError('fetch first, non-fast-forward').kind, 'rejected');
        assert.strictEqual(classifyGitError('unknown error').kind, 'unknown');
    });
});
