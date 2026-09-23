// A tile is a new top-level agent. It is never a child of whatever launched
// Nami — and claude decides which it is purely from the environment.
//
// Launch Nami from a shell that is itself inside a claude session (`open -a
// Nami` from a claude tile, `npm start` in one) and that conversation's
// variables land in Nami's environment, and from there in every session Nami
// spawns. claude reads CLAUDE_CODE_CHILD_SESSION, concludes it is nested, and
// turns transcript saving off so two processes do not write one file. The only
// sign is a grey warning line inside the tile — and the transcript is what
// `--resume`, the session rail and the title watcher all read, so the loss is
// silent and complete.
//
// Only handles on a live conversation are dropped. Setup that describes the
// machine, such as CLAUDE_CONFIG_DIR, stays. Credential filtering is applied
// separately by buildChildEnv below.
const INHERITED_SESSION_KEYS = [
  'CLAUDE_CODE_CHILD_SESSION',    // the one that disables transcript saving
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_CODE_BRIDGE_SESSION_ID',
  'CLAUDE_CODE_MESSAGING_SOCKET', // a socket belonging to the launching process
  'CLAUDE_PID',
  'CLAUDECODE',                   // "you are running inside claude" — a tile is not
  'CLAUDE_CODE_ENTRYPOINT',
];

// Returns a copy; the caller's own environment is never touched.
function stripInheritedClaude(env) {
  const out = Object.assign({}, env);
  for (const k of INHERITED_SESSION_KEYS) delete out[k];
  return out;
}

module.exports = { stripInheritedClaude, INHERITED_SESSION_KEYS };

// This is an explicit inventory, not a detector for arbitrary secrets. Saved
// names and names in permission lists extend it (including for other agents).
const KNOWN_CREDENTIAL_KEYS = Object.freeze([
  'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN',
  'OPENAI_API_KEY', 'OPENAI_ADMIN_KEY', 'CODEX_API_KEY', 'AZURE_OPENAI_API_KEY',
  'XAI_API_KEY', 'GROK_CODE_XAI_API_KEY', 'GEMINI_API_KEY', 'GOOGLE_API_KEY',
  'GOOGLE_OAUTH_ACCESS_TOKEN', 'GOOGLE_APPLICATION_CREDENTIALS',
  'MOONSHOT_API_KEY', 'KIMI_API_KEY', 'KIMI_CODE_API_KEY', 'ELEVENLABS_API_KEY',
  'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY', 'GROQ_API_KEY', 'MISTRAL_API_KEY',
  'TOGETHER_API_KEY', 'FIREWORKS_API_KEY', 'COHERE_API_KEY', 'HF_TOKEN', 'HUGGING_FACE_HUB_TOKEN',
  'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_SECURITY_TOKEN',
  'AWS_BEARER_TOKEN_BEDROCK', 'AZURE_CLIENT_SECRET', 'AZURE_CLIENT_CERTIFICATE_PASSWORD',
  'GITHUB_TOKEN', 'GH_TOKEN', 'GITHUB_PERSONAL_ACCESS_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GITHUB_ENTERPRISE_TOKEN',
  'GITLAB_TOKEN', 'GITLAB_ACCESS_TOKEN', 'NPM_TOKEN', 'NODE_AUTH_TOKEN',
  'NOTION_TOKEN', 'NOTION_API_KEY', 'SLACK_TOKEN', 'SLACK_BOT_TOKEN', 'SLACK_USER_TOKEN',
  'SLACK_MCP_XOXB_TOKEN', 'SLACK_MCP_XOXP_TOKEN', 'TELEGRAM_BOT_TOKEN', 'KIE_API_KEY',
]);
const DEFAULT_AGENT_CREDENTIALS = Object.freeze({
  claude: ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN'],
  codex: ['OPENAI_API_KEY', 'CODEX_API_KEY'],
  grok: ['XAI_API_KEY', 'GROK_CODE_XAI_API_KEY'],
  opencode: [], antigravity: [], hermes: [], kimi: [],
});
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const record = (obj) => obj !== null && typeof obj === 'object' && !Array.isArray(obj);
const validId = (id) => /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id) && !['constructor', 'prototype', '__proto__'].includes(id);
const validName = (name) => typeof name === 'string' && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
  && !['__proto__', 'constructor', 'prototype', ...INHERITED_SESSION_KEYS].includes(name);
const validList = (list) => Array.isArray(list) && list.every(validName);
const invalid = () => { throw new Error('Invalid child-process credential settings.'); };

