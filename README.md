# Hookrick — by nexaric

Instant webhook inspection — no signup, no database. Drop a request at `/r/:id` and watch it appear in real time.

## Stack

- **Frontend:** React + Vite + Tailwind + shadcn/ui patterns
- **Capture API:** Cloudflare Workers + Durable Objects (one DO per endpoint ID) — see [Deploy on Cloudflare](#deploy-on-cloudflare)
- **Realtime:** WebSockets via Durable Objects (Agents SDK)
- **Storage:** Browser LocalStorage / IndexedDB (no server DB)

## Quick Start (local dev)

```bash
npm run install:all
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:4000

The client proxies `/r/*` and `/socket.io/*` to the local Express server via the Vite proxy. The local server runs Node + Socket.IO; production runs on Workers.

### Local Workers dev (optional)

If you want to develop the capture API on Workers without spinning up Node:

```bash
cd worker
npm install
npm run dev
```

This runs `wrangler dev` on http://localhost:8787. Point the client at it by setting `VITE_HOOKRICK_API=http://localhost:8787` in `client/.env.local`.

## Production

```bash
# Build the client
npm run build

# Run the Node capture server (single-process)
npm start
```

The Express server serves the built client from `client/dist`. Prefer Cloudflare for production — see below.

## Deploy on Cloudflare

Hookrick is built for the edge: a single Worker with one Durable Object per endpoint ID.

### Prerequisites

```bash
npm install -g wrangler        # or use npx
wrangler login                 # opens browser, links your Cloudflare account
```

### One-time setup

```bash
# Create the Pages project for the React client
wrangler pages project create hookrick --production-branch main

# No DO setup needed — wrangler.toml declares the HookAgent class and the
# `new_sqlite_classes` migration runs on first deploy.
```

### Deploy

```bash
# Deploy the capture API (Worker + Durable Objects)
npm run deploy:worker

# Build the client and deploy to Pages
npm run deploy:client

# Or do both in one shot
npm run deploy
```

After the first deploy you'll have:

- **Client:** `https://hookrick.pages.dev` (and any custom domains you attach)
- **API:** `https://hookrick.<your-subdomain>.workers.dev`
- **WebSocket:** `wss://hookrick.<your-subdomain>.workers.dev/socket.io/...`

### Custom domain

To use `hookrick.com`:

1. Add `hookrick.com` to Cloudflare (Add Site → free plan).
2. **Pages** → `hookrick` project → Custom domains → `hookrick.com` and `www.hookrick.com`.
3. **Workers** → `hookrick` → Triggers → Routes → `api.hookrick.com/*` → add the route.
4. Uncomment the `routes = [...]` block in `worker/wrangler.toml` and re-deploy.

### Client → Worker URL resolution

`client/src/lib/socket.js` picks the Worker URL automatically:

- `localhost` / `127.0.0.1` → same-origin (Vite proxy)
- `hookrick.pages.dev` or any `*.pages.dev` → `https://api.<root-domain>`
- Override with `VITE_HOOKRICK_API` in `client/.env.local`

### Observability

Workers logs and DO analytics are free. Tail live requests with:

```bash
wrangler tail --name hookrick
```

## Project Layout

```
.
├── client/          # Vite + React + Tailwind app
├── server/          # Express + Socket.IO (dev only)
├── worker/          # Cloudflare Worker + Agents SDK Durable Object
│   ├── index.js         # Worker fetch router
│   ├── hook-agent.js    # HookAgent Durable Object
│   ├── analyzer.js      # capture analysis (shared with server)
│   └── wrangler.toml    # Worker config + DO bindings
└── package.json
```

## How It Works

1. Open the homepage — a unique endpoint ID is generated in the browser.
2. The browser opens a WebSocket to the capture API, joining the Durable Object keyed by that endpoint ID.
3. Any HTTP request to `POST/GET/PUT/DELETE /r/:id` is routed to the right DO, parsed in full, and broadcast to its subscribers.
4. The client receives the broadcast, stores it in LocalStorage / IndexedDB, and renders it live.
5. Custom response builder lets the server reply with whatever status / body / headers the user defined.

## Migrating from the old Node server

The Node server in `server/` is preserved for local development. In production, every endpoint is its own Durable Object — capturing `/r/abc123` only touches the `abc123` DO, and the rest of the system stays cold.

Differences from the Node implementation:

| | Node (dev) | Workers (prod) |
|---|---|---|
| Realtime | Socket.IO rooms | Per-DO WebSocket fan-out |
| Response config storage | In-memory `Map` (Worker process) | DO memory (one DO per endpoint) |
| Body parsing | `multer` + manual buffering | `request.arrayBuffer()` + `request.formData()` |
| Static client | Served from `client/dist` by Express | Served by Cloudflare Pages |

## Free-tier limits

- Workers: 100,000 requests / day
- Durable Objects: 1M requests / month, 1 GB storage
- Pages: Unlimited requests, 500 builds / month

Well within range for an MVP.
