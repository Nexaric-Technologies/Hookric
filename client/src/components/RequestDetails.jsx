import React, { useMemo, useState } from 'react';
import {
  methodClass, shortTime, formatBytes, copyToClipboard,
  highlightJson, downloadFile, buildReplaySnippets, toCsv, toTxt, safeJsonParse,
} from '../lib/format.js';
import {
  IconCopy, IconCheck, IconDownload, IconFileText, IconCode, IconReplay,
  IconHash, IconQuery, IconCookie, IconFile, IconBrowser, IconImage, IconClock, IconActivity,
} from './Icon.jsx';

const TABS = [
  { key: 'Body',    icon: IconBody,    tint: 'chip-tint-blue' },
  { key: 'Headers', icon: IconHeaders, tint: 'chip-tint-violet' },
  { key: 'Query',   icon: IconQuery,   tint: 'chip-tint-green' },
  { key: 'Cookies', icon: IconCookie,  tint: 'chip-tint-amber' },
  { key: 'Files',   icon: IconFile,    tint: 'chip-tint-red' },
  { key: 'Replay',  icon: IconReplay,  tint: '' },
];

export default function RequestDetails({ request, allRequests }) {
  const [tab, setTab] = useState('Body');

  if (!request) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 sm:p-12 empty-shell">
        <div
          className="h-12 w-12 rounded-md border border-[var(--line)] bg-[var(--surface)] flex items-center justify-center text-[var(--ink-4)] mb-3"
        >
          <IconHash size={20} />
        </div>
        <p className="text-[13px] font-medium text-[var(--ink)]">No request selected</p>
        <p className="text-[11.5px] text-[var(--ink-4)] mt-1 max-w-[18rem]">
          Fire a request to your endpoint, or pick one from the list.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <RequestHeader request={request} allRequests={allRequests} />

      {/* Tab strip */}
      <div
        className="px-2 sm:px-3 border-b border-[var(--line)] overflow-x-auto shrink-0"
        role="tablist"
      >
        <div className="flex items-center gap-0.5 min-w-max py-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`pane-tab ${active ? 'pane-tab-active' : ''}`}
              >
                <Icon size={13} />
                {t.key}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'Body'    ? <BodyView    request={request} /> : null}
        {tab === 'Headers' ? <HeadersView request={request} /> : null}
        {tab === 'Query'   ? <QueryView   request={request} /> : null}
        {tab === 'Cookies' ? <CookiesView request={request} /> : null}
        {tab === 'Files'   ? <FilesView   request={request} /> : null}
        {tab === 'Replay'  ? <ReplayView  request={request} /> : null}
      </div>
    </div>
  );
}

// --- Header ---

