import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { buildChildEnv, terminalLaunchPolicy, redactChildError, customAgents } = require('../src/main/session-env');
const parentEnv = Object.freeze({ PATH: '/bin', HOME: '/home/test', LANG: 'en_US.UTF-8',
  CLAUDE_CONFIG_DIR: '/config/claude', CLAUDE_CODE_CHILD_SESSION: '1',
  ANTHROPIC_API_KEY: 'anthropic', OPENAI_API_KEY: 'openai', XAI_API_KEY: 'xai',
  ELEVENLABS_API_KEY: 'eleven', GITHUB_TOKEN: 'github', ODD_CREDENTIAL: 'odd' });
const settings = Object.freeze({ envKeys: Object.freeze({ OPENAI_API_KEY: 'saved-oai', ODD_CREDENTIAL: 'saved-odd' }) });
const ordinary = { PATH: '/bin', HOME: '/home/test', LANG: 'en_US.UTF-8', CLAUDE_CONFIG_DIR: '/config/claude' };

test('agents receive only their allowed inherited or saved keys, with saved precedence', () => {
  for (const [agentId, allowed] of [['claude', { ANTHROPIC_API_KEY: 'anthropic' }],
    ['codex', { OPENAI_API_KEY: 'saved-oai' }], ['grok', { XAI_API_KEY: 'xai' }],
    ['opencode', {}], ['unknown', {}]]) {
    assert.deepEqual(buildChildEnv({ parentEnv, settings, purpose: 'agent', agentId }), { ...ordinary, ...allowed });
  }
  assert.equal(parentEnv.CLAUDE_CODE_CHILD_SESSION, '1');
  assert.equal(settings.envKeys.ODD_CREDENTIAL, 'saved-odd');
});

test('terminal, installer, probe, and unknown purposes cannot opt into ambient keys', () => {
  for (const purpose of ['terminal', 'installer', 'probe', 'typo', undefined]) {
    assert.deepEqual(buildChildEnv({ parentEnv, settings, purpose, agentId: 'codex' }), ordinary);
  }
});

test('explicit per-agent lists replace defaults and register otherwise unknown credentials globally', () => {
  const configured = { ...settings, agentCredentialAllowlist: { codex: [], opencode: ['ODD_CREDENTIAL'] } };
  assert.deepEqual(buildChildEnv({ parentEnv, settings: configured, purpose: 'agent', agentId: 'codex' }), ordinary);
  assert.deepEqual(buildChildEnv({ parentEnv, settings: configured, purpose: 'agent', agentId: 'opencode' }), { ...ordinary, ODD_CREDENTIAL: 'saved-odd' });
  assert.equal(buildChildEnv({ parentEnv: { PRIVATE_TOKEN: 'private' }, settings: { agentCredentialAllowlist: { opencode: ['PRIVATE_TOKEN'] } } }).PRIVATE_TOKEN, undefined);
});

test('saved-only keys work and empty allowed saved values override inherited values', () => {
  assert.equal(buildChildEnv({ parentEnv: {}, settings, purpose: 'agent', agentId: 'codex' }).OPENAI_API_KEY, 'saved-oai');
  assert.equal(buildChildEnv({ parentEnv, settings: { envKeys: { OPENAI_API_KEY: '' } }, purpose: 'agent', agentId: 'codex' }).OPENAI_API_KEY, '');
});

test('custom profile credentials require exact executable binding and appear in the launcher', () => {
  const s = { customAgentProfiles: { 'my-agent': { program: '/opt/custom/agent', credentialKeys: ['ODD_CREDENTIAL'] } } };
  const input = { parentEnv, settings: s, purpose: 'agent', agentId: 'my-agent' };
  assert.equal(buildChildEnv({ ...input, program: '/opt/custom/agent' }).ODD_CREDENTIAL, 'odd');
  assert.equal(buildChildEnv({ ...input, program: '/opt/other' }).ODD_CREDENTIAL, undefined);
  assert.equal(buildChildEnv(input).ODD_CREDENTIAL, undefined);
  const [agent] = customAgents(s, () => true);
  assert.equal(agent.id, 'my-agent');
  assert.equal(agent.kind, 'harness');
  assert.equal(agent.program, '/opt/custom/agent');
});

test('malformed permission entries fail closed with a fixed, value-free diagnostic', () => {
  for (const s of [
    { agentCredentialAllowlist: { codex: ['*'] } },
    { agentCredentialAllowlist: { codex: 'dummy-secret-value' } },
    { agentCredentialAllowlist: [] },
    { customAgentProfiles: { x: { program: 'relative', credentialKeys: [] } } },
    { customAgentProfiles: { claude: { program: '/bin/custom', credentialKeys: [] } } },
    { agentCredentialAllowlist: { codex: ['CLAUDE_CODE_CHILD_SESSION'] } },
  ]) assert.throws(() => buildChildEnv({ parentEnv, settings: s, purpose: 'agent', agentId: 'codex' }), /^Error: Invalid child-process credential settings\.$/);
});

test('connector explicit credentials override filtered ambient values without receiving saved keys', () => {
  assert.deepEqual(buildChildEnv({ parentEnv, settings, purpose: 'connector', explicitEnv: { GITHUB_TOKEN: 'connector', SERVICE_URL: 'http://example.test' } }),
    { ...ordinary, GITHUB_TOKEN: 'connector', SERVICE_URL: 'http://example.test' });
});

test('session purpose beats identity; fresh and resumed launches have identical permissions', () => {
  for (const cont of [false, true]) {
    assert.deepEqual(terminalLaunchPolicy({ kind: 'run', agentId: 'codex', purpose: 'agent', cont }), { purpose: 'agent', agentId: 'codex' });
    assert.deepEqual(terminalLaunchPolicy({ kind: 'claude', cont }), { purpose: 'agent', agentId: 'claude' });
    assert.equal(terminalLaunchPolicy({ kind: 'shell', agentId: 'codex', purpose: 'agent', cont }).purpose, 'terminal');
    assert.equal(terminalLaunchPolicy({ kind: 'run', agentId: 'codex', purpose: 'agent', watchDone: true, cont }).purpose, 'installer');
    assert.equal(terminalLaunchPolicy({ kind: 'run', command: 'codex', cont }).purpose, 'terminal');
  }
});

test('diagnostics redact known inherited, saved, and explicit credential values', () => {
  const message = redactChildError(new Error('openai saved-odd connector'), { parentEnv, settings, explicitEnv: { TOKEN: 'connector' } });
  assert.equal(message, '[redacted] [redacted] [redacted]');
});

test('building from process.env does not mutate it', () => {
  const before = JSON.stringify(process.env);
  buildChildEnv();
  assert.ok(JSON.stringify(process.env) === before, 'parent environment changed');
});

test('missing custom executables do not become installer rows', () => {
  assert.deepEqual(customAgents({ customAgentProfiles: { missing: { program: '/missing/program', credentialKeys: [] } } }, () => false), []);
});
