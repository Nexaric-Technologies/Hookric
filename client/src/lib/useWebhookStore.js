// Hook that owns: endpoint id, requests list, search query, active id,
// storage mode (localStorage vs IndexedDB), theme, and the response
// builder config.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateId } from './format.js';
import { joinRoom, onNewRequest, configureResponse, isConnected } from './socket.js';
import {
  lsLoad, lsSave, lsClear,
  idbLoadAll, idbSave, idbClear, idbIsAvailable,
} from './storage.js';

const ENDPOINT_KEY = 'nextcatch:v1:endpointId';
const THEME_KEY = 'nextcatch:v1:theme';
const STORAGE_KEY = 'nextcatch:v1:storage';

function loadEndpointId() {
  try {
    const saved = localStorage.getItem(ENDPOINT_KEY);
    if (saved && /^[a-z0-9]{4,32}$/i.test(saved)) return saved;
  } catch { /* noop */ }
  const id = generateId(8);
  try { localStorage.setItem(ENDPOINT_KEY, id); } catch { /* noop */ }
  return id;
}

function loadTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch { /* noop */ }
  return 'system';
}

function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return 'light';
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  if (resolved === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  root.style.colorScheme = resolved;
  return resolved;
}

export function useWebhookStore() {
  const [endpointId] = useState(loadEndpointId);
  const [requests, setRequests] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState('');
  const [storageMode, setStorageMode] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'local'; } catch { return 'local'; }
  });
  const [idbReady, setIdbReady] = useState(false);
  const [connected, setConnected] = useState(isConnected());

  // Theme
  const [theme, setThemeState] = useState(loadTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() => applyTheme(loadTheme()));

  const [responseConfig, setResponseConfig] = useState({
    enabled: false,
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: '{"ok":true}',
  });

  const requestsRef = useRef(requests);
  requestsRef.current = requests;

  // Apply theme on mount + on theme change
  useEffect(() => {
    const resolved = applyTheme(theme);
    setResolvedTheme(resolved);
  }, [theme]);

  // React to OS theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const r = applyTheme('system');
      setResolvedTheme(r);
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* noop */ }
  }, []);

  // Initial load: localStorage is sync, IndexedDB is async
  useEffect(() => {
    const ls = lsLoad(endpointId);
    if (ls.length) setRequests(ls);
    (async () => {
      const ok = await idbIsAvailable();
      setIdbReady(ok);
      if (ok && storageMode === 'indexeddb') {
        const rows = await idbLoadAll(endpointId);
        if (rows.length) setRequests(rows);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpointId]);

  // Subscribe to live requests
  useEffect(() => {
    joinRoom(endpointId);
    const off = onNewRequest((req) => {
      if (req.endpointId !== endpointId) return;
      setRequests((prev) => {
        const next = [req, ...prev].slice(0, 5000);
        try {
          if (storageMode === 'indexeddb' && idbReady) {
            idbSave(endpointId, req);
          } else {
            lsSave(endpointId, next);
          }
        } catch { /* noop */ }
        return next;
      });
    });
    return off;
  }, [endpointId, storageMode, idbReady]);

  // Connection state poll (cheap)
  useEffect(() => {
    const t = setInterval(() => setConnected(isConnected()), 1500);
    return () => clearInterval(t);
  }, []);

  // Push response config to server when it changes
  useEffect(() => {
    if (responseConfig.enabled) {
      configureResponse(endpointId, {
        status: responseConfig.status,
        headers: responseConfig.headers,
        body: responseConfig.body,
      });
    } else {
      configureResponse(endpointId, null);
    }
  }, [endpointId, responseConfig]);

  const active = useMemo(
    () => requests.find((r) => r.id === activeId) || requests[0] || null,
    [requests, activeId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((r) => {
      if ((r.id || '').toLowerCase().includes(q)) return true;
      if ((r.method || '').toLowerCase().includes(q)) return true;
      if ((r.url || '').toLowerCase().includes(q)) return true;
      if ((r.ip?.remote || '').toLowerCase().includes(q)) return true;
      if ((r.receivedAt || '').toLowerCase().includes(q)) return true;
      if ((r.body?.rawText || '').toLowerCase().includes(q)) return true;
      for (const [k, v] of Object.entries(r.headers || {})) {
        if (k.toLowerCase().includes(q)) return true;
        if (typeof v === 'string' && v.toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [requests, query]);

  const clearAll = useCallback(async () => {
    setRequests([]);
    setActiveId(null);
    lsClear(endpointId);
    if (idbReady) await idbClear(endpointId);
  }, [endpointId, idbReady]);

  const switchStorageMode = useCallback(async (mode) => {
    if (mode === storageMode) return;
    setStorageMode(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* noop */ }
    if (mode === 'indexeddb') {
      const rows = await idbLoadAll(endpointId);
      setRequests(rows);
    } else {
      setRequests(lsLoad(endpointId));
    }
  }, [storageMode, endpointId]);

  return {
    endpointId,
    requests: filtered,
    totalCount: requests.length,
    active,
    activeId: active?.id || null,
    setActiveId,
    query,
    setQuery,
    storageMode,
    switchStorageMode,
    idbReady,
    clearAll,
    connected,
    responseConfig,
    setResponseConfig,
    theme,
    setTheme,
    resolvedTheme,
  };
}
