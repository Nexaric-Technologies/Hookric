// Browser storage layer.
// - LocalStorage is the default (5 MB ceiling).
// - IndexedDB is opted in via the UI and supports much larger payloads.

const LS_PREFIX = 'hookrick:v1:';

export function lsLoad(endpointId) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + endpointId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function lsSave(endpointId, requests) {
  try {
    // Drop very old entries to keep under ~5MB.
    const trimmed = trimToLocalStorage(requests);
    localStorage.setItem(LS_PREFIX + endpointId, JSON.stringify(trimmed));
  } catch (err) {
    // Quota exceeded — drop oldest
    if (requests.length > 1) {
      try { lsSave(endpointId, requests.slice(0, Math.max(1, Math.floor(requests.length / 2)))); }
      catch { /* give up */ }
    }
  }
}

export function lsClear(endpointId) {
  try { localStorage.removeItem(LS_PREFIX + endpointId); } catch { /* noop */ }
}

function trimToLocalStorage(requests) {
  // Quick best-effort: cap at 4MB to leave room for other state.
  let json = JSON.stringify(requests);
  if (json.length <= 4 * 1024 * 1024) return requests;
  // Otherwise drop oldest until under cap
  const sorted = [...requests].sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
  while (sorted.length > 1) {
    sorted.shift();
    json = JSON.stringify(sorted);
    if (json.length <= 4 * 1024 * 1024) return sorted;
  }
  return sorted;
}

// ---- IndexedDB (lazy-open) ----

const DB_NAME = 'hookrick';
const DB_VERSION = 1;
const STORE = 'requests';

let _dbPromise = null;
function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('byEndpoint', 'endpointId', { unique: false });
        os.createIndex('byReceivedAt', 'receivedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

export async function idbSave(endpointId, request) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(request);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

export async function idbLoadAll(endpointId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const idx = tx.objectStore(STORE).index('byEndpoint');
      const req = idx.getAll(IDBKeyRange.only(endpointId));
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt)));
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

export async function idbClear(endpointId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const idx = tx.objectStore(STORE).index('byEndpoint');
      const req = idx.openCursor(IDBKeyRange.only(endpointId));
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) { cur.delete(); cur.continue(); }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

export async function idbIsAvailable() {
  try { await openDB(); return true; } catch { return false; }
}
