import React, { useState } from 'react';
import { Power, Code2, ListPlus, X, Sparkles, Copy, Check } from 'lucide-react';
import { copyToClipboard, safeJsonParse } from '../lib/format.js';

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
    next[`X-Custom-${Object.keys(next).length + 1}`] = '';
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
        className="btn-outline btn-sm shrink-0"
        title="Configure the response nextcatch sends back"
      >
        <Code2 className="h-4 w-4" />
        <span className="hidden sm:inline">Response</span>
        {config.enabled ? <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" /> : null}
      </button>

      {open ? (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div
            className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 animate-scale-in sm:rounded-lg rounded-none sm:max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 sticky top-0 bg-card z-10">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold text-foreground flex-1">Response builder</h2>
              <button className="btn-ghost btn-icon-sm" onClick={() => setOpen(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-start gap-2">
                <button
                  onClick={() => update({ enabled: !config.enabled })}
                  className={`btn ${config.enabled ? 'border-primary text-primary bg-primary/10 hover:bg-primary/15' : ''}`}
                >
                  <Power className="h-4 w-4" />
                  {config.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                  When enabled, every incoming request to this endpoint gets this response
                  instead of the default JSON success envelope.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Status code</label>
                <input
                  className="input w-32"
                  type="number"
                  min="100"
                  max="599"
                  value={config.status}
                  onChange={(e) => update({ status: Number(e.target.value) || 200 })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-foreground">Headers</label>
                  <button className="btn-ghost btn-sm" onClick={addHeader}><ListPlus className="h-3.5 w-3.5" /> Add</button>
                </div>
                <div className="space-y-2">
                  {Object.entries(config.headers || {}).map(([k, v], idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        className="input flex-1 font-mono min-w-0"
                        value={k}
                        onChange={(e) => updateHeader(idx, e.target.value, v)}
                        placeholder="Header-Name"
                      />
                      <input
                        className="input flex-[2] font-mono min-w-0"
                        value={v}
                        onChange={(e) => updateHeader(idx, k, e.target.value)}
                        placeholder="value"
                      />
                      <button className="btn-ghost btn-icon-sm shrink-0" onClick={() => removeHeader(k)} aria-label="Remove header">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Body</label>
                <textarea
                  className="input font-mono min-h-[140px] py-2"
                  value={config.body}
                  onChange={(e) => update({ body: e.target.value })}
                  spellCheck={false}
                />
                {prettyBody ? (
                  <details className="mt-2">
                    <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">Preview pretty</summary>
                    <pre className="code mt-1 p-2 rounded-md border border-border bg-muted/40 max-h-40 overflow-auto">{prettyBody}</pre>
                  </details>
                ) : null}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card">
              <button className="btn-outline btn-sm" onClick={onCopyHttp}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy as HTTP'}
              </button>
              <button className="btn-primary btn-sm" onClick={() => setOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function usePrettyBody(body) {
  const parsed = safeJsonParse(body);
  if (parsed === null) return null;
  return JSON.stringify(parsed, null, 2);
}
