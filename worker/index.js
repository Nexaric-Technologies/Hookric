// Hookrick (by nexaric) — Cloudflare Worker entry point.
//
// Routes:
//   /r/hook-agent/:endpointId      → Agents SDK DO (hook-agent URL shape)
//   /healthz                         → { ok: true, ts }
//   *                                → 404 JSON
//
// We use `routeAgentRequest` from the `agents` SDK so the SDK can
// handle the WebSocket upgrade handshake properly. The binding
// HOOK_AGENT (class HookAgent) is auto-discovered; its kebab-case
// name "hook-agent" is what appears in the URL.
//
// The user-facing endpoint id is the DO instance name, so the
// generated webhook URL is /r/hook-agent/<id> — see README for
// the Vite/Express dev path that stays at /r/<id>.

import { HookAgent } from './hook-agent.js';
import { routeAgentRequest } from 'agents';

export { HookAgent };

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

    // Capture route — let the Agents SDK route it. `prefix: "r"` so
    // the URL stays /r/hook-agent/<endpointId> instead of the default
    // /agents/hook-agent/<endpointId>. The SDK handles both regular
    // HTTP and WebSocket upgrade requests here.
    const routed = await routeAgentRequest(request, env, {
      prefix: 'r',
      cors: {
        // Permissive CORS — webhook senders come from anywhere
        allowOrigin: '*',
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowHeaders: ['*'],
        exposeHeaders: ['X-Hookrick-Capture'],
        maxAge: 86400,
      },
    });
    if (routed) return routed;

    // Fallthrough — JSON 404 so curl/Postman get a clear answer.
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'not found',
        hint: 'POST to /r/hook-agent/<your-endpoint-id> to capture a webhook.',
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
