import React from 'react';
import { IconSearch, IconServer, IconDatabase } from './Icon.jsx';

export default function SearchBar({ value, onChange, storageMode, onStorageMode, idbReady }) {
  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      <div className="relative flex-1 min-w-0">
        <IconSearch
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-4)] pointer-events-none"
        />
        <input
          className="input pl-8 t-mono"
          style={{ fontSize: '12.5px' }}
          placeholder="Filter by id, method, header, body…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div
        className="flex items-center gap-0.5 p-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--line)] shrink-0"
        role="radiogroup"
        aria-label="Storage backend"
      >
        <button
          role="radio"
          aria-checked={storageMode === 'local'}
          onClick={() => onStorageMode('local')}
          className={`btn btn-sm btn-icon ${storageMode === 'local' ? 'btn-primary' : 'btn-ghost'}`}
          title="LocalStorage (5 MB)"
        >
          <IconServer size={13} />
        </button>
        <button
          role="radio"
          aria-checked={storageMode === 'indexeddb'}
          onClick={() => idbReady && onStorageMode('indexeddb')}
          disabled={!idbReady}
          className={`btn btn-sm btn-icon ${storageMode === 'indexeddb' ? 'btn-primary' : 'btn-ghost'} disabled:opacity-30`}
          title={idbReady ? 'IndexedDB (large)' : 'IndexedDB unavailable'}
        >
          <IconDatabase size={13} />
        </button>
      </div>
    </div>
  );
}