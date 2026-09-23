# Issue #5 validation

## Scope and tested revision

Validated September 15–16, 2026 on branch
`fix/issue-5-credential-inheritance`, against base `35fd170`.
The latest implementation tested was `2d065b1` plus the local signal-zero
exit-note fix and its regression test. Earlier checks cover the credential
policy introduced by `57a690b`. This report consolidates the automated,
CLI, and manual results; it does not claim every manual check passed.

Development-app checks used `npm start`, the **Nami-dev** profile, and empty
scratch folders. Native computer use exercised the Electron UI. Tests ran under
the existing macOS account, not a separate test account.
`/Applications/Nami.app` was untouched. Live requests used subscription logins
and harmless test markers, with no tools or file access requested.
No real API key was supplied for testing.

## Automated validation

- Latest full `npm test`: **1,255 passed, zero failed**, including the exit-note
  fix. Existing browser-sharing tests required localhost access; their sandbox
  bind failures were resolved by running with that access.
- Final diff-review run: **43 focused tests passed**, covering child environments,
  PTY launches, probes, MCP checks, and exit notes.
- Regression tests use dummy credentials and injected process boundaries. They
  cover saved/inherited precedence, default and overridden grants, malformed
  settings, custom executable binding, renderer IPC, snapshots/restoration,
  installer precedence, MCP/ACP, status/PATH probes, Codex usage, diagnostic
  redaction, environment preservation, and input immutability.
- Existing transcription tests passed unchanged. No automated test launches
  a real agent or contacts a model provider; one launch test runs an isolated
  real shell and dummy executable to verify exit behavior.
- `npm ci` used the existing lockfile without dependency changes. JavaScript
  syntax checks and `git diff --check` passed.

These results were obtained before this documentation consolidation. The suite
was not rerun for documentation-only edits.

## Manual results

“Fixture” means a controlled dummy process or modified disposable copy, not an
unmodified application completing a third-party installation.

| Check | Result | Evidence and limits |
| --- | --- | --- |
| Keys wording | Passed in UI | Corrected subtitle and explanation appear in Settings. |
| Credential grants and precedence | Passed with UI fixtures | Custom profile received permitted saved and inherited-only keys; saved value won. Unrelated keys were absent. Empty grant received no saved dummy key. |
| Ordinary terminal | Passed in UI | Saved and inherited dummy credentials were absent; PATH/HOME remained available. Commands returned to a working prompt. |
| Custom-profile restoration | Passed with UI fixtures | Clean restart restored the same grants and the ordinary terminal. |
| Codex startup | Passed, with header limitation | CLI TUI appeared with no shell prompt. Redraw hid the initial `$ codex` header; automated tests verify header generation. |
| Codex normal quit | Passed in UI | `/quit` ended the tile with `[finished]`, without a shell prompt. |
| Codex Ctrl-C | Passed for tile isolation | Two presses closed the tile. Codex handled the interrupt and exited zero, so `[finished]` was correct; actual SIGINT/exit 130 formatting is tested automatically. |
| Codex subscription and continuity | Passed with canonical project path | Live request returned `CODEX_AUTH_OK`; discovery saved the session ID and the CLI/store title updated the rail. After restart and manual reopening of the project, the same ID restored and a follow-up recalled `COPPER-LEAF-73`. Automatic reopening of multiple windows was not established. |
| Claude direct startup and subscription | Passed in UI | User completed `/login`; Claude displayed successful login and Claude Max. A live request returned `NAMI_AUTH_OK`, and the rail title updated. |
| Claude continuity | Passed with canonical-path workaround | After correcting the disposable snapshot cwd, the same session ID restored and a follow-up recalled `SILVER-PINE-42`. See the unresolved path finding below. |
| Installer completion and remaining prompt | Passed with UI fixture | Harmless install command completed, detection correctly reported `DID NOT INSTALL`, and the remaining prompt accepted commands without saved dummy credentials. No third-party install was attempted. |
| Legacy run without identity | Passed with UI fixture | Snapshot restored, typed its command, and remained an interactive shell without saved dummy credentials. |
| Claude shell fallback | Passed with forced UI fixture | Real Claude reached its authenticated prompt; `/exit` ended the tile with `[finished]` and no shell prompt. No installed executable was renamed. Redraw hid the initial header; automated tests cover it. |
| Shell rc files and compound commands | Passed with CLI fixtures | Six real PTY scenarios covered zsh/bash agent, installer, and legacy-shell launches, using temporary HOME/rc files and dummy values. Real OpenCode logout/login was not tested. |
| Bash with real Codex | Passed in UI | `SHELL=/bin/bash npm start` restored Codex, received a live continuation, and ended normally on `/quit`. User shell configuration was unchanged. |
| Seeded Claude first message | Failed; deferred | Library build typed the generated prompt but did not automatically submit it. See reproduction below. |

