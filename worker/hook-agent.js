// HookAgent — Agents SDK Durable Object, one instance per endpointId.
//
// Responsibilities (port of server/src/index.js capture logic to Workers):
//   - Hold WebSocket subscribers for live fan-out
//   - Hold the user's response-builder config (in memory, per spec)
//   - On HTTP request under /r/:id: parse, capture, broadcast, reply
//
// Wire protocol (client → server, JSON over WebSocket):
//   { "type": "join",                 "endpointId": "<id>" }
//   { "type": "leave",                "endpointId": "<id>" }
//   { "type": "response:configure",   "endpointId": "<id>", "config": {...} }
//
// Wire protocol (server → client):
//   { "type": "request:new", "payload": <captured> }

import { Agent } from 'agents';
import { WebhookAnalyzer } from './analyzer.js';

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'x-api-key',
  'api-key',
  'x-auth-token',
  'cookie',
  'set-cookie',
  'x-shopify-access-token',
  'x-shopify-hmac-sha256',
]);

const KNOWN_AGENTS = [
  ['Googlebot', 'Googlebot'],
  ['Postman', 'Postman'],
  ['Insomnia', 'Insomnia'],
  ['curl', 'curl'],
  ['HTTPie', 'HTTPie'],
  ['n8n', 'n8n'],
  ['Zapier', 'Zapier'],
  ['Make', 'Make.com'],
  ['GitHub-Hookshot', 'GitHub Webhook'],
  ['Shopify', 'Shopify'],
  ['WooCommerce', 'WooCommerce'],
  ['Stripe', 'Stripe'],
  ['Slack', 'Slack'],
  ['TelegramBot', 'Telegram'],
  ['WhatsApp', 'WhatsApp'],
  ['facebookexternalhit', 'Meta/Facebook'],
];

export class HookAgent extends Agent {
  // In-memory state — per the user's choice, no SQLite persistence here.
  // Lost on DO eviction; that's fine for an MVP "live capture" tool.
  initialState() {
    return {
      subscribers: 0, // counters only — actual WebSocket set lives on this
      responseConfig: null,
    };
  }

  // ---- WebSocket lifecycle ---------------------------------------------

  async onConnect(conn) {
    // The client tells us which endpointId it wants to receive for. We
    // accept any subscription — the DO is already keyed by endpointId, so
    // the client can only subscribe to its own DO anyway.
    try {
      conn.accept?.();
    } catch {
      /* already accepted by SDK */
    }
  }

  async onMessage(conn, raw) {
    let msg;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'));
    } catch {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'response:configure') {
      // Per-endpoint single-rule store — mirrors server/src/index.js:73-79
      this.setState({ ...this.state, responseConfig: msg.config || null });
      return;
    }

    // join/leave are accepted but no longer needed for routing — every
    // WebSocket on this DO instance is implicitly subscribed. Echo back
    // a small ack so legacy clients don't hang.
    if (msg.type === 'join' || msg.type === 'leave') {
      try {
        conn.send?.(JSON.stringify({ type: msg.type, ok: true }));
      } catch { /* socket closed */ }
    }
  }

  async onClose(conn) {
    // SDK tracks the connection set for us; nothing to clean up here.
  }

  async onError(conn, err) {
    console.error('[hookrick] ws error:', err?.message || err);
  }

  // ---- HTTP capture route ----------------------------------------------

  async onRequest(request) {
    // CORS preflight — webhook senders often probe OPTIONS first.
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    let captured;
    try {
      captured = await captureRequest(request);
    } catch (err) {
      console.error('[hookrick] capture error:', err);
      return new Response(
        JSON.stringify({
          success: false,
          error: err?.message || 'capture failed',
          note: 'The request may have been received but could not be fully parsed.',
        }),
        {
          status: 200, // intentional — caller learns we got it
          headers: { 'content-type': 'application/json', ...corsHeaders() },
        }
      );
    }

    // Broadcast to every connected WebSocket on this DO.
    this.broadcast(JSON.stringify({ type: 'request:new', payload: captured }));

    // Apply user-defined response if one was configured.
    const cfg = this.state?.responseConfig;
    if (cfg) {
      return applyConfiguredResponse(cfg);
    }

    // Default success response.
    return new Response(
      JSON.stringify({
        success: true,
        requestId: captured.id,
        endpointId: captured.endpointId,
        receivedAt: captured.receivedAt,
        message: 'Request captured. Open the hookrick UI to inspect it.',
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'X-Hookrick-Capture': 'ok',
          ...corsHeaders(),
        },
      }
    );
  }
}

// ---- Pure helpers (no DO instance needed) --------------------------------

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': '*',
  };
}