function credentialPolicy(settings = {}) {
  const allowlist = settings.agentCredentialAllowlist ?? {};
  const profiles = settings.customAgentProfiles ?? {};
  if (!record(allowlist) || !record(profiles)) invalid();
  for (const [id, names] of Object.entries(allowlist)) if (!validId(id) || !validList(names)) invalid();
  for (const [id, profile] of Object.entries(profiles)) {
    if (!validId(id) || own(DEFAULT_AGENT_CREDENTIALS, id) || !record(profile)
      || typeof profile.program !== 'string' || !require('node:path').isAbsolute(profile.program)
      || profile.program.includes('\0') || !validList(profile.credentialKeys)) invalid();
  }
  return { allowlist, profiles };
}

function credentialNames(settings = {}) {
  const { allowlist, profiles } = credentialPolicy(settings);
  return new Set([...KNOWN_CREDENTIAL_KEYS, ...Object.keys(record(settings.envKeys) ? settings.envKeys : {}),
    ...Object.values(allowlist).flat(), ...Object.values(profiles).flatMap((p) => p.credentialKeys)]);
}

function buildChildEnv({ parentEnv = process.env, settings = {}, purpose = 'terminal', agentId, program, explicitEnv = {} } = {}) {
  const { allowlist, profiles } = credentialPolicy(settings);
  const saved = record(settings.envKeys) ? settings.envKeys : {};
  const out = stripInheritedClaude(parentEnv);
  for (const name of credentialNames(settings)) delete out[name];
  let names = [];
  if (purpose === 'agent') {
    if (own(DEFAULT_AGENT_CREDENTIALS, agentId)) names = own(allowlist, agentId) ? allowlist[agentId] : DEFAULT_AGENT_CREDENTIALS[agentId];
    else if (own(profiles, agentId) && profiles[agentId].program === program) {
      names = own(allowlist, agentId) ? allowlist[agentId] : profiles[agentId].credentialKeys;
    }
  }
  for (const name of names) {
    const value = own(saved, name) ? saved[name] : parentEnv[name];
    if (typeof value === 'string') out[name] = value;
  }
  if (purpose === 'connector') {
    for (const [name, value] of Object.entries(explicitEnv)) {
      if (validName(name) && typeof value === 'string') out[name] = value;
    }
  }
  return out;
}

// Purpose is authoritative over an install tile's informational agent ID.
// Old run tiles without metadata fail closed; command text never grants keys.
function terminalLaunchPolicy({ kind, purpose, agentId, program, watchDone, oneShot } = {}) {
  if (watchDone || oneShot || purpose === 'installer') return { purpose: 'installer' };
  if (kind === 'shell') return { purpose: 'terminal' };
  if (kind === 'claude') return { purpose: 'agent', agentId: 'claude' };
  // Harnesses are arbitrary executables and must use a bound custom profile.
  if (kind === 'harness' && own(DEFAULT_AGENT_CREDENTIALS, agentId)) return { purpose: 'terminal' };
  if (['run', 'harness'].includes(kind) && purpose === 'agent' && typeof agentId === 'string') {
    return { purpose: 'agent', agentId, ...(kind === 'harness' ? { program } : {}) };
  }
  return { purpose: 'terminal' };
}

function customAgents(settings = {}, exists = require('node:fs').existsSync) {
  const { profiles } = credentialPolicy(settings);
  return Object.entries(profiles).map(([id, p]) => ({ id, name: id, kind: 'harness', program: p.program,
    bin: p.program, path: p.program, found: exists(p.program), sub: 'custom agent', custom: true })).filter((a) => a.found);
}

// Only diagnostics generated by Nami use this. A child's terminal output is
// intentionally left intact; this is not a terminal-output or shell sandbox.
function redactChildError(error, { parentEnv = process.env, settings = {}, explicitEnv = {} } = {}) {
  let names;
  try { names = credentialNames(settings); } catch (_) { names = new Set([...KNOWN_CREDENTIAL_KEYS, ...Object.keys(settings.envKeys || {})]); }
  const values = [...names].flatMap((name) => [parentEnv[name], settings.envKeys?.[name]]).concat(Object.values(explicitEnv));
  let message = String(error?.message || error);
  for (const value of [...new Set(values)].filter((v) => typeof v === 'string' && v).sort((a, b) => b.length - a.length)) {
    message = message.split(value).join('[redacted]');
  }
  return message;
}

Object.assign(module.exports, { buildChildEnv, terminalLaunchPolicy, customAgents, redactChildError, KNOWN_CREDENTIAL_KEYS });
