// Static analysis helpers used by the capture server and mirrored on the
// client for fast re-analysis when the user toggles a body view.

export const WebhookAnalyzer = {
  analyze(req) {
    return {
      jsonShape: analyzeJsonShape(req.body?.parsed),
      authSummary: summarizeAuth(req),
      signatureSummary: req.signatures || [],
      bodyStats: bodyStats(req.body),
      isWebhook: isLikelyWebhook(req),
    };
  },
};

function analyzeJsonShape(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object') {
    return { type: typeof value, totalKeys: 0 };
  }
  if (Array.isArray(value)) {
    return {
      type: 'array',
      totalKeys: value.length,
      items: value.length,
      nested: value.some((v) => v && typeof v === 'object'),
    };
  }
  const out = { type: 'object', totalKeys: 0, fields: [] };
  walk(value, '', out, 0);
  return out;
}

function walk(value, prefix, out, depth) {
  if (depth > 5) return;
  if (value === null) {
    out.fields.push({ path: prefix || '/', type: 'null' });
    return;
  }
  if (Array.isArray(value)) {
    out.fields.push({ path: prefix || '/', type: 'array', length: value.length });
    if (value.length && typeof value[0] === 'object') {
      walk(value[0], `${prefix || '/'}[0]`, out, depth + 1);
    }
    return;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    out.totalKeys += keys.length;
    for (const k of keys) {
      walk(value[k], prefix ? `${prefix}.${k}` : k, out, depth + 1);
    }
    return;
  }
  out.fields.push({ path: prefix || '/', type: typeof value });
}

function summarizeAuth(req) {
  const out = [];
  if (req.auth?.basic) out.push({ kind: 'Basic', present: true });
  if (req.auth?.bearer) {
    out.push({
      kind: 'Bearer',
      present: true,
      length: req.auth.bearer.length,
      isJwt: !!req.auth.bearer.claims,
      expires: req.auth.bearer.expires,
    });
  }
  if (req.auth?.apiKey) out.push({ kind: 'API Key', present: true, header: 'x-api-key' });
  return out;
}

function bodyStats(body) {
  if (!body) return { size: 0, kind: 'empty' };
  return {
    size: body.size,
    kind: body.kind,
    contentType: body.contentType,
    fileCount: body.files?.length || 0,
  };
}

function isLikelyWebhook(req) {
  const h = req.headers || {};
  const keys = Object.keys(h).map((k) => k.toLowerCase());
  return (
    keys.includes('x-hub-signature-256') ||
    keys.includes('x-hub-signature') ||
    keys.includes('stripe-signature') ||
    keys.includes('x-shopify-hmac-sha256') ||
    keys.includes('x-shopify-topic') ||
    keys.includes('x-wc-webhook-id') ||
    keys.includes('x-wc-webhook-signature') ||
    keys.includes('x-slack-signature') ||
    keys.includes('x-telegram-bot-api-secret-token')
  );
}
