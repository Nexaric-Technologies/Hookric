import React, { useMemo, useState } from 'react';
import { methodColor, shortTime, formatBytes, copyToClipboard, highlightJson, downloadFile, buildReplaySnippets, toCsv, toTxt } from '../lib/format.js';
import { safeJsonParse } from '../lib/format.js';
import {
  Copy, Check, Download, FileText, FileCode, Repeat, Hash, ListTree, Image as ImageIcon, File as FileIcon, Clock
} from 'lucide-react';

const TABS = [
  { key: 'Body', icon: FileCode },
  { key: 'Headers', icon: Hash },
  { key: 'Query', icon: ListTree },
  { key: 'Cookies', icon: FileText },
  { key: 'Files', icon: FileIcon },
  { key: 'Replay', icon: Repeat },
];

export default function RequestDetails({ request, allRequests }) {
  const [tab, setTab] = useState('Body');

  if (!request) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 sm:p-12">
        <div className="h-12 w-12 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground mb-3">
          <Hash className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-foreground">No request selected</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-[18rem]">
          Fire a request to your endpoint, or pick one from the list.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <RequestHeader request={request} allRequests={allRequests} />
      <div className="px-3 sm:px-4 border-b border-border overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`tab ${active ? 'tab-active' : ''}`}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {t.key}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'Body' ? <BodyView request={request} /> : null}
        {tab === 'Headers' ? <HeadersView request={request} /> : null}
        {tab === 'Query' ? <QueryView request={request} /> : null}
        {tab === 'Cookies' ? <CookiesView request={request} /> : null}
        {tab === 'Files' ? <FilesView request={request} /> : null}
        {tab === 'Replay' ? <ReplayView request={request} /> : null}
      </div>
    </div>
  );
}

function RequestHeader({ request, allRequests }) {
  const onExport = (kind) => {
    if (kind === 'json') downloadFile(`nextcatch-${Date.now()}.json`, JSON.stringify(allRequests, null, 2), 'application/json');
    else if (kind === 'csv') downloadFile(`nextcatch-${Date.now()}.csv`, toCsv(allRequests), 'text/csv');
    else if (kind === 'txt') downloadFile(`nextcatch-${Date.now()}.txt`, toTxt(allRequests), 'text/plain');
  };

  return (
    <div className="px-3 sm:px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2 flex-wrap mb-1.5 min-w-0">
        <span className={`method-badge ${methodColor(request.method)}`}>{request.method}</span>
        <span className="font-mono text-[13px] text-foreground truncate min-w-0 flex-1">
          {request.url}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
          {shortTime(request.receivedAt)}
        </span>
      </div>
      <div className="flex items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground flex-wrap">
        <span className="font-mono">{request.ip?.remote || '—'}</span>
        <span>·</span>
        <span>{request.protocol?.toUpperCase()} {request.httpVersion}</span>
        <span>·</span>
        <span className="tabular-nums">{formatBytes(request.body?.size || 0)}</span>
        <span>·</span>
        <span className="tabular-nums">{request.processingMs ?? 0}ms</span>
        <span className="ml-auto flex items-center gap-1">
          <button className="btn-ghost btn-sm" onClick={() => onExport('json')} title="Export all as JSON">
            <Download className="h-3.5 w-3.5" /> JSON
          </button>
          <button className="btn-ghost btn-sm" onClick={() => onExport('csv')} title="Export all as CSV">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
          <button className="btn-ghost btn-sm" onClick={() => onExport('txt')} title="Export all as TXT">
            <Download className="h-3.5 w-3.5" /> TXT
          </button>
        </span>
      </div>
    </div>
  );
}

// --- Body tab ---

