# HookRick — Engineering Notes

> The "how it works" doc. Read this if you want to extend the capture
> pipeline, the client store, or the deployment.

## High-level shape

```
                       ┌────────────────────────────┐
                       │   Cloudflare Pages (CDN)   │
   Browser ◀──HTTPS──▶│   hookrick.pages.dev        │
                       │   (static SPA, no SSR)     │
                       └────────────────────────────┘
                                  │ WebSocket
                                  ▼
                       ┌────────────────────────────┐
                       │  Cloudflare Worker         │
                       │  hookrick.nexaricdigital   │
                       │  .workers.dev              │
                       │  /r/hook-agent/:id         │
                       └─────────────┬──────────────┘
                                     │  routes by idFromName(id)
                                     ▼
                          ┌──────────────────────┐
                          │ HookAgent (Durable   │
                          │ Object) — one per ID │
                          │ ┌──────────────────┐ │
                          │ │ ws subscribers   │ │
                          │ │ response config  │ │
                          │ │ in-memory only   │ │
                          │ └──────────────────┘ │
                          └──────────────────────┘
                                     ▲
                                     │  POST /r/hook-agent/:id
                                     │
                       ┌─────────────┴──────────────┐
                       │  External HTTP client      │
                       │  (curl, Stripe, n8n, etc)  │
                       └────────────────────────────┘
```

Three tiers, zero shared state between endpoints:

- **Browser** — owns the URL, the socket, the store, the persistence
- **Worker** — routes by `endpointId` to the right DO, handles the WS upgrade
- **Durable Object** — owns the in-memory state for a single endpoint

There is no central DB. The Worker doesn't keep a list of endpoints; it
relays each request to the DO whose name is in the URL, and forgets.

## Why per-endpoint Durable Objects

A single global Worker holding a `Map<id, Set<WebSocket>>` would also work,
but it has three problems we explicitly avoid with DOs:

1. **Cold-start contention.** A new region spinning up the global Worker
   is a thundering herd. DOs are spun up lazily, on first request to a
   given id, and stay warm as long as they get traffic.
2. **Tenant isolation.** With a global map, a bug in cleanup logic could
   leak one endpoint's sockets into another. DOs are addressable by id,
   so a request to `/r/abc` physically cannot touch the DO for `/r/xyz`.
3. **Memory pressure.** A flat `Map<id, ...>` in a single Worker ties
   the in-memory cost of every active endpoint to one process. DOs
   fan out across the DO fleet.

The trade-off is a slightly higher first-request latency (DO spin-up is
~50 ms cold). We pay that once per endpoint, and not per request.

## Wire protocol

The client connects via the Cloudflare Agents SDK
(`AgentClient` from `agents/client`, PartySocket under the hood). The URL
shape is `/r/hook-agent/<endpointId>` — the `hook-agent` segment is the
kebab-case of the `HookAgent` DO class binding.

The same connection carries JSON messages in both directions:

**Client → server:**

```json
{ "type": "join",                 "endpointId": "abc123" }
{ "type": "leave",                "endpointId": "abc123" }
{ "type": "response:configure",   "endpointId": "abc123", "config": { ... } }
```

**Server → client:**

```json
{ "type": "request:new",          "payload": { ... } }
```

A `request:new` payload is the full captured request: id, timestamp,
method, path, headers, body, query, cookies, network info, timing, and
the auto-analysis from `WebhookAnalyzer`. See
`worker/hook-agent.js#captureRequest` for the exact shape.

## Capture pipeline

`worker/hook-agent.js` exposes an `Agent` subclass with a `fetch` method
that the Agents SDK calls for non-upgrade requests. The pipeline:

1. **Read body verbatim.** `await request.arrayBuffer()` — no streaming
   parse, no charset sniffing. We preserve the bytes as the source of
   truth, and parse a *copy* downstream.