function applyConfiguredResponse(cfg) {
  const status = Number(cfg.status) || 200;
  const headers = new Headers(corsHeaders());
  if (cfg.headers && typeof cfg.headers === 'object') {
    for (const [k, v] of Object.entries(cfg.headers)) {
      try {
        headers.set(k, String(v));
      } catch { /* invalid header name — skip */ }
    }
  }
  if (cfg.body !== undefined && cfg.body !== null) {
    if (typeof cfg.body === 'string') {
      if (!headers.has('content-type')) headers.set('content-type', 'text/plain; charset=utf-8');
      return new Response(cfg.body, { status, headers });
    }
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    return new Response(JSON.stringify(cfg.body), { status, headers });
  }
  return new Response(null, { status, headers });
}

// ---- Capture pipeline -----------------------------------------------------

async function captureRequest(request) {
  const url = new URL(request.url);
  const endpointId = url.pathname.split('/')[2] || '';
  const startedAt = Date.now();
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  const ua = request.headers.get('user-agent') || '';

  // Headers — Workers Headers object is iterable.
  const headers = Object.fromEntries(request.headers.entries());

  // Body: prefer arrayBuffer so we can faithfully reproduce text/JSON,
  // and try formData() for multipart. Plain text bodies use arrayBuffer.
  let rawBytes = new Uint8Array(0);
  let parsedBody = null;
  let bodyKind = 'empty';
  let bodyText = '';
  let formFields = null;
  let files = [];

  try {
    if (contentType.includes('multipart/form-data')) {
      const fd = await request.formData();
      formFields = {};
      for (const [k, v] of fd.entries()) {
        if (typeof v === 'string') {
          formFields[k] = v;
        } else {
          // File entry
          files.push({
            fieldName: v.name || k,
            originalName: v.name || k,
            encoding: 'binary',
            mimeType: v.type || 'application/octet-stream',
            size: v.size ?? 0,
            preview:
              v.size < 64 * 1024 && /text|json|xml|javascript/i.test(v.type || '')
                ? await v.text().then((t) => t.slice(0, 4000))
                : null,
          });
        }
      }
      parsedBody = { ...formFields, _files: files.map((f) => f.originalName) };
      bodyKind = 'multipart';
    } else {
      // Read the raw bytes once; downstream branches re-interpret them.
      const buf = await request.arrayBuffer();
      rawBytes = new Uint8Array(buf);
      bodyText = new TextDecoder('utf-8', { fatal: false }).decode(rawBytes);

      if (contentType.includes('application/json')) {
        parsedBody = safeJsonParse(bodyText);
        bodyKind = parsedBody !== null ? 'json' : 'raw';
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(bodyText);
        formFields = {};
        for (const [k, v] of params) formFields[k] = v;
        parsedBody = formFields;
        bodyKind = 'form';
      } else if (
        contentType.includes('text/') ||
        contentType.includes('application/xml') ||
        contentType.includes('application/javascript')
      ) {
        bodyKind = 'text';
      } else if (rawBytes.length) {
        parsedBody = safeJsonParse(bodyText);
        bodyKind = parsedBody !== null ? 'json' : 'raw';
      }
    }
  } catch (err) {
    bodyKind = 'raw';
    bodyText = bodyText || '';
  }

  const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const receivedAt = new Date().toISOString();

  const ip = pickClientIp(headers);
  const captured = {
    id: requestId,
    endpointId,
    receivedAt,
    processingMs: Date.now() - startedAt,
    method: request.method,
    url: url.pathname + url.search,
    path: url.pathname,
    host: headers.host || url.host,
    protocol: url.protocol.replace(':', ''),
    httpVersion: 'HTTP/1.1', // Workers normalises this
    secure: url.protocol === 'https:',
    ip: {
      remote: ip,
      xForwardedFor: headers['x-forwarded-for'] || null,
      realIp: headers['x-real-ip'] || null,
      country: headers['cf-ipcountry'] || null,
      region: headers['cf-region'] || null,
      city: headers['cf-ipcity'] || null,
      asn: null,
      isp: null,
    },
    tls: {
      secure: url.protocol === 'https:',
      version: headers['x-tls-version'] || null,
      cipher: headers['x-tls-cipher'] || null,
    },
    headers,
    headersMasked: Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k, maskHeaderValue(k, v)])
    ),
    query: Object.fromEntries(url.searchParams.entries()),
    cookies: parseCookies(headers.cookie),
    body: {
      kind: bodyKind,
      contentType,
      rawBase64: rawBytes.length ? bytesToBase64(rawBytes) : null,
      rawText: bodyText,
      prettyJson: bodyKind === 'json' && parsedBody ? JSON.stringify(parsedBody, null, 2) : null,
      parsed: parsedBody,
      form: formFields,
      files,
      size: bodyKind === 'multipart'
        ? files.reduce((s, f) => s + f.size, 0)
        : rawBytes.length,
    },
    auth: {
      basic: decodeBasicAuth(headers.authorization),
      bearer: decodeBearer(headers.authorization),
      apiKey: headers['x-api-key'] || headers['api-key'] || null,
      jwt: decodeBearer(headers.authorization)?.claims || null,
    },
    signatures: detectWebhookSignature(headers),
    userAgent: {
      raw: ua,
      browser: parseBrowser(ua),
      browserVersion: null,
      os: null,
      osVersion: null,
      device: null,
      deviceType: null,
      bot: /bot|spider|crawl|headless/i.test(ua),
      detected: detectAgent(ua),
    },
    timeline: buildTimeline(startedAt),
  };

  captured.analysis = WebhookAnalyzer.analyze(captured);
  return captured;
}

