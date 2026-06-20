// Thin socket.io-client wrapper. Single connection, re-joins the endpoint
// room whenever the active endpoint id changes.
//
// URL resolution:
//   - In dev (Vite proxy) → same origin, path /socket.io
//   - In prod → connect to the hookrick Worker (api.hookrick.com or
//     your custom Worker URL) at the same path.
//   - Override via VITE_HOOKRICK_API env var.
import { io } from 'socket.io-client';

function resolveUrl() {
  // Vite injects import.meta.env at build time.
  const explicit = import.meta.env?.VITE_HOOKRICK_API;
  if (explicit) return explicit;
  if (typeof window === 'undefined') return undefined;
  const host = window.location.hostname;
  // Localhost dev → Vite proxy on same origin (port 5173 → server 4000)
  if (host === 'localhost' || host === '127.0.0.1') return undefined;
  // Production → talk to the Cloudflare Worker that owns /r/:id
  return `https://api.${host.replace(/^[^.]+\./, '')}`;
}

let socket = null;
let currentRoom = null;
const handlers = new Set();

function ensureSocket() {
  if (socket) return socket;
  const url = resolveUrl();
  socket = io(url, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 500,
  });
  socket.on('connect', () => {
    if (currentRoom) socket.emit('join', currentRoom);
  });
  socket.on('request:new', (data) => {
    for (const h of handlers) h(data);
  });
  return socket;
}

export function joinRoom(endpointId) {
  ensureSocket();
  if (currentRoom && currentRoom !== endpointId) {
    socket?.emit('leave', currentRoom);
  }
  currentRoom = endpointId;
  if (socket?.connected) {
    socket.emit('join', endpointId);
  }
}

export function onNewRequest(handler) {
  ensureSocket();
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function configureResponse(endpointId, config) {
  ensureSocket();
  socket?.emit('response:configure', { endpointId, config });
}

export function isConnected() {
  return !!socket?.connected;
}
