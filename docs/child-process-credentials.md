# Child-process credentials

Bond supplies credentials according to the process it is starting. Saving a key
in Settings → Keys does not give it to every session.

## Defaults

| Consumer | Allowed ambient credential names |
| --- | --- |
| Claude Code | `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN` |
| Codex | `OPENAI_API_KEY`, `CODEX_API_KEY` |
| Grok | `XAI_API_KEY`, `GROK_CODE_XAI_API_KEY` |
| OpenCode, Antigravity, Hermes, Kimi | None until explicitly configured |
| Custom agents | Only the names in a bound custom profile |
| Terminals, installers, detection/PATH probes | None |
| MCP connection checks | Only the connector's explicitly configured environment |

An allowed saved key overrides the inherited value of the same name, including
an explicitly saved empty string. A missing key is fine: Bond does not require
an API key or change CLI subscription/authentication files. HOME and CLI config
directory settings remain available. Voice still reads its own OpenAI or
ElevenLabs credentials through the existing provider settings.

## Select credentials in settings.json

Open Settings → Keys and click **settings.json** at the bottom. Edit the file,
keeping its other properties. Permissions contain variable **names**, never key
values. Add values using Keys or your existing environment configuration.

```json
{
  "agentCredentialAllowlist": {
    "claude": [],
    "opencode": ["OPENROUTER_API_KEY"],
    "hermes": ["OPENAI_API_KEY", "MY_SERVICE_TOKEN"]
  }
}
```

Each listed agent's array **replaces** its defaults. An empty array opts out of
ambient credentials, useful when you want subscription authentication to take
priority. There are no wildcards or global grant. Grant only the specific
provider/service names the agent needs. Built-in IDs are `claude`, `codex`,
`grok`, `opencode`, `antigravity`, `hermes`, and `kimi`.

Changes apply on the next process launch, including restored sessions. Existing
process environments cannot be revoked in place: close and reopen those tiles.

An agent tile ends when its agent exits. Bond starts the tile's shell with the
agent command as the shell's script rather than typing the command into an
interactive prompt, so when the agent finishes or is stopped with Ctrl-C the
session ends instead of dropping to a shell prompt that still holds the agent's
keys. Its output remains visible in the tile. The shell still reads your startup
files first. Ordinary terminals and
older run tiles without launch identity carry no known API keys, so they keep
their interactive prompt. Installer tiles also keep a prompt afterwards; they
run without ambient credentials.
Legacy Claude tiles retain their identity through their dedicated session kind.
Older run tiles without explicit launch identity receive no ambient credentials;
reopen the agent from the launcher to create an identified session.

## Custom agents

A custom profile binds credentials to an exact absolute executable path. It
appears in the existing new-session launcher when the program exists. Use a
unique ID that does not replace a built-in agent:

```json
{
  "customAgentProfiles": {
    "my-agent": {
      "program": "/absolute/path/to/my-agent",
      "credentialKeys": ["MY_SERVICE_TOKEN"]
    }
  }
}
```

Custom programs run directly, without a shell command. If arguments are needed,
point the profile at your own executable wrapper. Its credential list can also
be replaced by an `agentCredentialAllowlist` entry for `my-agent`. Reopen the
launcher after editing. A restored custom tile only receives credentials while
its saved program path still matches the profile. Unknown IDs and unmatched
paths receive none. Custom profiles apply to terminal harnesses, not ACP Chat.

Malformed permission entries prevent child launches with a fixed diagnostic;
correct the JSON types/names or remove the offending configuration. Names must
be environment-variable identifiers, not wildcard patterns or Claude live-session
handles. Profile paths must be absolute.

Ordinary terminals and installer launches have no ambient-credential opt-in. To
run a specific tool with credentials, make it a custom agent profile. Connector
checks use the environment explicitly configured for that connector, without
unrelated saved or inherited credentials.

## ACP Chat

Main chooses the ACP executable from an explicit agent ID. Native ACP agents use
the same grants as their terminal counterparts. The Codex `npx` adapter and the
Claude adapter's `npx` fallback are fetch-and-run installers, so neither receives
ambient keys, even if a package is cached. Existing CLI authentication files can
still work. Use a regular terminal agent tile for API-key authentication when a
Chat adapter would need a fetch-and-run step.

## What is filtered

The authoritative inventory is `KNOWN_CREDENTIAL_KEYS` in
`src/main/session-env.js`. It includes Anthropic/Claude, OpenAI/Codex/Azure OpenAI,
xAI, Gemini/Google, Moonshot/Kimi, ElevenLabs, OpenRouter, DeepSeek, Groq, Mistral,
Together, Fireworks, Cohere, Hugging Face, AWS, Azure client secrets, GitHub,
GitLab, npm, Notion, Slack, Telegram, and KIE credential names and listed aliases.

Every name saved in Keys and every name in any permission list extends that
inventory for every covered launch: PTYs, ACP, connector checks, agent status,
Codex usage, and agent/PATH probes. For example, configuring
`MY_SERVICE_TOKEN` for Hermes also prevents a terminal or Codex from inheriting
that variable. Unrecognized variables that have never been registered are not
classified as credentials. Non-secret PATH, HOME, locale, and terminal settings
are preserved. Claude conversation/session markers are removed as before.

Bond-generated launch diagnostics redact recognized credential values. It does
not filter arbitrary agent terminal output, and intentional key reveal in
Settings remains available. Permission metadata/snapshots store names and IDs,
not copies of key values.

This is not a process sandbox. A child shell may source startup files that
reintroduce variables, and processes running as the same user may read credential
files. Stored-key encryption, shell-startup restrictions, and stronger process
isolation are separate changes.

## Validation

Automated tests use dummy values and substituted spawn functions. Run `npm test`.
For manual validation, use `npm start` and its separate **Bond-dev** profile;
leave `/Applications/Bond.app` untouched. Check new and restored agent tiles,
existing subscription login, terminal/installer defaults, and an explicitly
configured custom profile. Do not print real credential values to verify a grant.

Built-in run sessions must carry an explicit agent ID and match that agent's
registered command in the main process. Unrelated or compound command text
cannot claim another agent's credentials. Legacy run sessions without reliable
identity remain filtered until reopened through the identified launcher.
Identified agent sessions run the command as the shell's script and end with
the agent; a run tile that lost identity is typed into a keyless shell as
before. Automated coverage includes a real, isolated shell run: the dummy agent
sees its granted dummy key, and the shell exits with the agent's exit code
without further input.
