// Single source of truth for the hookrick API base URL.
//
// In dev: Vite proxies /r and /socket.io to the local Node server
// (port 4000). The browser should use the page origin (no override).
//
// In prod: the Worker lives on a different host than the Pages app.
// The browser-side bundle needs the absolute Worker URL.
//
// Resolution order:
//   1. VITE_HOOKRICK_API build-time env var (preferred — explicit)
//   2. Same origin as the page (dev or single-host deploy)
//   3. api.<root-domain> heuristic (only for the obvious cases)

const explicit = import.meta.env?.VITE_HOOKRICK_API;

export function apiBase() {
  if (explicit) return stripTrailingSlash(explicit);
  if (typeof window === 'undefined') return '';
  // Dev / local: the Vite proxy handles /r/* for us.
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return window.location.origin;
  }
  // Prod: explicit env var is the only reliable answer.
  // Without it, fall back to a best-effort guess so we don't fail silently.
  return guessApiBase(window.location.host);
}

function stripTrailingSlash(s) {
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

function guessApiBase(host) {
  // pages.dev → Worker lives at api.<your-domain>; root domain for
  // hookrick.pages.dev is hookrick.com (custom domain). Without an
  // explicit VITE_HOOKRICK_API we can't know the real API host, so
  // log loudly and return the page origin (request will 404, but the
  // dev console will show the missing config).
  if (typeof console !== 'undefined') {
    console.warn(
      '[hookrick] VITE_HOOKRICK_API is not set — connection will likely fail. ' +
      'Set it in client/.env or pass it at build time, e.g.:\n' +
      '  VITE_HOOKRICK_API=https://hookrick.example.workers.dev npm run build'
    );
  }
  // Best-effort: derive the API host from the page host.
  const parts = host.split('.');
  // hookrick.pages.dev → api.hookrick.pages.dev (often wrong, but better than nothing)
  if (parts.length >= 2) {
    return `${window.location.protocol}//api.${parts.slice(-2).join('.')}`;
  }
  return window.location.origin;
}
