// The silent ping: one anonymous "somebody launched Bond today" note per
// launch.
//
// The payload is the ENTIRE vocabulary, forever: a random UUID this file
// minted for itself on first launch (kept in settings.json), the app version,
// the chip, and whether the id was created just now. No folders, no prompts,
// no keys, no usage — a new field here needs a new spec, not a quiet edit.
//
// Built on the update-check discipline: pure decision logic with the IO
// injected, and the send fails into silence. A ping is the app's own
// business — offline, DNS-poisoned, server down, disk full — every one of
// those ends as "not sent", never as anything a user has to read.
//
// Dev runs never ping (their launches are not users), except when
// BOND_PING_URL points somewhere on purpose — which is also how the endpoint
// gets tested by hand against wrangler dev or production.

const PING_URL = 'https://krishna5567.github.io/bond-website/api/ping';

// The whole decision, with the answer kept inspectable:
//   { url, payload: { id, version, arch, first }, mintedId } — or null for
// "this launch does not ping" (a dev run without an override).
function pingPlan({ settings = {}, isPackaged, env = {}, version, arch, randomUUID } = {}) {
  const override = (typeof env.BOND_PING_URL === 'string' && env.BOND_PING_URL.trim())
    || (typeof env.NAMI_PING_URL === 'string' && env.NAMI_PING_URL.trim());
  if (!isPackaged && !override) return null;
  const stored = typeof settings.pingId === 'string' && settings.pingId.trim();
  const mint = randomUUID || (() => require('crypto').randomUUID());
  const id = stored || mint();
  return {
    url: override || PING_URL,
    payload: { id, version: String(version || ''), arch: String(arch || ''), first: !stored },
    mintedId: stored ? null : id,
  };
}

// Fire the ping. Resolves { sent, reason? } and never rejects — main calls
// this without awaiting it, so a rejection would be an unhandled one.
async function sendPing({ settings, saveSettings, isPackaged, env, version, arch, fetchImpl, randomUUID } = {}) {
  try {
    const plan = pingPlan({ settings, isPackaged, env, version, arch, randomUUID });
    if (!plan) return { sent: false, reason: 'dev' };
    if (plan.mintedId) {
      // Persist before sending: an id that cannot be saved would be minted
      // fresh every launch, and each one would count as a brand-new user.
      try { saveSettings({ pingId: plan.mintedId }); } catch (_) { return { sent: false, reason: 'save' }; }
    }
    const doFetch = fetchImpl || ((...a) => fetch(...a));
    await doFetch(plan.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(plan.payload),
      signal: AbortSignal.timeout(10000),
    });
    return { sent: true };
  } catch (_) {
    return { sent: false, reason: 'network' };
  }
}

module.exports = { pingPlan, sendPing, PING_URL };
