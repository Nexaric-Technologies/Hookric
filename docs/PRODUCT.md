# HookRick — Product

> A free, zero-signup webhook inspector by [NeXaric](https://nexaric.com).
> Open the site, copy the URL, fire any HTTP request, watch it land live.

## What it is

HookRick gives every visitor a unique webhook URL the moment the page loads.
Anything you send to that URL — `POST`, `GET`, `PUT`, `PATCH`, `DELETE` —
appears in the browser in real time, with the full headers, body, query
parameters, cookies, and metadata parsed and ready to inspect.

There is no signup, no account, no database. The endpoint lives in the
browser. The server only relays.

## Why it exists

Webhook debugging is a chore:

- Most services (Stripe, Shopify, GitHub, Twilio, n8n) send signed
  webhooks with no easy way to inspect them in transit.
- A misconfigured webhook URL is silent: nothing logs, nothing alerts.
- Dev environments change daily; tunneling (ngrok, Cloudflare Tunnel)
  works but is overkill for "show me the last 5 requests".
- Postman and Insomnia can send, but they can't easily receive.

HookRick is the receive side. It also generates the request, so a
debugging session is one tab + one terminal.

## Who it's for

| Audience                     | Typical use                                    |
|------------------------------|------------------------------------------------|
| **Webhook integrators**      | Test outbound from a Node / Python / Go app     |
| **No-code builders**         | Inspect what n8n / Zapier / Make is sending    |
| **SaaS developers**          | Debug incoming webhooks from Stripe, Shopify   |
| **QA teams**                 | Replay captured requests against a staging env  |
| **Students learning APIs**   | See the raw wire format without setup friction  |

## Core principles

1. **Zero friction.** No signup. No login. No "create an account" modal.
   Open the page, get an endpoint. Refresh, get a new one.
2. **Server stores nothing.** Every request is parsed, broadcast, and
   dropped in the same event loop tick. Capture is a relay, not a log.
3. **Client owns persistence.** Requests are persisted in LocalStorage
   (metadata) and IndexedDB (raw bodies). Export, share, replay — all
   from the browser.
4. **Inspect, don't transform.** We don't normalize, redact, or
   reformat your data. We show you the bytes the server received.
5. **Push notifications, on your terms.** Subscribe once, get an OS-level
   notification every time a webhook lands. No email, no webhook-of-webhooks.

## Capture contract

For every request, HookRick captures:

- **Request line** — method, path, query, HTTP version
- **Headers** — all of them, with sensitive ones (Authorization, API keys,
  cookies) masked in the UI but kept raw locally for replay
- **Body** — verbatim, with auto-formatting for JSON, form-urlencoded,
  multipart, and raw text. Multipart files are inlined as base64
- **Network** — source IP, X-Forwarded-For, ASN, country, region, city
  (when available)
- **TLS** — protocol version, cipher
- **Timing** — server arrival time, processing duration
- **UA** — parsed family / version / OS / device, plus a guess at the
  sending service (Postman, n8n, Zapier, Stripe, Shopify, Slack, ...)
- **Auto-analysis** — JSON shape, auth summary, signature presence,
  body stats, "is this a webhook?" heuristic

## Privacy posture

- **Authorship**: the server never logs bodies. Workers tail shows
  metadata only.
- **Tenant isolation**: each endpoint ID maps to its own Durable Object
  instance. One endpoint's traffic cannot read another's.
- **Local encryption**: client-side persistence is at the browser's
  storage origin. The user is responsible for clearing it (the UI has a
  "Clear all" button).
- **No third-party tracking**: no analytics, no telemetry, no cookies,
  no fingerprinting. The site is one document, one bundle, one socket.
- **Push notifications are local**: the browser's Notification API
  doesn't go through a server. We never see whether a notification fired.

## What HookRick is not

- **Not a request bin** for production traffic. There's no auth, no SLA,
  and no retention. Use it for development and debugging only.
- **Not a proxy / tunnel.** We don't forward to your dev box. We receive.
- **Not a webhook router.** One endpoint in, one UI out. If you need
  fan-out to multiple services, run a small worker.
- **Not a payment processor / PCI zone.** Don't send card data to it.
  Don't send HIPAA data to it. Don't send data to it that you wouldn't
  send to a stranger on a public Wi-Fi network.

## Out of scope (current version)

- Saved searches / collections (LocalStorage is the user's job)
- Multi-user sharing (the share button generates a self-contained file)
- Webhook playback to arbitrary targets (we do replay locally)
- Custom TLS certs / pinning
- Webhook signing / verification (Stripe, GitHub HMAC)

## Versioning

HookRick is pre-1.0. The semantic contract is:

- Breaking changes bump the major version
- The capture wire format and the response builder schema are stable
  across minor versions
- The Durable Object migration tags (`v1`, `v2`, ...) match Worker deploys

See [`docs/PRODUCT-PRD.md`](./PRODUCT-PRD.md) for the original product
spec, and [`docs/ENGINEERING.md`](./ENGINEERING.md) for how it works
under the hood.