2. **Build the body view.** A 25 MB cap (configurable via the constant
   `MAX_BODY_SIZE`). Multipart is parsed with the request's own
   `formData()`; JSON / form-urlencoded / text are detected from
   `Content-Type` and run through `JSON.parse` only on demand (the raw
   buffer is always available).
3. **Resolve network metadata.** Workers receive `request.cf` with the
   `cf.colo`, `cf.country`, `cf.city`, `cf.asn`, and TLS metadata. We
   attach these to the payload, but never to logs.
4. **Analyze.** `WebhookAnalyzer.analyze()` produces a derived view:
   JSON shape, auth summary, signature presence, body stats, and a
   "is this a webhook?" heuristic (UA match, signature header, JSON
   shape with `event`/`type`/`id`).
5. **Fan out.** For each WebSocket subscriber on this DO, send a
   `request:new` message. We don't wait for ack; the SDK is fire-and-
   forget. If a subscriber is slow, the SDK buffers; if it's dead, the
   `close` event drops it from the set.
6. **Apply the response config.** If the user has configured a mock
   response (status, headers, body), we use it; otherwise `200 OK` with
   a JSON ack.
7. **Forget.** The DO does not persist the request. The browser's
   store is the only copy after the broadcast.

## Body parsing

The body is always stored as a `Uint8Array` (`raw` field). The
client-side store adds a `body` view that can be:

- **Raw** — the bytes, hex-escaped for non-printable
- **Text** — UTF-8 decoded
- **JSON** — pretty-printed with syntax highlighting
- **Form** — `URLSearchParams` rendered as a key/value table
- **Multipart** — each part with its own `Content-Type`, filename, and
  base64-encoded content

The parser is content-type aware:

```js
const ct = (headers['content-type'] || '').toLowerCase();
if (ct.includes('application/json'))            → JSON.parse(raw)
else if (ct.includes('application/x-www-form-urlencoded')) → new URLSearchParams(raw)
else if (ct.includes('multipart/form-data'))   → request.formData()
else                                              → UTF-8 text
```

We never re-serialize the parsed body — we keep the raw buffer and
the parsed view side-by-side. The UI lets the user toggle, and copy
either one to the clipboard.

## Realtime fan-out

The DO holds a `Set<WebSocket>`. On connect, the Agents SDK calls
`onConnect(connection, ctx)`; we add the socket. On `onMessage`, we
parse the JSON envelope and apply the action (join, leave, response
configure). On `onClose`, we remove the socket. The set is a plain
`Set`, not a `Map<socket, metadata>`, because we don't track per-
subscriber state — the same connection is both the data plane and the
control plane.

A single endpoint can have multiple subscribers (think: two browser
tabs open against the same URL). They all see every request.

We don't replay history on connect — that would be expensive and the
browser already has the data. The browser's IndexedDB is the source of
truth for "what happened before I opened this tab".

## Sensitive header masking

Some headers are dangerous to display in a UI that might be
screen-shared or streamed:

- `Authorization`
- `X-Api-Key`, `Api-Key`
- `X-Auth-Token`
- `Cookie`, `Set-Cookie`
- `X-Shopify-Access-Token`
- `X-Shopify-Hmac-Sha256`

The masking happens **on the client**, not on the server, for two
reasons:

1. The server doesn't know what's sensitive in your context. Your
   internal `X-Internal-Token` may not be in our list, and that's fine
   — you can add it to the mask list in `client/src/components/RequestDetails.jsx`.
2. We want the raw bytes for replay. If the server masked them, the
   "replay this request" button would send a redacted version, which
   defeats the point.

The mask is a UI-level redaction: the original header is in the
captured payload, but the rendered table shows `••••••••` instead.
You can click the eye icon to reveal.

## Response builder

Each endpoint can have one active response config:

```json
{
  "status":  201,
  "headers": { "X-Custom": "value" },
  "body":    "{\"ok\":true}"
}
```

