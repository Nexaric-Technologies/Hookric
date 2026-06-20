// Thin Agents SDK wrapper for hookrick.
//
// Talks to the Cloudflare Worker via the SDK's AgentClient (PartySocket
// under the hood). URL shape matches the Worker's routeAgentRequest
// config (prefix "r", binding kebab-case "hook-agent"):
//
//   wss://<host>/r/hook-agent/<endpointId>
//
// URL resolution:
//   - In dev (Vite proxy) → ws://localhost:5173/r/hook-agent/<id>
//   - In prod → wss://<pages-host-with-api-as-subdomain>/r/hook-agent/<id>
//   - Override via VITE_HOOKRICK_WS_HOST env var.
//
// Wire protocol:
//   client → server:  { type: "join"|"leave"|"response:configure", ... }
//   server → client:  { type: "request:new", payload: <captured> }
import { AgentClient } from 'agents/client';

let client = null;
let currentRoom = null;
const handlers = new Set();
let lastConnectHandler = null;

function resolveHost() {
  // Vite injects import.meta.env at build time.
  const explicit = import.meta.env?.VITE_HOOKRICK_WS_HOST;
  if (explicit) return explicit;
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  // Localhost dev → Vite serves the client; proxy the WS through the
  // dev server (Worker doesn't run there). Falls back to localhost.
  if (host === 'localhost' || host === '127.0.0.1') return host;
  // Production → talk to the Cloudflare Worker. By convention the
  // Worker sits on api.<root-domain>; same scheme as the page.
  const root = host.replace(/^[^.]+\./, '');
  return `api.${root}`;
}

function wsScheme() {
  if (typeof window === 'undefined') return 'ws';
  return window.location.protocol === 'https:' ? 'wss' : 'ws';
}

function buildUrl(endpointId) {
  const host = resolveHost();
  if (!host) return undefined;
  // AgentClient accepts a full ws/wss URL via `host`; prefix is the
  // SDK's URL segment. Our Worker uses prefix "r" and the binding
  // kebab-case "hook-agent", so the URL is /r/hook-agent/<id>.
  const scheme = wsScheme();
  return `${scheme}://${host}/r/hook-agent/${endpointId}`;
}

function ensureClient(endpointId) {
  if (client && currentRoom === endpointId) return client;

  if (client) {
    try { client.close(); } catch { /* already closed */ }
    client = null;
  }

  const url = buildUrl(endpointId);
  if (!url) return null;

  client = new AgentClient({
    agent: 'HookAgent',
    name: endpointId,
    host: url,
  });

  client.addEventListener('open', () => {
    // Tell the server we're subscribed (legacy compat — no-op for routing).
    try { client.send(JSON.stringify({ type: 'join', endpointId })); } catch { /* not ready */ }
    lastConnectHandler?.();
  });

  client.addEventListener('message', (event) => {
    let msg;
    try {
      msg = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString('utf8'));
    } catch {
      return;
    }
    if (msg?.type === 'request:new' && msg.payload) {
      for (const h of handlers) h(msg.payload);
    }
  });

  currentRoom = endpointId;
  return client;
}

export function joinRoom(endpointId) {
  ensureClient(endpointId);
}

export function onNewRequest(handler) {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function configureResponse(endpointId, config) {
  const c = ensureClient(endpointId);
  if (!c) return;
  try {
    c.send(JSON.stringify({ type: 'response:configure', endpointId, config }));
  } catch {
    // Socket may not be open yet; the config will need to be re-pushed
    // on reconnect (handled by re-subscribing the client on open).
  }
}

export function isConnected() {
  return !!client && client.readyState === 1; // OPEN
}

// Re-push the current response config after a reconnect. The store
// calls this from onConnect so a network blip doesn't drop the user's
// mock response.
export function onReconnect(handler) {
  lastConnectHandler = handler;
}
