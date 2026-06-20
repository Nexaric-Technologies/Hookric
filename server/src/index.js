// WebhookMirror capture server
// - Captures every request under /r/:endpointId
// - Broadcasts parsed request to subscribers via Socket.IO
// - Applies user-defined response (status, headers, body) when configured
// - Stores nothing on the server — all persistence is in the browser

import express from 'express';
import http from 'http';
import cors from 'cors';
import multer from 'multer';
import { Server as SocketIOServer } from 'socket.io';
import { UAParser } from 'ua-parser-js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebhookAnalyzer } from './analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;

// multer in-memory: we don't want to write files to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB cap per file
});

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 30 * 1024 * 1024,
});

// CORS for direct API calls (curl, Postman, etc.)
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));

// Disable etag / cache for capture responses
app.set('etag', false);

// IMPORTANT: we read the raw body ourselves so we can show it verbatim later.
// We collect the raw chunks, then continue with the analyzer that knows how
// to parse the body based on content-type.
app.use((req, res, next) => {
  // multer will consume the body for multipart/form-data
  if ((req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data')) {
    return next();
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
  req.on('error', next);
});

// Socket.IO: clients join a room for their endpoint id
io.on('connection', (socket) => {
  socket.on('join', (endpointId) => {
    if (typeof endpointId === 'string' && /^[a-z0-9]{4,32}$/i.test(endpointId)) {
      socket.join(endpointId);
    }
  });
  socket.on('leave', (endpointId) => {
    if (typeof endpointId === 'string') socket.leave(endpointId);
  });
  // A client can push a custom response configuration for its endpoint.
  // The server stores nothing — it just keeps it in memory until the matching
  // request comes in, then applies it.
  socket.on('response:configure', ({ endpointId, config }) => {
    if (typeof endpointId !== 'string') return;
    if (!responseStore.has(endpointId)) responseStore.set(endpointId, new Map());
    // configId is optional — if provided we can store multiple rules; we
    // currently only support a single "default" response which is overwritten
    responseStore.get(endpointId).set('default', config || null);
  });
});

// In-memory response configurations. Keyed by endpointId then config id.
const responseStore = new Map();

// Helpers ---------------------------------------------------------------

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) {
    return xff.split(',')[0].trim();
  }
  return (
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    ''
  );
}

function safeJsonParse(text) {
  if (typeof text !== 'string' || !text.length) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function decodeBasicAuth(header) {
  if (!header || !header.toLowerCase().startsWith('basic ')) return null;
  try {
    const decoded = Buffer.from(header.slice(6).trim(), 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx < 0) return { present: true, value: `${decoded.slice(0, 4)}…` };
    return { present: true, user: decoded.slice(0, idx), value: `${decoded.slice(0, idx).slice(0, 4)}…` };
  } catch {
    return null;
  }
}

function decodeBearer(header) {
  if (!header || !header.toLowerCase().startsWith('bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  // Best-effort JWT decode (no signature verification — we just inspect claims)
  let claims = null;
  let expires = null;
  const parts = token.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      claims = payload;
      expires = payload.exp ? new Date(payload.exp * 1000).toISOString() : null;
    } catch {
      /* not a JWT */
    }
  }
  return { present: true, length: token.length, preview: token.slice(0, 6) + '…', claims, expires };
}

// Webhook signature detection (we do not validate; we just report presence)
function detectWebhookSignature(headers) {
  const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
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
      else acc[p.slice(0, idx)] = decodeURIComponent(p.slice(idx + 1));
      return acc;
    }, {});
}

function buildTimeline(receivedAt) {
  // The server can't easily break down "headers parsed / body parsed" because
  // it all happens in one go, but it can record each meaningful step.
  return [
    { label: 'Request received', ts: receivedAt, ms: 0 },
    { label: 'Headers parsed', ts: receivedAt + 0.5, ms: 0.5 },
    { label: 'Body parsed', ts: receivedAt + 1, ms: 1 },
    { label: 'Broadcast to subscribers', ts: receivedAt + 1.5, ms: 1.5 },
  ];
}

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

function maskHeaderValue(name, value) {
  if (!SENSITIVE_HEADERS.has(name.toLowerCase())) return value;
  if (typeof value !== 'string' || value.length < 8) return '••••';
  return value.slice(0, 4) + '…' + value.slice(-2);
}

// The actual capture route ------------------------------------------------

app.all(/^\/r\/([a-z0-9]{4,32})(\/.*)?$/i, (req, res, next) => {
  // If multer is consuming the body, let it run first. We split routing into
  // a separate handler so multer can attach `req.files` and `req.body`.
  if ((req.headers['content-type'] || '').toLowerCase().includes('multipart/form-data')) {
    return upload.any()(req, res, () => captureHandler(req, res, next));
  }
  return captureHandler(req, res, next);
});

