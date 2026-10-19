const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_PATH = path.join(__dirname, '..', '.opencode', 'plugins', 'taskflow-check.js');

// Minimal stand-in for Bun's `$` tagged-template shell used by opencode plugins.
function makeShell({ exitCode = 0, stdout = 'pass 21\nfail 0\n', stderr = '' } = {}) {
  const calls = [];
  const shell = (strings) => {
    const node = {
      _cwd: null,
      cwd(dir) { this._cwd = dir; return this; },
      quiet() { return this; },
      nothrow() { return this; },
      then(resolve) {
        calls.push({ cmd: strings.join(''), cwd: this._cwd });
        resolve({ exitCode, stdout: Buffer.from(stdout), stderr: Buffer.from(stderr) });
      },
    };
    return node;
  };
  return { shell, calls };
}

async function loadHook(shellOpts) {
  // Import the ESM plugin through a data: URL. `.opencode/*.js` is ESM, but opencode's
  // generated `.opencode/package.json` (gitignored, so absent on a fresh clone) carries no
  // "type" field — a plain import() would emit a MODULE_TYPELESS_PACKAGE_JSON warning.
  const src = fs.readFileSync(PLUGIN_PATH, 'utf8');
  const mod = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
  const { shell, calls } = makeShell(shellOpts);
  const hooks = await mod.TaskFlowCheck({ $: shell, directory: '/repo', worktree: '/repo' });
  return { hook: hooks['tool.execute.after'], calls };
}

describe('taskflow-check plugin hook', () => {
  it('runs npm test and appends the result after a source edit', async () => {
    const { hook, calls } = await loadHook();
    const output = { title: 'edit', output: 'Edited src/routes/tasks.js', metadata: {} };

    await hook({ tool: 'edit', sessionID: 's', callID: 'c', args: { filePath: '/repo/src/routes/tasks.js' } }, output);

    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].cmd, 'npm test');
    assert.strictEqual(calls[0].cwd, '/repo');
    assert.match(output.output, /taskflow-check/);
    assert.match(output.output, /PASS \(21 passed, 0 failed\)/);
  });

  it('surfaces a failure when the tests fail', async () => {
    const { hook } = await loadHook({ exitCode: 1, stdout: 'fail 1\n', stderr: 'AssertionError: boom' });
    const output = { title: 'write', output: 'Wrote server.js', metadata: {} };

    await hook({ tool: 'write', sessionID: 's', callID: 'c', args: { filePath: '/repo/server.js' } }, output);

    assert.match(output.output, /taskflow-check.*FAIL/);
    assert.match(output.output, /AssertionError: boom/);
  });

  it('ignores edits to non-source files', async () => {
    const { hook, calls } = await loadHook();
    const output = { title: 'edit', output: 'Edited README.md', metadata: {} };

    await hook({ tool: 'edit', sessionID: 's', callID: 'c', args: { filePath: '/repo/README.md' } }, output);

    assert.strictEqual(calls.length, 0);
    assert.strictEqual(output.output, 'Edited README.md');
  });

  it('ignores non-editing tools', async () => {
    const { hook, calls } = await loadHook();
    const output = { title: 'read', output: 'file contents', metadata: {} };

    await hook({ tool: 'read', sessionID: 's', callID: 'c', args: { filePath: '/repo/src/db.js' } }, output);

    assert.strictEqual(calls.length, 0);
  });
});
