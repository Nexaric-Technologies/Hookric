// Browser push notifications for incoming webhooks.
//
// Uses the standard Web Notifications API. No service worker, no VAPID —
// a foreground notification fired while the tab is in the background. The
// OS handles display, sound, and Do-Not-Disturb.
//
// We only request permission on user intent (clicking the bell), not on
// mount, so we never show a prompt without a clear action.

const PREFS_KEY = 'hookrick:v1:notify';
const SOUND_KEY = 'hookrick:v1:notifySound';

export function notifySupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPermission() {
  if (!notifySupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export function isEnabled() {
  try { return localStorage.getItem(PREFS_KEY) === '1'; } catch { return false; }
}

export function setEnabled(enabled) {
  try { localStorage.setItem(PREFS_KEY, enabled ? '1' : '0'); } catch { /* noop */ }
}

export function isSoundEnabled() {
  try { return localStorage.getItem(SOUND_KEY) === '1'; } catch { return false; }
}

export function setSoundEnabled(enabled) {
  try { localStorage.setItem(SOUND_KEY, enabled ? '1' : '0'); } catch { /* noop */ }
}

export async function requestPermission() {
  if (!notifySupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    const res = await Notification.requestPermission();
    return res;
  } catch {
    return 'denied';
  }
}

const ICONS = {
  GET:    '🟢',
  POST:   '🔵',
  PUT:    '🟠',
  PATCH:  '🟠',
  DELETE: '🔴',
  HEAD:   '⚪',
  OPTIONS:'⚪',
};

const METHOD_TINT = {
  GET: 'chip-tint-green',
  POST: 'chip-tint-blue',
  PUT: 'chip-tint-amber',
  PATCH: 'chip-tint-amber',
  DELETE: 'chip-tint-red',
  HEAD: 'chip-tint-violet',
  OPTIONS: 'chip-tint-violet',
};

export function methodTint(method) {
  return METHOD_TINT[(method || '').toUpperCase()] || '';
}

export function methodIcon(method) {
  return ICONS[(method || '').toUpperCase()] || ICONS.OPTIONS;
}

// Format the webhook's path so it fits in a notification body line.
function shortPath(req) {
  const path = (req.path || req.url || '').toString();
  if (!path) return '/';
  return path.length > 64 ? path.slice(0, 63) + '…' : path;
}

// Build a notification for a single incoming webhook. Caller is
// responsible for actually firing it (so the call site can decide
// whether to skip on the active request, etc.).
export function buildNotification(req) {
  const method = (req.method || 'GET').toUpperCase();
  const title = `${method}  ${shortPath(req)}`;
  const ip = req?.ip?.remote || '';
  const ua = req?.userAgent?.detected || '';
  const size = req?.body?.size != null ? formatBytes(req.body.size) : '';
  const bodyParts = [];
  if (ip) bodyParts.push(`from ${ip}`);
  if (ua) bodyParts.push(ua);
  if (size) bodyParts.push(size);
  if (req?.processingMs != null) bodyParts.push(`${req.processingMs}ms`);
  return {
    title,
    body: bodyParts.join(' · ') || 'New request received',
    tag: req?.id || `hook-${Date.now()}`,
    renotify: false,
    silent: !isSoundEnabled(),
    data: { id: req?.id, endpointId: req?.endpointId },
  };
}

function formatBytes(n) {
  if (!Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

let clickHandler = null;
export function onNotificationClick(handler) {
  clickHandler = handler;
}
window.addEventListener?.('focus', () => {
  if (clickHandler) clickHandler();
});

export function fire(req) {
  if (!isEnabled()) return false;
  if (getPermission() !== 'granted') return false;
  if (document.visibilityState === 'visible') return false; // tab is in focus — no need
  try {
    const n = buildNotification(req);
    const notif = new Notification(n.title, {
      body: n.body,
      tag: n.tag,
      renotify: n.renotify,
      silent: n.silent,
      data: n.data,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    });
    notif.onclick = () => {
      try { window.focus(); } catch { /* noop */ }
      if (clickHandler) clickHandler(req?.id);
      notif.close();
    };
    // Auto-dismiss after 6s
    setTimeout(() => { try { notif.close(); } catch { /* noop */ } }, 6000);
    return true;
  } catch (err) {
    // Some browsers throw if called from a non-user gesture after
    // many calls — swallow.
    console.warn('[hookrick] notification failed', err);
    return false;
  }
}