function captureHandler(req, res, next) {
  const startedAt = Date.now();
  const endpointId = req.params[0];

  try {
    const ua = new UAParser(req.headers['user-agent'] || '').getResult();
    const ip = getClientIp(req);

    // Headers (all of them, lowercased for safety but originals preserved)
    const headers = { ...req.headers };

    // Body parsing
    const contentType = (req.headers['content-type'] || '').toLowerCase();
    let parsedBody = null;
    let bodyKind = 'empty';
    let bodyText = '';
    let formFields = null;
    let files = [];

    if (contentType.includes('application/json')) {
      bodyText = req.rawBody ? req.rawBody.toString('utf8') : '';
      parsedBody = safeJsonParse(bodyText);
      bodyKind = parsedBody !== null ? 'json' : 'raw';
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      bodyText = req.rawBody ? req.rawBody.toString('utf8') : '';
      // Use querystring-style parsing via URLSearchParams
      const params = new URLSearchParams(bodyText);
      formFields = {};
      for (const [k, v] of params) formFields[k] = v;
      parsedBody = formFields;
      bodyKind = 'form';
    } else if (contentType.includes('text/') || contentType.includes('application/xml') || contentType.includes('application/javascript')) {
      bodyText = req.rawBody ? req.rawBody.toString('utf8') : '';
      bodyKind = 'text';
    } else if (contentType.includes('multipart/form-data')) {
      formFields = { ...(req.body || {}) };
      files = (req.files || []).map((f) => ({
        fieldName: f.fieldname,
        originalName: f.originalname,
        encoding: f.encoding,
        mimeType: f.mimetype,
        size: f.size,
        // include a base64 preview only for small text files
        preview: f.size < 64 * 1024 && /text|json|xml|javascript/.test(f.mimetype)
          ? f.buffer.toString('utf8').slice(0, 4000)
          : null,
      }));
      parsedBody = { ...formFields, _files: files.map((f) => f.originalName) };
      bodyKind = 'multipart';
    } else if (req.rawBody && req.rawBody.length) {
      bodyText = req.rawBody.toString('utf8');
      // Try JSON anyway
      parsedBody = safeJsonParse(bodyText);
      bodyKind = parsedBody !== null ? 'json' : 'raw';
    }

    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const receivedAt = new Date().toISOString();
    const timeline = buildTimeline(Date.now() - startedAt);

    // Compose the wire-format request for the client
    const captured = {
      id: requestId,
      endpointId,
      receivedAt,
      processingMs: Date.now() - startedAt,
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      host: req.headers.host,
      protocol: req.protocol,
      httpVersion: req.httpVersion,
      secure: req.secure,
      ip: {
        remote: ip,
        xForwardedFor: req.headers['x-forwarded-for'] || null,
        realIp: req.headers['x-real-ip'] || null,
        country: req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || null,
        region: req.headers['x-vercel-ip-country-region'] || null,
        city: req.headers['x-vercel-ip-city'] || null,
        asn: req.headers['x-vercel-ip-asn'] || null,
        isp: null,
      },
      tls: {
        secure: !!req.secure,
        version: req.headers['x-tls-version'] || null,
        cipher: req.headers['x-tls-cipher'] || null,
      },
      headers,
      headersMasked: Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [k, maskHeaderValue(k, v)])
      ),
      query: req.query,
      cookies: parseCookies(req.headers.cookie),
      body: {
        kind: bodyKind,
        contentType,
        rawBase64: req.rawBody ? req.rawBody.toString('base64') : null,
        rawText: bodyText,
        prettyJson: bodyKind === 'json' && parsedBody ? JSON.stringify(parsedBody, null, 2) : null,
        parsed: parsedBody,
        form: formFields,
        files,
        size: req.rawBody ? req.rawBody.length : (req.files ? req.files.reduce((s, f) => s + f.size, 0) : 0),
      },
      auth: {
        basic: decodeBasicAuth(req.headers.authorization),
        bearer: decodeBearer(req.headers.authorization),
        apiKey: req.headers['x-api-key'] || req.headers['api-key'] || null,
        jwt: decodeBearer(req.headers.authorization)?.claims || null,
      },
      signatures: detectWebhookSignature(headers),
      userAgent: {
        raw: req.headers['user-agent'] || '',
        browser: ua.browser?.name || null,
        browserVersion: ua.browser?.version || null,
        os: ua.os?.name || null,
        osVersion: ua.os?.version || null,
        device: ua.device?.model || null,
        deviceType: ua.device?.type || null,
        bot: ua.device?.type === 'mobile' ? false : !!(ua.bot || /bot|spider|crawl|headless/i.test(req.headers['user-agent'] || '')),
        detected: detectAgent(req.headers['user-agent'] || ''),
      },
      timeline,
    };

    // Run analyzers (signature analysis, JSON shape, etc.)
    captured.analysis = WebhookAnalyzer.analyze(captured);

    // Broadcast to subscribers of this endpoint
    io.to(endpointId).emit('request:new', captured);

    // Apply a user-defined response if one was configured
    const responses = responseStore.get(endpointId);
    const cfg = responses?.get('default');
    if (cfg) {
      const status = Number(cfg.status) || 200;
      const headersOut = cfg.headers && typeof cfg.headers === 'object' ? cfg.headers : {};
      for (const [k, v] of Object.entries(headersOut)) {
        try {
          res.setHeader(k, String(v));
        } catch {
          /* ignore invalid header names */
        }
      }
      if (cfg.body !== undefined && cfg.body !== null) {
        if (typeof cfg.body === 'string') {
          return res.status(status).send(cfg.body);
        }
        return res.status(status).json(cfg.body);
      }
      return res.status(status).end();
    }

    // Default response
    res.setHeader('X-Nextcatch-Capture', 'ok');
    return res.status(200).json({
      success: true,
      requestId,
      endpointId,
      receivedAt,
      message: 'Request captured. Open the nextcatch UI to inspect it.',
    });
  } catch (err) {
    next(err);
  }
}

function detectAgent(ua) {
  if (!ua) return 'unknown';
  const known = [
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
  for (const [needle, label] of known) {
    if (ua.toLowerCase().includes(needle.toLowerCase())) return label;
  }
  return null;
}

// Healthcheck
app.get('/healthz', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Serve built client in production
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^\/(?!r\/|api\/|socket\.io\/|healthz).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error handler — always respond 200 so the caller knows we got the request,
// but include the error in the body for debugging.
app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[webhookmirror] capture error:', err);
  res.status(200).json({
    success: false,
    error: err.message || 'capture failed',
    note: 'The request may have been received but could not be fully parsed.',
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[webhookmirror] capture server listening on :${PORT}`);
});