Stored in the DO, set via the `response:configure` WS message, and
applied to every inbound capture request. Defaults to `200 OK` with
a JSON ack. The DO doesn't validate the body — it's your output, your
formats.

If you send a multipart body, the SDK won't auto-serialize it for
you. The `body` field is sent verbatim as the response body, with the
`Content-Type` you set in the headers.

## Storage on the client

| Layer           | Used for                                    | Quota       |
|-----------------|---------------------------------------------|-------------|
| LocalStorage    | endpoint id, theme, response config, prefs  | ~5 MB       |
| IndexedDB       | request bodies (raw + parsed)               | browser-quota|
| SessionStorage  | (unused)                                    | ~5 MB       |

The store is `client/src/lib/useWebhookStore.js` — a vanilla
React + `useSyncExternalStore` pattern, no Redux/Zustand. Two
mutator types: `addRequest` (server-driven, append-only) and
`replaceAll` (clear / import). Persisted to LocalStorage on every
change with a debounced flush.

## PWA + push notifications

The Notification API is a **client-side** push, not a Web Push. We
don't need a push server, VAPID keys, or a service worker push
subscription. The trade-off is that the browser tab must be loaded
in some form (active, background, or just recently used) for the
notification to fire. We use `serviceWorker.ready` if a service
worker is registered, otherwise `new Notification(...)` directly.

The flow:

1. User clicks the bell icon → `Notification.requestPermission()`
2. On `granted`, the store flips a `notifyEnabled: true` flag (also
   persisted to LocalStorage)
3. On every `request:new`, if the tab is hidden, we fire a
   `Notification` with the method, path, and a snippet of the body
4. Clicking the notification focuses the tab and selects the new
   request

If the user denies, we silently disable the bell and show a tooltip
explaining how to re-enable in the browser settings.

## Performance budget

Production bundle (gzipped, as of this writing):

- `index.html`         —  3.4 KB
- `index-*.css`        —  6.4 KB
- `index-*.js`         — 80.0 KB

Time to first paint on a fresh cache: < 600 ms on a slow 3G connection.
Time to interactive: < 1.2 s. We do not ship a framework beyond React;
no router, no state library, no UI kit.

Fonts are loaded via `<link rel="preconnect">` to Google Fonts with
`display=swap`, so text is never invisible during font load. CLS is
zero — we set explicit dimensions on the OG image and the icon.

## Testing

We don't ship automated tests. The integration test is "send a curl,
see it in the browser", and the surface area is small enough that
this is faster to verify than to encode as a unit test. The CI
(`.github/workflows/ci.yml`) covers:

- Client build (`npm run build` in `client/`)
- Worker dry-run (`wrangler deploy --dry-run` in `worker/`)

Manual test checklist before a release:

- [ ] Open `hookrick.pages.dev`, copy endpoint, send `curl` POST,
      see the request land live
- [ ] Click "Response", set status 418, send another `curl`, see
      the 418 echoed back
- [ ] Click the bell, accept notification permission, send a third
      `curl`, see an OS notification
- [ ] Hard-refresh — the last 5 requests should still be in the list
- [ ] Open the same URL in a second tab — both tabs see new requests
- [ ] Resize to mobile width — layout collapses cleanly, modals center
- [ ] Toggle dark mode — no flash of wrong-theme content

## TODO list (in priority order)

- [ ] Migrate to Cloudflare's newer agent SDK when it leaves beta
- [ ] Add VAPID-based Web Push so notifications work with the tab
      fully closed
- [ ] Add a "Replay to URL" feature — POST the captured body to a
      user-supplied endpoint for staging-environment testing
- [ ] Add a request-diff view (compare two captures side by side)
- [ ] Add a "save as test case" feature (export a `.har` file)

---

For product context, see [`docs/PRODUCT.md`](./PRODUCT.md). For the
original product spec, see [`docs/PRODUCT-PRD.md`](./PRODUCT-PRD.md).
For security disclosures, see [`SECURITY.md`](../SECURITY.md).
