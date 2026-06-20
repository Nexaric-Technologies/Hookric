import React from 'react';
import { methodColor, timeAgo, formatBytes } from '../lib/format.js';

export default function RequestList({ requests, activeId, onSelect, onClear, totalCount, query }) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 sm:px-4 pt-3 pb-2.5 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Requests</span>
          <span className="chip border-border bg-secondary text-secondary-foreground tabular-nums">
            {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {query ? (
            <span className="text-[11px] text-muted-foreground tabular-nums">{requests.length} match</span>
          ) : null}
          <button className="btn-ghost btn-sm" onClick={onClear} title="Clear all requests">
            Clear
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {requests.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="py-1">
            {requests.map((r) => {
              const isActive = r.id === activeId;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => onSelect(r.id)}
                    className={`w-full text-left px-3 sm:px-4 py-2.5 border-l-2 row-hover ${
                      isActive
                        ? 'bg-accent border-l-primary'
                        : 'border-l-transparent hover:bg-accent/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`method-badge ${methodColor(r.method)}`}>{r.method}</span>
                      <span className="text-[11.5px] font-mono text-muted-foreground truncate flex-1 min-w-0">
                        {r.path || r.url}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                        {formatBytes(r.body?.size || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2">
                      <span className="truncate min-w-0">
                        <span className="font-mono">{r.ip?.remote || '—'}</span>
                        {r.userAgent?.detected ? (
                          <span className="ml-1.5 text-foreground/70">· {r.userAgent.detected}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 tabular-nums" title={r.receivedAt}>{timeAgo(r.receivedAt)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-6 sm:p-8 text-center">
      <div className="mx-auto mb-3 h-10 w-10 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 8a5 5 0 0 1 10 0v3l2 2v3H5v-3l2-2z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      </div>
      <p className="text-sm font-medium text-foreground">No requests captured yet</p>
      <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">
        Send any HTTP method to your endpoint and it will appear here instantly.
      </p>
      <div className="mt-4 inline-block px-3 py-1.5 rounded-md bg-muted border border-border text-[11px] font-mono text-muted-foreground">
        curl -X POST <span className="text-foreground">/r/{`{your-id}`}</span>
      </div>
    </div>
  );
}
