// Thin socket.io-client wrapper. Single connection, re-joins the endpoint
// room whenever the active endpoint id changes.
import { io } from 'socket.io-client';

let socket = null;
let currentRoom = null;
const handlers = new Set();

function ensureSocket() {
  if (socket) return socket;
  // In dev, Vite proxies /socket.io to the capture server. In prod, same
  // origin. Using `path` explicitly avoids Vite's default.
  socket = io({
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
