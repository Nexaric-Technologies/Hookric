// Hookrick (by nexaric) — Cloudflare Worker entry point.
//
// Routes:
//   GET/POST/PUT/PATCH/DELETE  /r/:endpointId  →  forward to HookAgent DO
//   GET                         /healthz         →  { ok: true, ts }
//   *                           (fallback)       →  404 JSON
//
// The HookAgent (./hook-agent.js) is re-exported so Wrangler's class
// discovery can find it via wrangler.toml's `class_name = "HookAgent"`.

import { HookAgent } from './hook-agent.js';

export { HookAgent };

const ROUTE_R = /^\/r\/([a-z0-9]{4,32})(\/.*)?$/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Healthcheck — free, edge-cached, useful for uptime monitors.
    if (pathname === '/healthz') {
      return new Response(
        JSON.stringify({
          ok: true,
          ts: Date.now(),
          product: env.PRODUCT_NAME || 'hookrick',
          tagline: env.PRODUCT_TAGLINE || 'by nexaric',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
            'access-control-allow-origin': '*',
          },
        }
      );
    }

    // Capture route — forward to the per-endpoint Durable Object.
    const match = pathname.match(ROUTE_R);
    if (match) {
      const endpointId = match[1];
      const id = env.HOOK_AGENT.idFromName(endpointId);
      const stub = env.HOOK_AGENT.get(id);
      return stub.fetch(request);
    }

    // Fallthrough — JSON 404 so curl/Postman get a clear answer.
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'not found',
        hint: 'POST to /r/<your-endpoint-id> to capture a webhook.',
      }),
      {
        status: 404,
        headers: {
          'content-type': 'application/json',
          'access-control-allow-origin': '*',
        },
      }
    );
  },
};