function BodyView({ request }) {
  const body = request.body || {};
  const [mode, setMode] = useState(body.prettyJson ? 'pretty' : (body.kind === 'form' || body.kind === 'multipart' ? 'parsed' : 'raw'));
  const [copied, setCopied] = useState(false);

  let display = '';
  if (mode === 'raw') display = body.rawText || (body.rawBase64 ? `<binary ${body.size} bytes, base64-encoded>` : '(empty body)');
  else if (mode === 'pretty') display = body.prettyJson || (body.rawText || '');
  else if (mode === 'parsed') {
    if (body.parsed && typeof body.parsed === 'object') display = JSON.stringify(body.parsed, null, 2);
    else display = body.rawText || '(no parsed representation)';
  }

  const onCopy = async () => {
    await copyToClipboard(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="segmented">
          {[
            { key: 'raw', label: 'Raw' },
            { key: 'pretty', label: 'Pretty', disabled: !body.prettyJson },
            { key: 'parsed', label: 'Parsed' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              disabled={m.disabled}
              className={`segmented-item h-7 px-2.5 text-[11.5px] ${mode === m.key ? 'segmented-item-active' : ''} disabled:opacity-40`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="chip border-border bg-secondary text-secondary-foreground">{body.kind}</span>
        <span className="chip border-border bg-secondary text-secondary-foreground tabular-nums">{formatBytes(body.size || 0)}</span>
        <span className="ml-auto">
          <button className="btn-outline btn-sm" onClick={onCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>

      <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
        {mode === 'parsed' && body.parsed && typeof body.parsed === 'object' ? (
          <pre className="code p-3 max-h-[60vh] overflow-auto" dangerouslySetInnerHTML={{ __html: highlightJson(body.parsed) }} />
        ) : mode === 'pretty' && body.prettyJson ? (
          <pre className="code p-3 max-h-[60vh] overflow-auto" dangerouslySetInnerHTML={{ __html: highlightJson(safeJsonParse(body.prettyJson)) }} />
        ) : (
          <pre className="code-wrap p-3 max-h-[60vh] overflow-auto">{display}</pre>
        )}
      </div>

      {body.parsed ? <JsonShape parsed={body.parsed} /> : null}
    </div>
  );
}

function JsonShape({ parsed }) {
  const fields = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? Object.entries(parsed) : [];
  if (fields.length === 0) return null;
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-2">
        <ListTree className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Detected fields</h3>
        <span className="text-[11px] text-muted-foreground">{fields.length} top-level keys</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
        {fields.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 font-mono min-w-0">
            <span className="text-foreground/80 truncate">{k}</span>
            <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{typeName(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function typeName(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `array(${v.length})`;
  if (typeof v === 'object') return 'object';
  return typeof v;
}

// --- Headers tab ---

function HeadersView({ request }) {
  const [filter, setFilter] = useState('');
  const [copied, setCopied] = useState(false);
  const entries = Object.entries(request.headersMasked || request.headers || {});
  const filtered = filter
    ? entries.filter(([k, v]) => k.toLowerCase().includes(filter.toLowerCase()) || String(v).toLowerCase().includes(filter.toLowerCase()))
    : entries;

  const onCopy = async () => {
    const text = entries.map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n');
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input className="input" placeholder="Filter headers" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button className="btn-outline btn-sm" onClick={onCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy all'}
        </button>
      </div>
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <table className="w-full text-[12px] font-mono">
          <thead>
            <tr className="text-muted-foreground text-left border-b border-border bg-muted/40">
              <th className="px-3 py-2 font-medium w-1/3">Name</th>
              <th className="px-3 py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(([k, v]) => (
              <tr key={k} className="border-b border-border/60 last:border-0 align-top">
                <td className="px-3 py-2 text-muted-foreground break-all">{k}</td>
                <td className="px-3 py-2 text-foreground break-all whitespace-pre-wrap">{typeof v === 'string' ? v : JSON.stringify(v)}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr><td colSpan="2" className="px-3 py-6 text-center text-muted-foreground">No headers match.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QueryView({ request }) {
  const entries = Object.entries(request.query || {});
  if (entries.length === 0) return <div className="p-6 text-sm text-muted-foreground">No query parameters.</div>;
  return (
    <div className="p-3 sm:p-4">
      <DataTable rows={entries} />
    </div>
  );
}

function CookiesView({ request }) {
  const entries = Object.entries(request.cookies || {});
  if (entries.length === 0) return <div className="p-6 text-sm text-muted-foreground">No cookies sent.</div>;
  return (
    <div className="p-3 sm:p-4">
      <DataTable rows={entries} />
    </div>
  );
}

function DataTable({ rows }) {
  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <table className="w-full text-[12px] font-mono">
        <thead>
          <tr className="text-muted-foreground text-left border-b border-border bg-muted/40">
            <th className="px-3 py-2 font-medium">Key</th>
            <th className="px-3 py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-border/60 last:border-0 align-top">
              <td className="px-3 py-2 text-muted-foreground">{k}</td>
              <td className="px-3 py-2 text-foreground break-all">{Array.isArray(v) ? v.join(', ') : String(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Files tab ---

function FilesView({ request }) {
  const files = request.body?.files || [];
  if (files.length === 0) return <div className="p-6 text-sm text-muted-foreground">No file uploads in this request.</div>;
  return (
    <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {files.map((f, i) => <FileCard key={i} file={f} />)}
    </div>
  );
}

function FileCard({ file }) {
  const isImage = (file.mimeType || '').startsWith('image/');
  const isPdf = (file.mimeType || '') === 'application/pdf';
  const isText = /text|json|xml|javascript/.test(file.mimeType || '');

  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-2 min-w-0">
        {isImage ? <ImageIcon className="h-4 w-4 text-primary shrink-0" /> : isPdf ? <FileText className="h-4 w-4 text-destructive shrink-0" /> : <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
        <span className="text-sm font-medium text-foreground truncate" title={file.originalName}>{file.originalName}</span>
      </div>
      <dl className="text-[11.5px] grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Type</dt><dd className="text-foreground truncate font-mono">{file.mimeType}</dd>
        <dt className="text-muted-foreground">Size</dt><dd className="text-foreground tabular-nums">{formatBytes(file.size)}</dd>
        <dt className="text-muted-foreground">Field</dt><dd className="text-foreground font-mono">{file.fieldName}</dd>
      </dl>
      {isText && file.preview ? (
        <pre className="code-wrap mt-2 p-2 rounded-md bg-muted/40 border border-border max-h-40 overflow-auto">{file.preview}</pre>
      ) : null}
      {isImage ? <div className="mt-2 text-[11px] text-muted-foreground">Image preview requires server-side file proxying. Metadata captured.</div> : null}
      {isPdf ? <div className="mt-2 text-[11px] text-muted-foreground">PDF preview requires server-side file proxying. Metadata captured.</div> : null}
    </div>
  );
}

// --- Replay tab ---

function ReplayView({ request }) {
  const snippets = useMemo(
    () => buildReplaySnippets({
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body,
    }),
    [request]
  );
  const [lang, setLang] = useState('curl');
  const [copied, setCopied] = useState(false);

  const langs = [
    { key: 'curl', label: 'cURL' },
    { key: 'node', label: 'Node.js' },
    { key: 'axios', label: 'Axios' },
    { key: 'python', label: 'Python' },
    { key: 'php', label: 'PHP' },
    { key: 'fetch', label: 'Fetch' },
  ];

  const onCopy = async () => {
    await copyToClipboard(snippets[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-1 flex-wrap">
        {langs.map((l) => (
          <button
            key={l.key}
            onClick={() => setLang(l.key)}
            className={`btn btn-sm ${lang === l.key ? 'border-primary text-primary bg-primary/10 hover:bg-primary/15' : ''}`}
          >
            {l.label}
          </button>
        ))}
        <span className="ml-auto">
          <button className="btn-outline btn-sm" onClick={onCopy}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>
      <pre className="code rounded-md border border-border bg-muted/30 p-3 max-h-[60vh] overflow-auto whitespace-pre">{snippets[lang]}</pre>
    </div>
  );
}
