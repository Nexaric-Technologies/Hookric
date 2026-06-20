# WebhookMirror

Instant webhook inspection — no signup, no database. Drop a request at `/r/:id` and watch it appear in real time.

## Stack

- **Frontend:** React + Vite + Tailwind + shadcn/ui patterns
- **Backend:** Node.js + Express
- **Realtime:** Socket.IO
- **Storage:** Browser LocalStorage / IndexedDB (no server DB)

## Quick Start

```bash
npm run install:all
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:4000

The client proxies `/r/*` and `/api/*` to the server in dev (configured via Vite proxy).

## Production

```bash
npm run build
npm start
```

The Express server serves the built client from `client/dist`.

## Project Layout

```
.
├── client/   # Vite + React + Tailwind app
├── server/   # Express + Socket.IO capture server
└── package.json
```

## How It Works

1. Open the homepage — a unique endpoint ID is generated in the browser.
2. The browser opens a Socket.IO connection to the server, joining a room named after the endpoint ID.
3. Any HTTP request to `POST/GET/PUT/DELETE /r/:id` is captured by Express, parsed in full, then broadcast to the room.
4. The client receives the broadcast, stores it in LocalStorage / IndexedDB, and renders it live.
5. Custom response builder lets the server reply with whatever status / body / headers the user defined.
