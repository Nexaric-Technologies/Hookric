# Contributing to HookRick

Thanks for your interest in HookRick! HookRick is built and maintained by
[NeXaric](https://nexaric.com) and the open-source community. This document
explains how to get set up locally, our conventions, and how to land a change.

> **TL;DR**
> 1. `npm run install:all`
> 2. `npm run dev` (client on `:5173`, capture server on `:4000`)
> 3. Open the site, send a curl to `http://localhost:4000/r/<your-id>`, see it land live
> 4. Branch, change, PR

---

## Code of Conduct

This project follows the [Contributor Covenant 2.1](./CODE_OF_CONDUCT.md). By
participating, you agree to uphold it. Report issues to **contact@nexaric.com**.

## Reporting bugs

Open a [GitHub issue](../../issues). Use the **Bug report** template. Include:

- Browser + version
- Operating system
- The endpoint ID you're hitting (so we can correlate server logs)
- The exact `curl` (or Postman screenshot) that reproduces the issue
- What you expected vs what happened

**Do not include** the body of an inbound webhook if it contains secrets.
HookRick is a debugging tool, but the capture server is multi-tenant — your
endpoint is private, not the rest of the platform.

## Suggesting features

Open a GitHub issue with the **Feature request** template. We prioritize work
that helps the most common debugging flows:

- Webhook integration authors (Stripe, Shopify, n8n, Zapier, Make)
- SaaS developers testing outgoing webhooks
- QA teams running black-box integration tests

## Development setup

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- A Cloudflare account (only required for the Worker path — for client-only
  changes you don't need this)

### Install

```bash
git clone https://github.com/Nexaric-Technologies/Hookrick
cd Hookrick
npm run install:all
```

This installs the root, the `client/`, the `server/`, and (optionally) the
`worker/` packages.

### Run the full local stack

```bash
npm run dev
```

This uses `concurrently` to start:

- **client** — Vite on http://localhost:5173
- **server** — Express + Socket.IO capture server on http://localhost:4000

The Vite dev server proxies `/r/*`, `/api/*`, and `/socket.io/*` to the
Express server. Open http://localhost:5173, copy the endpoint ID, and:

```bash
curl -X POST http://localhost:4000/r/<your-id> \
  -H "Content-Type: application/json" \
  -d '{"event":"test","hello":"world"}'
```

The request appears live in the browser.

### Run the Worker in dev mode (optional)

If you're working on the Cloudflare Worker + Durable Object path:

```bash
cd worker
npm run dev       # wrangler dev on http://localhost:8787
```

Point the client at the local worker by setting in `client/.env.local`:

```env
VITE_HOOKRICK_API=http://localhost:8787
```

### Build

```bash
npm run build                 # build the client to client/dist/
cd worker && npm run deploy   # deploy the worker (requires wrangler login)
cd client && npx wrangler pages deploy dist --project-name hookrick
```

Or in one shot from the root:

```bash
npm run deploy
```

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
│       └── analyzer.js        Body/auth/UA analysis
├── worker/                    Cloudflare Worker + Agents SDK
│   ├── index.js               Worker fetch router
│   ├── hook-agent.js          HookAgent Durable Object
│   ├── analyzer.js            Mirror of server/src/analyzer.js
│   └── wrangler.toml          DO bindings + env vars
├── docs/                      Engineering + product docs
└── .github/                   Workflows + issue templates
```

## Conventions

### Branching

- `main` is always deployable
- Branch from `main` using a descriptive name: `fix/proxy-prefix-collision`,
  `feat/push-notification-payload`, `docs/architecture-diagram`
- One feature per branch, one PR per branch

### Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add JSON-LD breadcrumb schema
fix: vite proxy prefix-match collision
docs: architecture overview
chore: bump wrangler to 4.103
refactor: split ResponseSheet into mobile + desktop nodes
```

### Code style

- JavaScript: ESM, no TypeScript in `client/`, plain functions over classes
  where possible
- React: hooks, function components, no Redux/Zustand (the app uses its own
  200-line store — see `client/src/lib/useWebhookStore.js`)
- Tailwind utility-first, custom tokens in `client/src/index.css`
- We do **not** add tests for trivial components. The integration test
  surface is "send a curl, see it in the browser" — a manual happy-path
  check is enough for most changes.

### When to update which file

| Change kind             | Update                                    |
|-------------------------|-------------------------------------------|
| New env var             | `worker/wrangler.toml` + this doc + README|
| New API route           | `docs/ENGINEERING.md` API reference        |
| New UI feature          | `docs/ENGINEERING.md` if it's interesting |
| Security-sensitive      | `SECURITY.md` + `docs/SECURITY.md`        |
| Config / build changes  | Top-level `README.md` Quick Start         |

## Areas that need help

The maintainers (NeXaric) handle the capture pipeline and the durable-object
plumbing. We welcome contributions in:

- **Body formatters** — `client/src/lib/format.js` ships JSON / form-urlencoded
  / raw / pretty. JWT, GraphQL, Protobuf, msgpack, and XML CDATA pretty-printers
  are welcome.
- **Language SDKs** — `client/src/lib/format.js` generates snippets in
  cURL, fetch, axios, Python `requests`, Go `net/http`, etc. Adding Ruby,
  PHP, Java, and Rust would be lovely.
- **Theming** — `client/src/index.css` defines the design tokens. New themes
  (solarized, high-contrast, terminal) can be a single `:root` block.
- **A11y audit** — ARIA, keyboard navigation, screen-reader announcements for
  new requests.
- **Docs** — anything in `docs/` that feels under-explained.

## Maintainer SLA

We aim to:

- Triage new issues within **3 business days**
- Review a PR within **5 business days** of the first push
- Cut a release once a month from `main`

We don't promise to merge every PR. We do promise to review them fairly
and tell you why if we don't.

## License

By contributing, you agree that your contributions will be licensed under
the [MIT License](./LICENSE).
