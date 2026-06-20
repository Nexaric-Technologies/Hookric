import React, { useEffect, useState } from 'react';
import {
  IconCode, IconClose, IconCheck, IconCopy, IconPlus, IconMinus, IconSend, IconSettings,
} from './Icon.jsx';
import { copyToClipboard, safeJsonParse, highlightJson } from '../lib/format.js';

export default function ResponseBuilder({ config, onChange }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const update = (patch) => onChange({ ...config, ...patch });

  const updateHeader = (idx, key, value) => {
    const next = [...Object.entries(config.headers || {})];
    next[idx] = [key, value];
    const obj = Object.fromEntries(next.filter(([k]) => k));
    update({ headers: obj });
  };

  const addHeader = () => {
    const next = { ...(config.headers || {}) };
    let i = Object.keys(next).length + 1;
    while (next[`X-Custom-${i}`] !== undefined) i++;
    next[`X-Custom-${i}`] = '';
    update({ headers: next });
  };

  const removeHeader = (key) => {
    const next = { ...(config.headers || {}) };
    delete next[key];
    update({ headers: next });
  };

  const prettyBody = usePrettyBody(config.body);

  const onCopyHttp = async () => {
    const text = `HTTP ${config.status}\n${Object.entries(config.headers || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${config.body}`;
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-outline btn-sm shrink-0"
        title="Configure the response hookrick sends back"
        aria-expanded={open}
      >
        <IconCode size={13} />
        <span className="hidden sm:inline">Response</span>
        {config.enabled ? (
          <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-[var(--m-get)]" />
        ) : null}
      </button>

      {open ? <ResponseSheet onClose={() => setOpen(false)}>
        <SheetHeader
          title="Mock response"
          subtitle="What hookrick returns to the caller"
          onClose={() => setOpen(false)}
        />

        <div className="px-4 sm:px-5 py-3 border-b border-[var(--line)] flex items-center gap-2">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <button
              role="switch"
              aria-checked={config.enabled}
              onClick={() => update({ enabled: !config.enabled })}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                config.enabled ? 'bg-[var(--ink)]' : 'bg-[var(--line-2)]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-[12.5px] text-[var(--ink)]">
              {config.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
          <span className="t-meta">
            Passthrough when disabled
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
          {/* Status */}
          <div>
            <label className="t-eyebrow block mb-2">Status code</label>
            <div className="flex items-center gap-2 flex-wrap">
              {[200, 201, 204, 301, 302, 400, 401, 403, 404, 418, 500, 502].map((code) => (
                <button
                  key={code}
                  onClick={() => update({ status: code })}
                  className={`btn btn-sm t-tabular ${config.status === code ? 'btn-primary' : 'btn-outline'}`}
                >
                  {code}
                </button>
              ))}
              <input
                type="number"
                min="100"
                max="599"
                value={config.status}
                onChange={(e) => update({ status: parseInt(e.target.value, 10) || 200 })}
                className="input t-mono t-tabular"
                style={{ width: '80px' }}
              />
            </div>
          </div>

          {/* Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="t-eyebrow">Headers</label>
              <button className="btn btn-ghost btn-sm" onClick={addHeader}>
                <IconPlus size={12} /> Add header
              </button>
            </div>
            <div className="space-y-1.5">
              {Object.entries(config.headers || {}).map(([k, v], i, arr) => (
                <div key={i} className="flex items-stretch gap-1.5">
                  <input
                    className="input t-mono flex-1 min-w-0"
                    style={{ fontSize: '12.5px' }}
                    placeholder="Header"
                    value={k}
                    onChange={(e) => updateHeader(i, e.target.value, v)}
                  />
                  <input
                    className="input t-mono flex-1 min-w-0"
                    style={{ fontSize: '12.5px' }}
                    placeholder="Value"
                    value={v}
                    onChange={(e) => updateHeader(i, k, e.target.value)}
                  />
                  <button
                    onClick={() => removeHeader(k)}
                    className="btn btn-outline btn-icon"
                    title="Remove header"
                    aria-label="Remove header"
                  >
                    <IconMinus size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="t-eyebrow">Body</label>
              <span className="t-meta t-tabular">{config.body?.length || 0} chars</span>
            </div>
            <textarea
              value={config.body}
              onChange={(e) => update({ body: e.target.value })}
              spellCheck={false}
              rows={6}
              className="input t-mono"
              style={{
                fontSize: '12.5px',
                height: 'auto',
                minHeight: '120px',
                lineHeight: 1.6,
                padding: '10px 12px',
                resize: 'vertical',
                fontFamily: "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
              }}
            />
            {prettyBody ? (
              <pre
                className="mt-2 p-3 rounded-md border border-[var(--line)] bg-[var(--surface-2)] max-h-40 overflow-auto"
                dangerouslySetInnerHTML={{ __html: prettyBody }}
              />
            ) : null}
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 border-t border-[var(--line)] flex items-center gap-2 shrink-0">
          <button className="btn btn-outline btn-sm" onClick={onCopyHttp}>
            {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
            {copied ? 'Copied' : 'Copy HTTP'}
          </button>
          <span className="ml-auto" />
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              update({ enabled: true });
              setOpen(false);
            }}
          >
            <IconSend size={12} />
            Save & enable
          </button>
        </div>
      </ResponseSheet> : null}
    </>
  );
}

// Inline-panel version of the same form — used when the user
// switches the right-pane tab to "Response". No modal chrome, no
// header button. Scrolls as part of the pane.
export function ResponsePanel({ config, onChange }) {
  const update = (patch) => onChange({ ...config, ...patch });
  const prettyBody = usePrettyBody(config.body);

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 sm:px-5 py-3 border-b border-[var(--line)] flex items-center gap-2 shrink-0">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <button
            role="switch"
            aria-checked={config.enabled}
            onClick={() => update({ enabled: !config.enabled })}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
              config.enabled ? 'bg-[var(--ink)]' : 'bg-[var(--line-2)]'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className="text-[12.5px] text-[var(--ink)]">
            {config.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
        <span className="t-meta">
          Passthrough when disabled
        </span>
      </div>

      <div className="px-4 sm:px-5 py-4 space-y-5">
        {/* Status */}
        <div>
          <label className="t-eyebrow block mb-2">Status code</label>
          <div className="flex items-center gap-2 flex-wrap">
            {[200, 201, 204, 301, 302, 400, 401, 403, 404, 418, 500, 502].map((code) => (
              <button
                key={code}
                onClick={() => update({ status: code })}
                className={`btn btn-sm t-tabular ${config.status === code ? 'btn-primary' : 'btn-outline'}`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* Headers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="t-eyebrow">Headers</label>
            <button
              onClick={() => {
                const next = { ...(config.headers || {}) };
                let i = Object.keys(next).length + 1;
                while (next[`X-Custom-${i}`] !== undefined) i++;
                next[`X-Custom-${i}`] = '';
                update({ headers: next });
              }}
              className="btn btn-ghost btn-sm"
            >
              <IconPlus size={12} /> Add header
            </button>
          </div>
          <div className="space-y-1.5">
            {Object.entries(config.headers || {}).map(([k, v], idx, arr) => (
              <div key={`${k}-${idx}`} className="flex items-center gap-1.5">
                <input
                  value={k}
                  onChange={(e) => {
                    const next = [...arr];
                    next[idx] = [e.target.value, v];
                    update({ headers: Object.fromEntries(next.filter(([key]) => key)) });
                  }}
                  placeholder="Header"
                  className="input t-mono flex-1 min-w-0"
                  style={{ fontSize: '12.5px', padding: '6px 10px' }}
                />
                <input
                  value={v}
                  onChange={(e) => {
                    const next = [...arr];
                    next[idx] = [k, e.target.value];
                    update({ headers: Object.fromEntries(next.filter(([key]) => key)) });
                  }}
                  placeholder="Value"
                  className="input t-mono flex-1 min-w-0"
                  style={{ fontSize: '12.5px', padding: '6px 10px' }}
                />
                <button
                  onClick={() => {
                    const next = { ...(config.headers || {}) };
                    delete next[k];
                    update({ headers: next });
                  }}
                  className="btn btn-ghost btn-icon-sm shrink-0"
                  aria-label={`Remove ${k}`}
                >
                  <IconMinus size={12} />
                </button>
              </div>
            ))}
            {Object.keys(config.headers || {}).length === 0 ? (
              <p className="text-[12px] text-[var(--ink-4)]">No custom headers.</p>
            ) : null}
          </div>
        </div>

        {/* Body */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="t-eyebrow">Body</label>
            <span className="t-meta t-tabular">{config.body?.length || 0} chars</span>
          </div>
          <textarea
            value={config.body}
            onChange={(e) => update({ body: e.target.value })}
            spellCheck={false}
            rows={8}
            className="input t-mono"
            style={{
              fontSize: '12.5px',
              height: 'auto',
              minHeight: '160px',
              lineHeight: 1.6,
              padding: '10px 12px',
              resize: 'vertical',
              fontFamily: "'Geist Mono', 'JetBrains Mono', ui-monospace, monospace",
            }}
          />
          {prettyBody ? (
            <pre
              className="mt-2 p-3 rounded-md border border-[var(--line)] bg-[var(--surface-2)] max-h-40 overflow-auto"
              dangerouslySetInnerHTML={{ __html: prettyBody }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function usePrettyBody(body) {
  if (typeof body !== 'string') return null;
  const parsed = safeJsonParse(body);
  if (!parsed) return null;
  return highlightJson(parsed);
}

function SheetHeader({ title, subtitle, onClose }) {
  return (
    <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--line)] flex items-center gap-3 shrink-0">
      <div className="h-8 w-8 rounded-md border border-[var(--line)] bg-[var(--surface)] flex items-center justify-center text-[var(--ink-3)] shrink-0">
        <IconSettings size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="t-eyebrow">Response</div>
        <h2 className="text-[14px] font-semibold text-[var(--ink)] truncate">{title}</h2>
        {subtitle ? <p className="text-[11.5px] text-[var(--ink-4)] truncate">{subtitle}</p> : null}
      </div>
      <button
        onClick={onClose}
        className="btn btn-ghost btn-icon"
        aria-label="Close"
      >
        <IconClose size={14} />
      </button>
    </div>
  );
}

function ResponseSheet({ children, onClose }) {
  // Esc to close
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        className="sheet-overlay"
        onClick={onClose}
        role="presentation"
      />
      <div
        className="sheet md:!inset-y-0 md:!right-0 md:!left-auto md:!bottom-auto md:!top-0 md:!rounded-none md:!border-l md:!w-[480px] md:!max-w-[90vw]"
        role="dialog"
        aria-modal="true"
        aria-label="Mock response"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {children}
      </div>
    </>
  );
}
