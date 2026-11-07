const S = chrome.storage.local;
const IDLE_SECONDS = 180; // 3 minutes

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mylock-v1:' + s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function lockIfSet() {
  const { hash } = await S.get('hash');
  if (hash) await S.set({ locked: true });
}

chrome.idle.setDetectionInterval(IDLE_SECONDS);

chrome.runtime.onInstalled.addListener(d => {
  if (d.reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('setup.html') });
});
chrome.runtime.onStartup.addListener(lockIfSet);          // Chrome opened -> lock
chrome.idle.onStateChanged.addListener(st => { if (st !== 'active') lockIfSet(); }); // 3 min idle or screen locked
chrome.action.onClicked.addListener(async () => {         // click the icon -> lock now
  const { hash } = await S.get('hash');
  if (hash) lockIfSet(); else chrome.tabs.create({ url: chrome.runtime.getURL('setup.html') });
});

chrome.runtime.onMessage.addListener((m, _sender, send) => {
  (async () => {
    const { hash } = await S.get('hash');
    if (m.type === 'check') {
      if (hash && (await sha(m.pw)) === hash) { await S.set({ locked: false }); return { ok: true }; }
      return { ok: false };
    }
    if (m.type === 'setpw') {
      if (hash && (await sha(m.old || '')) !== hash) return { ok: false, error: 'Current password is wrong.' };
      if (!m.pw || m.pw.length < 4) return { ok: false, error: 'Use at least 4 characters.' };
      await S.set({ hash: await sha(m.pw), locked: false });
      return { ok: true };
    }
    return { ok: false };
  })().then(send);
  return true;
});