// ---- Body / header helpers (port of server/src/index.js:100-195) --------

function safeJsonParse(text) {
  if (typeof text !== 'string' || !text.length) return null;
  try { return JSON.parse(text); } catch { return null; }
}

function decodeBasicAuth(header) {
  if (!header || !header.toLowerCase().startsWith('basic ')) return null;
  try {
    const decoded = atob(header.slice(6).trim());
    const idx = decoded.indexOf(':');
    if (idx < 0) return { present: true, value: `${decoded.slice(0, 4)}…` };
    return { present: true, user: decoded.slice(0, idx), value: `${decoded.slice(0, idx).slice(0, 4)}…` };
  } catch { return null; }
}

function decodeBearer(header) {
  if (!header || !header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  let claims = null;
  let expires = null;
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(b64));
      claims = payload;
      expires = payload.exp ? new Date(payload.exp * 1000).toISOString() : null;
    } catch { /* not a JWT */ }
  }
  return { present: true, length: token.length, preview: token.slice(0, 6) + '…', claims, expires };
}

function detectWebhookSignature(headers) {
  const h = lowercaseKeys(headers);
  const out = [];
  if (h['stripe-signature']) out.push({ provider: 'Stripe', present: true });
  if (h['x-hub-signature-256'] || h['x-hub-signature']) out.push({ provider: 'GitHub', present: true });
  if (h['x-shopify-hmac-sha256']) out.push({ provider: 'Shopify', present: true });
  if (h['x-wc-webhook-signature']) out.push({ provider: 'WooCommerce', present: true });
  if (h['x-hub-signature'] && h['x-meta-app-id']) out.push({ provider: 'Meta', present: true });
  if (h['x-slack-signature']) out.push({ provider: 'Slack', present: true });
  if (h['x-telegram-bot-api-secret-token']) out.push({ provider: 'Telegram', present: true });
  return out;
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .reduce((acc, p) => {
      const idx = p.indexOf('=');
      if (idx < 0) acc[p] = '';
      else {
        try {
          acc[p.slice(0, idx)] = decodeURIComponent(p.slice(idx + 1));
        } catch {
          acc[p.slice(0, idx)] = p.slice(idx + 1);
        }
      }
      return acc;
    }, {});
}

function pickClientIp(headers) {
  const xff = headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return headers['x-real-ip'] || headers['cf-connecting-ip'] || '';
}

function maskHeaderValue(name, value) {
  if (!SENSITIVE_HEADERS.has(name.toLowerCase())) return value;
  if (typeof value !== 'string' || value.length < 8) return '••••';
  return value.slice(0, 4) + '…' + value.slice(-2);
}

function lowercaseKeys(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

function parseBrowser(_ua) {
  // Lightweight UA parser (Workers has no ua-parser-js). The detail-rich
  // fields remain null; the "detected" + "bot" fields cover the common
  // automation tools we care about.
  return null;
}

function detectAgent(ua) {
  if (!ua) return 'unknown';
  for (const [needle, label] of KNOWN_AGENTS) {
    if (ua.toLowerCase().includes(needle.toLowerCase())) return label;
  }
  return null;
}

function buildTimeline(receivedAt) {
  return [
    { label: 'Request received', ts: receivedAt, ms: 0 },
    { label: 'Headers parsed', ts: receivedAt + 0.5, ms: 0.5 },
    { label: 'Body parsed', ts: receivedAt + 1, ms: 1 },
    { label: 'Broadcast to subscribers', ts: receivedAt + 1.5, ms: 1.5 },
  ];
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
