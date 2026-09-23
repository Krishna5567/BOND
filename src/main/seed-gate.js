// Kimi and Hermes's classic REPL have no interactive initial-prompt argument. Wait for their
// empty composer, paste once, then submit only after seeing text or a collapsed
// paste acknowledgement. Never infer lost input from a missing text echo.
const ANSI_RE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b\[[0-9;?<>= ]*[A-Za-z~]|\x1b./g;
const unpaint = s => String(s || '').replace(ANSI_RE, '');
const flatten = s => unpaint(s).replace(/\s+/g, '');
function sawEcho(output, seed) {
  const needle = flatten(seed).slice(0, 12);
  return !!needle && flatten(output).includes(needle);
}

function inputReady(agentId, output) {
  const text = unpaint(output).replace(/\r/g, '');
  // Match the empty input itself, not a selected menu item or a banner that
  // remains visible behind a login, trust, password or approval question.
  if (agentId === 'kimi') return /│ > +│\n+\s*╰─/.test(text);
  if (agentId === 'hermes') return /─{8,}\n(?:─\n)*(?:[\w.-]+ )?❯ \n+─{8,}/.test(text);
  return false;
}

function startSeedGate({ write, seed, agentId, setTimer = setTimeout, clearTimer = clearTimeout }) {
  // Clipboard paste preserves line breaks but must not contain terminal control
  // sequences that can terminate the bracketed paste or execute input actions.
  const text = String(seed || '').replace(/\r\n?/g, '\n').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
  let state = text ? 'waiting' : 'stopped';
  let raw = '', timer = null;
  const cancelTimer = () => { if (timer !== null) clearTimer(timer); timer = null; };
  const stop = () => { state = 'stopped'; raw = ''; cancelTimer(); };
  return {
    onData(chunk) {
      if (state === 'done' || state === 'stopped') return;
      raw = (raw + chunk).slice(-32768);
      if (state === 'waiting') {
        cancelTimer();
        // Allow split ANSI sequences and one complete redraw to settle. Each
        // burst is considered afresh, so an old composer cannot trigger later.
        timer = setTimer(() => {
          timer = null;
          const ready = inputReady(agentId, raw); raw = '';
          if (!ready || state !== 'waiting') return;
          state = 'pasted';
          write('\x1b[200~' + text + '\x1b[201~');
        }, 250);
      } else if (state === 'pasted' && (sawEcho(raw, text) || /\[(?:Pasted text(?: #\d+|:)|paste #\d+ \+\d+ lines\])/i.test(unpaint(raw)))) {
        state = 'submitting'; raw = '';
        timer = setTimer(() => { timer = null; state = 'done'; write('\r'); }, 250);
      }
    },
    // Users answer startup questions normally. Once our paste has landed,
    // taking over the keyboard cancels the pending automatic Enter.
    onInput() {
      if (state !== 'waiting' || inputReady(agentId, raw)) stop();
      else { raw = ''; cancelTimer(); }
    },
    stop,
  };
}
module.exports = { startSeedGate, sawEcho };
