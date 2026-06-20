import React from 'react';
import { timeAgo, formatBytes, methodClass } from '../lib/format.js';
import { IconTrash, IconClock, IconList } from './Icon.jsx';

export default function RequestList({
  requests,
  activeId,
  onSelect,
  onClear,
  totalCount,
  query,
  lastIncomingId,
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-3 sm:px-4 pt-3 pb-2.5 flex items-center justify-between border-b border-[var(--line)] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <IconList size={14} className="text-[var(--ink-4)]" />
          <span className="text-[13px] font-semibold text-[var(--ink)]">Requests</span>
          <span className="chip t-tabular" style={{ minWidth: '28px', justifyContent: 'center' }}>
            {totalCount}
          </span>
          {query ? (
            <span className="t-meta t-tabular">
              {requests.length} match
            </span>
          ) : null}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onClear}
          title="Clear all requests"
          disabled={totalCount === 0}
        >
          <IconTrash size={13} />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {requests.length === 0 ? (
          <EmptyState hasFilter={!!query} />
        ) : (
          <ul role="listbox" aria-label="Captured requests">
            {requests.map((r) => {
              const isActive = r.id === activeId;
              const isFresh = r.id === lastIncomingId;
              return (
                <li key={r.id} role="option" aria-selected={isActive}>
                  <button
                    onClick={() => onSelect(r.id)}
                    className={`w-full text-left px-3 sm:px-4 py-2.5 border-b border-[var(--line)] border-l-2 transition-colors ${
                      isActive
                        ? 'bg-[var(--surface-2)] border-l-[var(--ink)]'
                        : 'border-l-transparent hover:bg-[var(--surface-2)]'
                    } ${isFresh && !isActive ? 'row-flash' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                      <span className={`method-badge shrink-0 ${methodClass(r.method)}`}>{r.method}</span>
                      <span className="t-mono text-[11.5px] text-[var(--ink)] truncate flex-1 min-w-0">
                        {r.path || r.url || '/'}
                      </span>
                      <span className="t-meta t-tabular shrink-0">
                        {formatBytes(r.body?.size || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--ink-4)] gap-2 min-w-0">
                      <span className="truncate min-w-0">
                        <span className="t-mono">{r.ip?.remote || '—'}</span>
                        {r.userAgent?.detected ? (
                          <span className="ml-1.5 text-[var(--ink-3)]">· {r.userAgent.detected}</span>
                        ) : null}
                      </span>
                      <span className="t-tabular shrink-0 inline-flex items-center gap-1" title={r.receivedAt}>
                        <IconClock size={10} className="text-[var(--ink-5)]" />
                        {timeAgo(r.receivedAt)}
                      </span>
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

function EmptyState({ hasFilter }) {
  return (
    <div className="empty-shell">
      <div
        className="mx-auto mb-3 h-10 w-10 rounded-full border border-dashed border-[var(--line)] flex items-center justify-center text-[var(--ink-4)]"
      >
        <IconClock size={16} />
      </div>
      <p className="text-[13px] font-medium text-[var(--ink)]">
        {hasFilter ? 'No matching requests' : 'No requests captured yet'}
      </p>
      <p className="text-[11.5px] text-[var(--ink-4)] mt-1 leading-relaxed max-w-[20rem]">
        {hasFilter
          ? 'Try a different filter or clear the search box.'
          : 'Send any HTTP method to your endpoint and it will appear here instantly.'}
      </p>
      {!hasFilter ? (
        <code className="mt-3 inline-block px-2.5 py-1 rounded-md bg-[var(--surface-2)] border border-[var(--line)] t-mono" style={{ fontSize: '11px' }}>
          curl -X POST <span className="text-[var(--ink)]">/r/{`{your-id}`}</span>
        </code>
      ) : null}
    </div>
  );
}