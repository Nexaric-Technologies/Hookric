import React from 'react';
import { Search, HardDrive, Database } from 'lucide-react';

export default function SearchBar({ value, onChange, storageMode, onStorageMode, idbReady }) {
  return (
    <div className="flex items-center gap-2 w-full min-w-0">
      <div className="relative flex-1 min-w-0">
        <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          className="input pl-8"
          placeholder="Search by id, method, header, body…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      <div className="segmented shrink-0" role="radiogroup" aria-label="Storage backend">
        <button
          role="radio"
          aria-checked={storageMode === 'local'}
          onClick={() => onStorageMode('local')}
          className={`segmented-item w-8 px-0 ${storageMode === 'local' ? 'segmented-item-active' : ''}`}
          title="LocalStorage (5 MB)"
        >
          <HardDrive className="h-3.5 w-3.5" />
        </button>
        <button
          role="radio"
          aria-checked={storageMode === 'indexeddb'}
          onClick={() => idbReady && onStorageMode('indexeddb')}
          disabled={!idbReady}
          className={`segmented-item w-8 px-0 ${storageMode === 'indexeddb' ? 'segmented-item-active' : ''} disabled:opacity-40`}
          title={idbReady ? 'IndexedDB (large)' : 'IndexedDB unavailable'}
        >
          <Database className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
