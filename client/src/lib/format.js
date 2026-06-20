// Lightweight, dependency-free utilities used throughout the UI.

// Nano ID-ish: 8 chars, lowercase alphanumeric. URL safe.
export function generateId(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const out = new Uint32Array(len);
    crypto.getRandomValues(out);
    return Array.from(out, (n) => chars[n % chars.length]).join('');
  }
  let id = '';
  for (let i = 0; i < len; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function timeAgo(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 5) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

export function shortTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '0 B';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// Method → color tokens (HSL var → color class for premium feel).
// The CSS palette is theme-aware via CSS vars, so we return Tailwind
// utilities that target those tokens via opacity-modifier backgrounds.
export function methodColor(method) {
  switch ((method || '').toUpperCase()) {
    case 'GET': return 'text-[hsl(var(--method-get))] bg-[hsl(var(--method-get)/0.10)] border-[hsl(var(--method-get)/0.30)]';
    case 'POST': return 'text-[hsl(var(--method-post))] bg-[hsl(var(--method-post)/0.10)] border-[hsl(var(--method-post)/0.30)]';
    case 'PUT': return 'text-[hsl(var(--method-put))] bg-[hsl(var(--method-put)/0.10)] border-[hsl(var(--method-put)/0.30)]';
    case 'PATCH': return 'text-[hsl(var(--method-patch))] bg-[hsl(var(--method-patch)/0.10)] border-[hsl(var(--method-patch)/0.30)]';
    case 'DELETE': return 'text-[hsl(var(--method-delete))] bg-[hsl(var(--method-delete)/0.10)] border-[hsl(var(--method-delete)/0.30)]';
    default: return 'text-[hsl(var(--method-other))] bg-secondary border-border';
  }
}

export function safeJsonParse(s) {
  if (typeof s !== 'string') return null;
  try { return JSON.parse(s); } catch { return null; }
}

export function downloadFile(filename, content, mime = 'application/octet-stream') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

export function toCsv(requests) {
  const cols = ['id', 'receivedAt', 'method', 'url', 'ip', 'contentType', 'size'];
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = cols.join(',');
  const rows = requests.map((r) =>
    cols.map((c) => {
      if (c === 'contentType') return escape(r.body?.contentType);
      if (c === 'size') return escape(r.body?.size);
      if (c === 'ip') return escape(r.ip?.remote);
      return escape(r[c]);
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

export function toTxt(requests) {
  return requests
    .map((r) => {
      const lines = [];
      lines.push(`==== ${r.id} ====`);
      lines.push(`${r.method} ${r.url}`);
      lines.push(`Received: ${r.receivedAt}`);
      lines.push(`IP: ${r.ip?.remote || '-'}`);
      lines.push(`Content-Type: ${r.body?.contentType || '-'}`);
      lines.push('');
      lines.push('-- Headers --');
      for (const [k, v] of Object.entries(r.headers || {})) {
        lines.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
      }
      lines.push('');
      lines.push('-- Body --');
      lines.push(r.body?.rawText || (r.body?.rawBase64 ? `<base64 ${r.body.size} bytes>` : ''));
      lines.push('');
      return lines.join('\n');
    })
    .join('\n');
}

// JSON pretty-printer with very small footprint (no deps).
// Returns a string of HTML for highlighting in a <pre>.
export function highlightJson(value) {
  let json;
  try { json = JSON.stringify(value, null, 2); }
  catch { json = String(value); }
  return escapeAndColor(json);
}

function escapeAndColor(s) {
  // Escape HTML, then color tokens
  const esc = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc.replace(
    /("(?:\\.|[^"\\])*"\s*:)|("(?:\\.|[^"\\])*")|(\b(?:true|false|null)\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\],])/g,
    (m, key, str, bool, num, punct) => {
      if (key) return `<span class="json-key">${key}</span>`;
      if (str) return `<span class="json-string">${str}</span>`;
      if (bool) return `<span class="json-${bool}">${bool}</span>`;
      if (num) return `<span class="json-number">${num}</span>`;
      if (punct) return `<span class="json-punct">${punct}</span>`;
      return m;
    }
  );
}

export function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((res) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* noop */ }
    document.body.removeChild(ta);
    res();
  });
}

export function buildReplaySnippets({ url, method, headers, body }) {
  const filteredHeaders = Object.entries(headers || {}).filter(([k]) => !['host', 'content-length', 'connection'].includes(k.toLowerCase()));
  const headerObj = Object.fromEntries(filteredHeaders);
  const bodyText = body?.rawText || (body?.rawBase64 ? '' : '');

  // cURL
  const curlLines = [`curl -X ${method} '${url}'`];
  for (const [k, v] of filteredHeaders) {
    curlLines.push(`  -H '${k}: ${typeof v === 'string' ? v.replace(/'/g, "'\\''") : ''}'`);
  }
  if (bodyText) curlLines.push(`  --data-raw ${shellQuote(bodyText)}`);
  const curl = curlLines.join(' \\\n');

  // Node fetch
  const node = `// Node 18+ (global fetch)
const res = await fetch(${JSON.stringify(url)}, {
  method: ${JSON.stringify(method)},
  headers: ${JSON.stringify(headerObj, null, 2)},
  body: ${method === 'GET' || method === 'HEAD' ? 'undefined' : JSON.stringify(bodyText)},
});
const text = await res.text();
console.log(res.status, text);`;

  // Axios
  const axios = `import axios from 'axios';
await axios({
  url: ${JSON.stringify(url)},
  method: ${JSON.stringify(method.toLowerCase())},
  headers: ${JSON.stringify(headerObj, null, 2)},
  data: ${method === 'GET' || method === 'HEAD' ? 'undefined' : JSON.stringify(bodyText)},
});`;

  // Python requests
  const pyHeaders = filteredHeaders.map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`).join('\n');
  const python = `import requests
requests.request(
    method=${JSON.stringify(method)},
    url=${JSON.stringify(url)},
    headers={
${pyHeaders}
    },
    data=${method === 'GET' || method === 'HEAD' ? 'None' : JSON.stringify(bodyText)},
)`;

  // PHP
  const phpHeaders = filteredHeaders.map(([k, v]) => `    "${k}: ${typeof v === 'string' ? v.replace(/"/g, '\\"') : ''}\\r\\n" +`).join('\n');
  const php = `<?php
$ch = curl_init(${JSON.stringify(url)});
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, ${JSON.stringify(method)});
$headers = []
${phpHeaders ? ' . ""' : ''};
${phpHeaders ? `curl_setopt($ch, CURLOPT_HTTPHEADER, [\n${phpHeaders}\n]);` : ''}
${method !== 'GET' && method !== 'HEAD' ? `curl_setopt($ch, CURLOPT_POSTFIELDS, ${JSON.stringify(bodyText)});` : ''}
$response = curl_exec($ch);
echo $response;`;

  // Fetch (browser)
  const fetch = `await fetch(${JSON.stringify(url)}, {
  method: ${JSON.stringify(method)},
  headers: ${JSON.stringify(headerObj, null, 2)},
  body: ${method === 'GET' || method === 'HEAD' ? 'undefined' : JSON.stringify(bodyText)},
});`;

  return { curl, node, axios, python, php, fetch };
}

function shellQuote(s) {
  if (!s.includes("'") && !s.includes('\n')) return `'${s}'`;
  return `$'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
}
