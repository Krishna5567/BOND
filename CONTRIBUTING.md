# Contributing to Bond

Bond is an Electron app in plain JavaScript. No bundler, no framework, no build
step for the UI — you edit a file and restart.

## Run it

```bash
git clone <your-repository-url>
cd bond-desktop
npm install
npm start
```

```bash
npm test        # node --test, no network and no model download needed
npm run shot    # renders a demo-seeded screenshot to shots/app.png
```

## Two copies, and why

Bond is comfortable to build Bond in, so you will end up running two copies of it.
Keep them apart.

- **`npm start`** runs this checkout. It is what you look at while working:
  no build, no wait, and Electron gives it its own `userData` (`Bond-dev`), so
  your real settings, keys and open projects are never touched.
- **`/Applications/Bond.app`** (or installed Windows binary) is the version other people have.

Installing your own build over it is a deliberate act, not the daily loop:

```bash
npm run pack && npm run install-local
```

`install-local` refuses to overwrite a running app, because doing so leaves it
reading a bundle that no longer exists.

Building a `.app` or `.dmg` (`npm run pack` / `npm run dist`) first runs
`npm run fetch-model`, which pulls `whisper-tiny.en` (~44 MB) into `build/models`
so the shipped app can transcribe offline. Packaging config lives in
`electron-builder.yml`.

## Layout

- `src/main/main.js` — Electron main: window, PTYs, folder + `.claude` scan, state, IPC
- `src/main/claude-driver.js` — one Claude Code session → paper-card events
- `src/main/settings.js` — settings.json, read-merge-rename so writers can't clobber
- `src/main/stt.js` — transcription providers as one registry (local, openai, elevenlabs, custom)
- `src/main/stt-local.js` / `stt-model.js` — Whisper on onnxruntime-node, and its weights
- `src/main/preload.js` — contextBridge IPC surface
- `src/renderer/` — the paper UI (`app.js`, `paper.css`, vendored xterm)
- `docs/design.md` — the approved design · `docs/media/` — what it looks like now

State persists to `userData/state.json` (projects, sessions), so a
restart restores the desk.

## How the pieces behave

- **Agent sessions** run the agent's own CLI in a real PTY (node-pty) inside
  an ink-on-paper xterm. Claude, Codex, OpenCode, Grok and the rest each keep
  their TUI; Bond is the desk around them.
- **Sessions survive restarts** — editors and viewers reopen, terminals
  restart in their folder, and Claude sessions pick their conversation back up
  via `claude --resume` of the pinned id.
- **The launcher** (⌘N / Ctrl+N) shows the agents actually installed on your machine:
  Claude Code, Codex, OpenCode, Gemini CLI, Hermes, Kimi Code. Missing ones open a guided setup sheet with the verified
  official install command, run for you inside a terminal tile.
- **Library** — the third rail tab, grouped into Agents / Skills / Services /
  Plugins, reading this project's `.claude/` and `.opencode/`, your user-level
  `~/.claude/` and `~/.config/opencode/`, and installed Claude plugins.
- **Services** writes each connection where the agent already looks — `.mcp.json`
  for Claude Code, OpenCode's config for OpenCode — and proves it by starting it once.
- **Voice** — Whisper runs on the local machine via onnxruntime-node, so dictation
  works on a fresh install with no account, key or network.

## Keys

⌘N new session · ⌘O open folder · ⌘K agents · ⌘W close pane · ⌘S save ·
⌘, settings · esc close

---

[Apache License 2.0](LICENSE)