### Fixture setup and cleanup

Credential checks used disposable dummy keys/profiles; their original Nami-dev
settings were restored after that pass. Later subscription authentication was
intentionally retained.

Installer, legacy-snapshot, and fallback UI checks used `/tmp/nami-ui-fixture`
and an explicit disposable profile `/tmp/Nami-dev-manual-fixture`, launched via
`npm start`. The copy contained the tested source and exactly two injections:
Kimi's installer command became `printf NAMI_INSTALL_OK`, and the Claude
executable resolver returned null to force shell fallback. Neither injection
changed the main checkout or installed binaries. Boolean checks verified dummy
key absence without exposing real credentials. Test tiles were closed and test
app processes stopped after the checks.

## Fix validated during testing

`node-pty` reports `signal: 0` for a normal exit. The existing formatter displayed
`stopped · signal 0`. The local fix recognizes only positive numeric signals and
otherwise uses the exit code. Its regression test failed before the fix and
passed afterward, covering exit codes 0, 7, and 130 with signal zero. The UI
confirmed `[finished]` on normal Codex quit.

## Unresolved findings

### Claude seeded first-message submission

1. Open Library → Agent build.
2. Enter a name and description, select Claude Code, and choose
   **Build it with my agent**.
3. Observe the generated multiline prompt in Claude's input.

Expected: the prompt is submitted once Claude is ready. Observed: it stayed in
the input beyond the retry period, with no assistant turn. Root cause and
reproducibility rate are unconfirmed. The seed gate and direct-Claude launch
path were unchanged by `2d065b1`; this does not prove the failure predates the
complete credential branch. No seed-gate fix was made. The contributor elected
to disclose this failed check and defer its disposition to maintainers.

### Noncanonical project paths break restoration/discovery

Using `/tmp/nami-issue5-smoke`, Claude stored its transcript under the canonical
`/private/tmp` project path. Nami's lexical lookup missed it and attempted
`--session-id` instead of resume, producing “Session ID ... already in use.”
The same lookup exists in base `35fd170`, establishing a pre-existing defect.
Changing only the disposable snapshot cwd to its canonical path restored Claude
continuity. Codex also failed to populate discovery metadata under `/tmp`;
using `/private/tmp/nami-canonical-live` allowed discovery and live restoration.
The path defect remains unfixed.

### Dependency and environment findings

The September 15 `npm run check:security` run reported zero known vulnerabilities
for all and runtime dependencies, but its Electron freshness gate failed:
the unchanged lockfile pinned 43.7.0 while 43.7.1 was available on that major.
This is a recorded check result, not a current vulnerability guarantee; no
dependency versions were changed.

Existing Google SDK shell rc snippets reported permission errors, and Codex
reported an unauthenticated Context7 MCP connection. Neither was established as
a regression from this branch.

## Coverage limits and skipped checks

- Real Claude/Codex API-key authentication was not tested. Dummy keys prove
  delivery and precedence, not authentication; live subscription calls passed.
- Live ACP sessions and real MCP connector handshakes were not tested. Their
  environment policies have automated spawn-boundary coverage.
- Fish and OpenCode were unavailable. Grok was excluded at the contributor's
  request. Third-party installer success was not tested.
- Canonical-path restoration passed as qualified above; unrestricted path
  handling and automatic multi-window reopening are not claimed.

## Security and final diff review

Reviewed credential disclosure, authorization, shell/HTML/SQL inputs, JSON
parsing, and TLS changes. The implementation fixes validated gaps with regression
tests: arbitrary harnesses cannot claim built-in grants; library-agent filenames
are shell-quoted; and run commands must match the selected agent's main-process
registry entry or supported, exactly quoted library arguments before receiving
credentials. Installer purpose takes precedence over agent identity. Custom
profiles require an exact executable binding. No new blocking issue was found
in the final diff review, including the exit-note fix.

No new SQL execution, unsafe deserialization, or disabled TLS verification was
found. Custom IDs use validation and existing HTML escaping; environment objects
are not logged, and generated launch diagnostics redact supplied recognized
credential values. This local review is not a full security audit.

Initial-environment filtering is not a sandbox: shell startup files can restore
credentials, same-user processes can read credential files, and unregistered
secret variables are outside the explicit inventory. See
[credential permissions](child-process-credentials.md) for the policy and limits.