function RequestHeader({ request, allRequests }) {
  const onExport = (kind) => {
    if (kind === 'json')      downloadFile(`hookrick-${Date.now()}.json`, JSON.stringify(allRequests, null, 2), 'application/json');
    else if (kind === 'csv')  downloadFile(`hookrick-${Date.now()}.csv`,  toCsv(allRequests), 'text/csv');
    else if (kind === 'txt')  downloadFile(`hookrick-${Date.now()}.txt`,  toTxt(allRequests), 'text/plain');
  };

  return (
    <div className="px-3 sm:px-4 py-3 border-b border-[var(--line)] shrink-0">
      <div className="flex items-center gap-2 flex-wrap mb-1.5 min-w-0">
        <span className={`method-badge ${methodClass(request.method)}`}>{request.method}</span>
        <span className="t-mono text-[12.5px] text-[var(--ink)] truncate min-w-0 flex-1">
          {request.url}
        </span>
        <span className="t-meta t-tabular shrink-0 inline-flex items-center gap-1">
          <IconClock size={11} />
          {shortTime(request.receivedAt)}
        </span>
      </div>
      <div className="flex items-center gap-x-3 gap-y-1 text-[11px] text-[var(--ink-4)] flex-wrap">
        <span className="t-mono">{request.ip?.remote || '—'}</span>
        <span>·</span>
        <span>{request.protocol?.toUpperCase()} {request.httpVersion}</span>
        <span>·</span>
        <span className="t-tabular">{formatBytes(request.body?.size || 0)}</span>
        <span>·</span>
        <span className="t-tabular inline-flex items-center gap-1">
          <IconActivity size={10} />
          {request.processingMs ?? 0}ms
        </span>
        <span className="ml-auto flex items-center gap-1">
          <button className="btn btn-ghost btn-sm" onClick={() => onExport('json')} title="Export all as JSON">
            <IconDownload size={12} /> JSON
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onExport('csv')} title="Export all as CSV">
            <IconDownload size={12} /> CSV
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onExport('txt')} title="Export all as TXT">
            <IconDownload size={12} /> TXT
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
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--line)]"
          role="radiogroup"
          aria-label="Body view"
        >
          {[
            { key: 'raw', label: 'Raw' },
            { key: 'pretty', label: 'Pretty', disabled: !body.prettyJson },
            { key: 'parsed', label: 'Parsed' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              disabled={m.disabled}
              className={`btn btn-sm ${mode === m.key ? 'btn-primary' : 'btn-ghost'} disabled:opacity-30`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <span className="chip">{body.kind}</span>
        <span className="chip t-tabular">{formatBytes(body.size || 0)}</span>
        <span className="ml-auto">
          <button className="btn btn-outline btn-sm" onClick={onCopy}>
            {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>

      <div className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] overflow-hidden">
        {mode === 'parsed' && body.parsed && typeof body.parsed === 'object' ? (
          <pre
            className="code-wrap p-3 max-h-[60vh] overflow-auto"
            dangerouslySetInnerHTML={{ __html: highlightJson(body.parsed) }}
          />
        ) : mode === 'pretty' && body.prettyJson ? (
          <pre
            className="code-wrap p-3 max-h-[60vh] overflow-auto"
            dangerouslySetInnerHTML={{ __html: highlightJson(safeJsonParse(body.prettyJson)) }}
          />
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
        <IconCode size={14} className="text-[var(--ink-3)]" />
        <h3 className="text-[13px] font-semibold text-[var(--ink)]">Detected fields</h3>
        <span className="t-meta">{fields.length} top-level keys</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
        {fields.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2 t-mono min-w-0">
            <span className="text-[var(--ink)] truncate">{k}</span>
            <span className="ml-auto t-meta shrink-0">{typeName(v)}</span>
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
        <button className="btn btn-outline btn-sm" onClick={onCopy}>
          {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
          {copied ? 'Copied' : 'Copy all'}
        </button>
      </div>
      <div className="rounded-md border border-[var(--line)] overflow-hidden">
        <table className="w-full text-[12px] t-mono">
          <thead>
            <tr className="text-[var(--ink-4)] text-left border-b border-[var(--line)] bg-[var(--surface-2)]">
              <th className="px-3 py-2 font-medium w-1/3">Name</th>
              <th className="px-3 py-2 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(([k, v]) => (
              <tr key={k} className="border-b border-[var(--line)] last:border-0 align-top">
                <td className="px-3 py-2 text-[var(--ink-4)] break-all">{k}</td>
                <td className="px-3 py-2 text-[var(--ink)] break-all whitespace-pre-wrap">{typeof v === 'string' ? v : JSON.stringify(v)}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr><td colSpan="2" className="px-3 py-6 text-center text-[var(--ink-4)]">No headers match.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QueryView({ request }) {
  const entries = Object.entries(request.query || {});
  if (entries.length === 0) return (
    <div className="p-6 text-[12.5px] text-[var(--ink-4)] text-center">No query parameters.</div>
  );
  return (
    <div className="p-3 sm:p-4">
      <DataTable rows={entries} />
    </div>
  );
}

function CookiesView({ request }) {
  const entries = Object.entries(request.cookies || {});
  if (entries.length === 0) return (
    <div className="p-6 text-[12.5px] text-[var(--ink-4)] text-center">No cookies sent.</div>
  );
  return (
    <div className="p-3 sm:p-4">
      <DataTable rows={entries} />
    </div>
  );
}

function DataTable({ rows }) {
  return (
    <div className="rounded-md border border-[var(--line)] overflow-hidden">
      <table className="w-full text-[12px] t-mono">
        <thead>
          <tr className="text-[var(--ink-4)] text-left border-b border-[var(--line)] bg-[var(--surface-2)]">
            <th className="px-3 py-2 font-medium">Key</th>
            <th className="px-3 py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-[var(--line)] last:border-0 align-top">
              <td className="px-3 py-2 text-[var(--ink-4)]">{k}</td>
              <td className="px-3 py-2 text-[var(--ink)] break-all">{Array.isArray(v) ? v.join(', ') : String(v)}</td>
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
  if (files.length === 0) return (
    <div className="p-6 text-[12.5px] text-[var(--ink-4)] text-center">No file uploads in this request.</div>
  );
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
        {isImage ? <IconImage size={14} className="text-[var(--ink-3)] shrink-0" /> :
         isPdf   ? <IconFileText size={14} className="text-[var(--ink-3)] shrink-0" /> :
                   <IconFile size={14} className="text-[var(--ink-4)] shrink-0" />}
        <span className="text-[13px] font-medium text-[var(--ink)] truncate" title={file.originalName}>{file.originalName}</span>
      </div>
      <dl className="text-[11.5px] grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1">
        <dt className="text-[var(--ink-4)]">Type</dt><dd className="text-[var(--ink)] truncate t-mono">{file.mimeType}</dd>
        <dt className="text-[var(--ink-4)]">Size</dt><dd className="text-[var(--ink)] t-tabular">{formatBytes(file.size)}</dd>
        <dt className="text-[var(--ink-4)]">Field</dt><dd className="text-[var(--ink)] t-mono">{file.fieldName}</dd>
      </dl>
      {isText && file.preview ? (
        <pre className="code-wrap mt-2 p-2 rounded-md bg-[var(--surface-2)] border border-[var(--line)] max-h-40 overflow-auto">{file.preview}</pre>
      ) : null}
      {isImage ? <div className="mt-2 text-[11px] text-[var(--ink-4)]">Image preview requires server-side file proxying. Metadata captured.</div> : null}
      {isPdf   ? <div className="mt-2 text-[11px] text-[var(--ink-4)]">PDF preview requires server-side file proxying. Metadata captured.</div> : null}
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
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--line)]"
          role="radiogroup"
          aria-label="Snippet language"
        >
          {langs.map((l) => (
            <button
              key={l.key}
              onClick={() => setLang(l.key)}
              className={`btn btn-sm ${lang === l.key ? 'btn-primary' : 'btn-ghost'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <span className="ml-auto">
          <button className="btn btn-outline btn-sm" onClick={onCopy}>
            {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </span>
      </div>
      <pre className="code-wrap rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 max-h-[60vh] overflow-auto whitespace-pre">{snippets[lang]}</pre>
    </div>
  );
}