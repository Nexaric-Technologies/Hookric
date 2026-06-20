// Thin Agents SDK wrapper for hookrick.
//
// Talks to the Cloudflare Worker via the SDK's AgentClient (PartySocket
// under the hood). The API base URL is resolved by apiBase.js — in
// production it should be set via VITE_HOOKRICK_API.
//
// Wire protocol:
//   client → server:  { type: "join"|"leave"|"response:configure", ... }
//   server → client:  { type: "request:new", payload: <captured> }
import { AgentClient } from 'agents/client';
import { apiBase } from './apiBase.js';

let client = null;
let currentRoom = null;
const handlers = new Set();
let lastConnectHandler = null;

function wsScheme() {
  if (typeof window === 'undefined') return 'ws';
  return window.location.protocol === 'https:' ? 'wss' : 'ws';
}

function buildUrl(endpointId, base) {
  if (!base) return null;
  // Convert https://host → wss://host, http://host → ws://host
  const wsBase = base.replace(/^http/, 'ws');
  return `${wsBase}/r/hook-agent/${endpointId}`;
}

function ensureClient(endpointId) {
  if (client && currentRoom === endpointId) return client;

  if (client) {
    try { client.close(); } catch { /* already closed */ }
    client = null;
  }

  const base = apiBase();
  const url = buildUrl(endpointId, base);
  if (!url) {
    console.error('[hookrick] no API base URL resolved — cannot connect');
    return null;
  }

  client = new AgentClient({
    agent: 'HookAgent',
    name: endpointId,
    host: url,
  });

  client.addEventListener('open', () => {
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

  client.addEventListener('close', (event) => {
    console.warn('[hookrick] ws closed', event?.code, event?.reason);
  });

  client.addEventListener('error', (event) => {
    console.error('[hookrick] ws error', event);
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
  } catch (err) {
    console.warn('[hookrick] configureResponse send failed', err);
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