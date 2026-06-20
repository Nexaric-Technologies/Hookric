<div align="center">

# HookRick

**Instant webhook inspector — by [NeXaric](https://nexaric.com)**

*Open the page, copy the URL, fire any HTTP request, watch it land live.
No signup. No database. Edge-native.*

<br/>

[![MIT License](https://img.shields.io/badge/license-MIT-111111.svg)](./LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/edge-Cloudflare-F38020.svg?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Cloudflare Pages](https://img.shields.io/badge/hosting-Cloudflare%20Pages-F38020.svg?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![React](https://img.shields.io/badge/React-18-149ECA.svg?logo=react&logoColor=white)](https://react.dev)
[![Durable Objects](https://img.shields.io/badge/state-Durable%20Objects-F38020.svg)](https://developers.cloudflare.com/durable-objects)
[![Live](https://img.shields.io/badge/live-hookrick.pages.dev-346538.svg)](https://hookrick.pages.dev)

<br/>

[**Live demo**](https://hookrick.pages.dev) · [**Quick start**](#quick-start) · [**Engineering**](./docs/ENGINEERING.md) · [**Product**](./docs/PRODUCT.md) · [**Deploy your own**](#deploy-your-own)

<br/>

<a href="https://deploy.workers.cloudflare.com/?url=https://github.com/Nexaric-Technologies/Hookrick">
  <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare" width="180"/>
</a>

</div>

---

## What is HookRick?

HookRick is a free, zero-signup webhook debugger that runs on the edge.
Open the page, and you instantly get a unique URL like:

```
https://hookrick.pages.dev/r/hook-agent/aB3xY9Zp
```

Anything you `POST`, `GET`, `PUT`, or `DELETE` to that URL appears in
your browser in real time, with the full headers, body, query params,
cookies, network metadata, and auto-analysis parsed and ready to
inspect.

There's no signup, no account, no database. The endpoint lives in your
browser. The server is a relay.

It's built for:

- **Webhook integrators** testing outbound from Node / Python / Go
- **No-code builders** inspecting what n8n / Zapier / Make is sending
- **SaaS developers** debugging Stripe, Shopify, GitHub, Twilio hooks
- **QA teams** replaying captured requests against staging

## Demo

```bash
# Open https://hookrick.pages.dev, copy the endpoint URL, then:
curl -X POST https://hookrick.nexaricdigital.workers.dev/r/hook-agent/aB3xY9Zp \
  -H "Content-Type: application/json" \
  -d '{"event":"order.created","amount":4200,"customer":"cus_42"}'
```

The request appears in the browser within ~50 ms. Click it to inspect
headers, body, query, cookies, and the auto-generated analysis.

## Quick start

```bash
git clone https://github.com/Nexaric-Technologies/Hookrick
cd Hookrick
npm run install:all
npm run dev
```

This starts the full local stack:

- **Client** — http://localhost:5173 (Vite + React)
- **Capture server** — http://localhost:4000 (Express + Socket.IO)

Send your first request:

```bash
curl -X POST http://localhost:4000/r/abc123 \
  -H "Content-Type: application/json" \
  -d '{"hello":"world"}'
```

You should see it land in the open browser tab within ~30 ms.

## Architecture

HookRick is three tiers, no shared state between endpoints:

```
       Browser ◀──HTTPS──▶ Cloudflare Pages
                                │ WebSocket
                                ▼
                          Cloudflare Worker
                                │ routes by idFromName(id)
                                ▼
                          HookAgent (Durable Object)
                          one per endpoint ID
                          in-memory WS subscribers
                          in-memory response config
```

The Worker does no work beyond routing. Each endpoint maps to its own
Durable Object instance, which fans out captured requests to its
WebSocket subscribers. There is no central DB. The browser's
LocalStorage + IndexedDB is the only place anything is persisted.

For the deep dive — wire protocol, body parsing, fan-out semantics,
sensitive-header masking, the response builder, push notifications,
performance budget, and the TODO list — see
[**docs/ENGINEERING.md**](./docs/ENGINEERING.md).

## Project layout

```
.
├── client/                    Vite + React + Tailwind
│   ├── src/App.jsx            Top-level page
│   ├── src/components/        EndpointCard, RequestList, RequestDetails, ...
│   ├── src/lib/               socket, storage, notifications, store, format
│   ├── public/                PWA manifest, robots, sitemap, OG image
│   └── index.html             SEO + JSON-LD
├── server/                    Express + Socket.IO (local dev only)
│   └── src/
│       ├── index.js           Capture + broadcast
│       └── analyzer.js        Body / auth / UA analysis
├── worker/                    Cloudflare Worker + Agents SDK
│   ├── index.js               Worker fetch router
│   ├── hook-agent.js          HookAgent Durable Object
│   ├── analyzer.js            Mirror of server/src/analyzer.js
│   └── wrangler.toml          DO bindings + env vars
├── docs/
│   ├── PRODUCT.md             User-facing product doc
│   ├── PRODUCT-PRD.md         Original product requirements
│   └── ENGINEERING.md         Deep technical notes
├── .github/
│   ├── workflows/ci.yml       Build + worker dry-run
│   ├── ISSUE_TEMPLATE/        Bug + feature request forms
│   └── dependabot.yml         Weekly dep updates
├── LICENSE                    MIT
├── CONTRIBUTING.md            How to contribute
├── CODE_OF_CONDUCT.md         Contributor Covenant 2.1
└── SECURITY.md                Vulnerability disclosure
```

## Deploy your own

The fastest way is the one-click button at the top of this README. It
forks the repo to your GitHub account, provisions a Cloudflare account
linkage, and walks you through deploying both the Worker and the Pages
site.

If you'd rather do it manually:

```bash
# 1. Install wrangler and log in
npm install -g wrangler
wrangler login

# 2. Create the Pages project for the React client
wrangler pages project create hookrick --production-branch main

# 3. Deploy the capture API (Worker + Durable Objects)
npm run deploy:worker

# 4. Build the client and deploy to Pages
npm run deploy:client
```

Or both in one shot from the root:

```bash
npm run deploy
```

After the first deploy you'll have:

- **Client** — `https://hookrick.pages.dev`
- **API** — `https://hookrick.<your-subdomain>.workers.dev`
- **WebSocket** — `wss://hookrick.<your-subdomain>.workers.dev`

### Custom domain

To use `hookrick.com`:

1. Add `hookrick.com` to Cloudflare (Add Site → free plan)
2. **Pages** → `hookrick` project → Custom domains → `hookrick.com` and
   `www.hookrick.com`
3. **Workers** → `hookrick` → Triggers → Routes → `api.hookrick.com/*`
4. Uncomment the `routes = [...]` block in `worker/wrangler.toml` and
   re-deploy

### Configuration

Worker env vars (set in `worker/wrangler.toml` `[vars]`):

| Name              | Default                | Purpose                          |
|-------------------|------------------------|----------------------------------|
| `PRODUCT_NAME`    | `hookrick`             | Product name in `/healthz`       |
| `PRODUCT_TAGLINE` | `by NeXaric`           | Subtitle in `/healthz`           |
| `CAPTURE_HEADER`  | `X-Hookrick-Capture`   | Marker header on every response  |

Client env vars (set in `client/.env.local`):

| Name                  | Purpose                          |
|-----------------------|----------------------------------|
| `VITE_HOOKRICK_API`   | Override the API base URL        |

## API reference

### `POST /r/hook-agent/<endpointId>`

Capture a webhook. Returns the assigned request id and a JSON ack.

```bash
curl -X POST https://hookrick.nexaricdigital.workers.dev/r/hook-agent/abc123 \
  -H "Content-Type: application/json" \
  -d '{"event":"test"}'
```

```json
{
  "success": true,
  "requestId": "req_abc123_xyz",
  "endpointId": "abc123",
  "receivedAt": "2026-06-21T10:00:00.000Z",
  "message": "Request captured. Open the hookrick UI to inspect it."
}
```

Other methods (`GET`, `PUT`, `PATCH`, `DELETE`) work the same way.

### `GET /healthz`

Liveness probe. Free, edge-cached, useful for uptime monitors.

```json
{ "ok": true, "ts": 1781985000000, "product": "hookrick", "tagline": "by NeXaric" }
```

### WebSocket protocol

The client opens a WebSocket to `/r/hook-agent/<endpointId>`. See
[**docs/ENGINEERING.md**](./docs/ENGINEERING.md#wire-protocol) for the
full wire protocol and the response-builder schema.

## Free-tier limits

HookRick is designed to stay free on Cloudflare's free tier:

- **Workers** — 100,000 requests / day
- **Durable Objects** — 1 GB / month of stored state (we use in-memory,
  not SQLite, so this is generous)
- **Pages** — unlimited static hosting
- **WebSockets** — same Workers limit; up to 32 concurrent per DO

If you self-host and need more, the Worker is one file. Drop it on
Fly.io, Railway, or your own Kubernetes — see
[**docs/ENGINEERING.md**](./docs/ENGINEERING.md#testing) for what to
verify before a release.

## Observability

Workers logs and DO analytics are free. Tail live requests with:

```bash
cd worker
npx wrangler tail --format=pretty
```

## Contributing

We welcome bug reports, feature requests, and PRs. See
[**CONTRIBUTING.md**](./CONTRIBUTING.md) for the workflow, commit
conventions (Conventional Commits), and the maintainer SLA. The issue
templates (`.github/ISSUE_TEMPLATE/`) guide you through what info to
include.

Areas that especially need help:

- **Body formatters** — JWT, GraphQL, Protobuf, msgpack, XML CDATA
- **Language SDKs** — Ruby, PHP, Java, Rust code-snippet generators
- **Theming** — solarized, high-contrast, terminal
- **A11y audit** — ARIA, keyboard navigation, screen-reader announcements
- **Docs** — anything in `docs/` that feels under-explained

## Team NeXaric

HookRick is built and maintained by **NeXaric**, a tiny studio
shipping sharp developer tools. We're based everywhere and the
maintainers answer on GitHub.

- Website: [nexaric.com](https://nexaric.com)
- Contact: [contact@nexaric.com](mailto:contact@nexaric.com)
- Security: [security@nexaric.com](mailto:security@nexaric.com)
  (private disclosure only — see [SECURITY.md](./SECURITY.md))

## License

[MIT](./LICENSE) © 2026 NeXaric Technologies.

## Acknowledgements

HookRick stands on the shoulders of:

- [Cloudflare Workers](https://workers.cloudflare.com) + [Agents SDK](https://developers.cloudflare.com/agents) + [Durable Objects](https://developers.cloudflare.com/durable-objects)
- [React](https://react.dev) + [Vite](https://vitejs.dev) + [Tailwind CSS](https://tailwindcss.com)
- [lucide-react](https://lucide.dev) for icons
- [qrcode](https://github.com/soldair/node-qrcode) for endpoint QR codes
- [Contributor Covenant](https://www.contributor-covenant.org) for the Code of Conduct
