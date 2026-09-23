import { test } from 'node:test';
import assert from 'node:assert/strict';
import seedGate from '../src/main/seed-gate.js';
const { startSeedGate, sawEcho } = seedGate;

// A hand-cranked clock: timers fire only when the test advances it, so every
// race in the gate is a deterministic sequence here.
function clock() {
  let now = 0, id = 0;
  const timers = new Map();
  return {
    setTimer: (fn, ms) => { id++; timers.set(id, { fn, at: now + ms }); return id; },
    clearTimer: (t) => timers.delete(t),
    advance(ms) {
      const until = now + ms;
      for (;;) {
        let next = null;
        for (const [tid, t] of timers) if (t.at <= until && (!next || t.at < next.t.at)) next = { tid, t };
        if (!next) break;
        timers.delete(next.tid);
        now = next.t.at;
        next.t.fn();
      }
      now = until;
    },
  };
}

const SEED = 'Describe this agent.\n' + 'Keep this complete sentence. '.repeat(220);
const READY = {
  kimi: '\x1b[2K│ >                     │\r\n╰───────────────────────╯',
  hermes: '\x1b[?2004h──────────────────────\r\n❯ \r\n──────────────────────',
};
function harness(agentId = 'kimi') {
  const c = clock(), writes = [];
  const gate = startSeedGate({ agentId, seed: SEED, write: s => writes.push(s), setTimer: c.setTimer, clearTimer: c.clearTimer });
  return { c, writes, gate };
}
for (const id of ['kimi', 'hermes']) {
  test(id + ': waits at startup questions, then pastes a long message exactly once', () => {
    const { c, writes, gate } = harness(id);
    gate.onData('Trust this folder?\r\n❯ Trust this folder\r\nSet up a provider now? [Y/n]:');
    c.advance(60000);
    assert.deepEqual(writes, []);
    for (const char of READY[id]) gate.onData(char);
    c.advance(1000);
    assert.deepEqual(writes, ['\x1b[200~' + SEED + '\x1b[201~']);
    gate.onData(id === 'kimi' ? '[paste #1 +76 lines]' : '[Pasted text #1: 6 lines]');
    c.advance(1000);
    assert.deepEqual(writes, ['\x1b[200~' + SEED + '\x1b[201~', '\r']);
    gate.onData(READY[id]); c.advance(60000);
    assert.equal(writes.length, 2);
  });
}
test('a missing or slow echo never causes a duplicate paste', () => {
  const { c, writes, gate } = harness();
  gate.onData(READY.kimi); c.advance(1000); c.advance(10000);
  assert.equal(writes.length, 1);
  gate.onData(SEED.slice(0, 40)); c.advance(1000);
  assert.equal(writes[1], '\r');
});
test('closing a session cancels a pending paste or Enter', () => {
  for (const pasted of [false, true]) {
    const { c, writes, gate } = harness();
    gate.onData(READY.kimi);
    if (pasted) { c.advance(1000); gate.onData('[Pasted text #1]'); }
    gate.stop(); c.advance(60000);
    assert.equal(writes.length, pasted ? 1 : 0);
  }
});
test('manual input after the paste cancels automatic submission', () => {
  const { c, writes, gate } = harness();
  gate.onData(READY.kimi); c.advance(1000);
  gate.onData('[Pasted text #1]'); gate.onInput('x'); c.advance(1000);
  assert.equal(writes.length, 1);
});
test('unknown terminal screens never receive speculative typing', () => {
  const { c, writes, gate } = harness('unknown');
  gate.onData(READY.kimi + READY.hermes); c.advance(60000);
  assert.deepEqual(writes, []);
});
test('an ANSI-painted, fragmented text echo is still recognised', () => {
  assert.equal(sawEcho('Describe \x1b[31mthis\r\n agent.', SEED), true);
});

test('Hermes approval and password prompts cannot be mistaken for its composer', () => {
  for (const icon of ['⚠', '🔑', '🔐', '?']) {
    const { c, writes, gate } = harness('hermes');
    gate.onData('──────────────────────\r\n' + icon + ' ❯ \r\n──────────────────────');
    c.advance(60000); assert.deepEqual(writes, []);
  }
});

test('manual input while the empty composer settles cancels that pending paste', () => {
  const { c, writes, gate } = harness();
  gate.onData(READY.kimi); gate.onInput('x'); c.advance(1000);
  gate.onData(READY.kimi); c.advance(1000);
  assert.deepEqual(writes, []);
});
test('terminal control characters cannot break out of the one bracketed paste', () => {
  const c = clock(), writes = [];
  const gate = startSeedGate({ agentId: 'kimi', seed: 'Hello\r\nWorld\x1b[201~\x03', write: s => writes.push(s), setTimer: c.setTimer, clearTimer: c.clearTimer });
  gate.onData(READY.kimi); c.advance(1000);
  assert.deepEqual(writes, ['\x1b[200~Hello\nWorld[201~\x1b[201~']);
});
