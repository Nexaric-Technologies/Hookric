import React, { useEffect, useState } from 'react';
import { useWebhookStore } from './lib/useWebhookStore.js';
import EndpointCard from './components/EndpointCard.jsx';
import SearchBar from './components/SearchBar.jsx';
import RequestList from './components/RequestList.jsx';
import RequestDetails from './components/RequestDetails.jsx';
import ParsedAnalysis from './components/ParsedAnalysis.jsx';
import ResponseBuilder, { ResponsePanel } from './components/ResponseBuilder.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import {
  IconWebhook, IconHelp, IconBell, IconBellOff, IconActivity,
  IconList, IconCode, IconClose, IconSparkle, IconArrowRight,
  IconShield, IconServer, IconLayers,
} from './components/Icon.jsx';

// Top-level page modes:
//   'details'   — right pane shows RequestDetails (default)
//   'analysis'  — right pane shows ParsedAnalysis
//   'response'  — right pane shows ResponsePanel (mock response editor)
// On desktop all three panes are visible at once (list | right pane).
// On mobile the list and right pane swap (single-screen operation).
const PANE_KEYS = [
  { key: 'details',  label: 'Details',  icon: IconList },
  { key: 'analysis', label: 'Analysis', icon: IconActivity },
  { key: 'response', label: 'Response', icon: IconCode },
];

export default function App() {
  const store = useWebhookStore();
  const [pane, setPane] = useState('details'); // desktop: which right-pane tab
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'right'
  const [showHelp, setShowHelp] = useState(false);

  const regenerate = () => {
    // Reload to reset endpoint id + clear in-memory store. The store
    // re-initializes from localStorage on the next mount.
    window.location.reload();
  };

  // When a new request lands and we're on the details/analysis pane on
  // desktop, the store auto-selects it. On mobile, switch to the right
  // pane if user is currently looking at the list (so they see the new
  // request immediately without scrolling the list).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMobile = !window.matchMedia('(min-width: 768px)').matches;
    if (!isMobile) return;
    if (store.lastIncomingId && mobileView === 'list' && store.active) {
      // Don't auto-switch on mobile — it's disruptive. The list flashes.
    }
  }, [store.incomingPulse]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <Header
        onHelp={() => setShowHelp(true)}
        theme={store.theme}
        setTheme={store.setTheme}
        notificationsOn={store.notificationsOn}
        notificationPermission={store.notificationPermission}
        toggleNotifications={store.toggleNotifications}
        incomingPulse={store.incomingPulse}
        lastIncomingId={store.lastIncomingId}
      />

      <main className="flex-1 min-h-0 w-full max-w-[1400px] mx-auto px-3 sm:px-4 pt-3 pb-20 md:pb-4 flex flex-col gap-3">
        {/* Hidden H1 for SEO + screen readers. The visible "HookRick"
            brand mark sits in the header above. */}
        <h1 className="sr-only">
          HookRick — live webhook inspector by NeXaric
        </h1>

        {/* Endpoint bar — always visible */}
        <section aria-labelledby="endpoint-h">
          <h2 id="endpoint-h" className="sr-only">Your endpoint URL</h2>
          <EndpointCard
            endpointId={store.endpointId}
            onRegenerate={regenerate}
            connected={store.connected}
          />
        </section>

        {/* Search bar (and storage toggle) */}
        <section aria-labelledby="search-h">
          <h2 id="search-h" className="sr-only">Filter and storage</h2>
          <div className="flex items-stretch gap-2">
            <SearchBar
              value={store.query}
              onChange={store.setQuery}
              storageMode={store.storageMode}
              onStorageMode={store.switchStorageMode}
              idbReady={store.idbReady}
            />
            {/* Response button lives in the toolbar on mobile too,
                opens the same sheet */}
            <div className="md:hidden">
              <ResponseBuilder config={store.responseConfig} onChange={store.setResponseConfig} />
            </div>
          </div>
        </section>

        {/* Desktop 2-pane: list (always visible) + right pane tabbed.
            Mobile: list OR right pane, swap via bottom tab bar. */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] gap-3">
          {/* List */}
          <section
            className={`card min-h-0 ${mobileView === 'list' ? '' : 'hidden md:block'}`}
            aria-labelledby="requests-h"
          >
            <h2 id="requests-h" className="sr-only">Captured requests</h2>
            <RequestList
              requests={store.requests}
              activeId={store.activeId}
              onSelect={(id) => { store.setActiveId(id); setMobileView('right'); }}
              onClear={store.clearAll}
              totalCount={store.totalCount}
              query={store.query}
              lastIncomingId={store.lastIncomingId}
            />
          </section>

          {/* Right pane (Details / Analysis / Response) */}
          <section
            className={`card min-h-0 flex flex-col overflow-hidden ${mobileView === 'right' ? '' : 'hidden md:flex'}`}
            aria-labelledby="details-h"
          >
            <h2 id="details-h" className="sr-only">Request details</h2>
            {/* Pane tab strip */}
            <div className="px-3 sm:px-4 pt-2.5 pb-2 border-b border-[var(--line)] flex items-center gap-3 shrink-0">
              <div
                className="flex items-center gap-0.5 p-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--line)]"
                role="tablist"
                aria-label="Right pane"
              >
                {PANE_KEYS.map((p) => {
                  const Icon = p.icon;
                  const active = pane === p.key;
                  return (
                    <button
                      key={p.key}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setPane(p.key)}
                      className={`pane-tab ${active ? 'pane-tab-active' : ''}`}
                    >
                      <Icon size={13} />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
              {pane === 'analysis' && store.active ? (
                <span className="ml-auto t-meta inline-flex items-center gap-1.5">
                  <span className="conn-dot live" />
                  live
                </span>
              ) : null}
              <span className="ml-auto" />
              {/* Response button in the header of the right pane (desktop only) */}
              <div className="hidden md:block">
                <ResponseBuilder config={store.responseConfig} onChange={store.setResponseConfig} />
              </div>
            </div>

            {/* Pane content — each panel is the single scroll surface */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {pane === 'details'  ? <RequestDetails request={store.active} allRequests={store.requests} /> : null}
              {pane === 'analysis' ? <ParsedAnalysis request={store.active} /> : null}
              {pane === 'response' ? <ResponsePanel config={store.responseConfig} onChange={store.setResponseConfig} /> : null}
            </div>
          </section>
        </div>
      </main>

      {/* Mobile bottom tab strip — single-screen operation.
          Two tabs: Requests / Details. The current pane (Details /
          Analysis / Response) is selected via the right pane tabs once
          the user is on the right side. */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-30" aria-label="Mobile navigation">
        <div
          className="flex items-center gap-0.5 p-1 rounded-lg bg-[var(--surface)] border border-[var(--line)]"
          style={{ paddingBottom: 'calc(4px + env(safe-area-inset-bottom, 0px))' }}
        >
          <MobileTab
            active={mobileView === 'list'}
            onClick={() => setMobileView('list')}
            count={store.totalCount}
          >
            Requests
          </MobileTab>
          <MobileTab
            active={mobileView === 'right'}
            onClick={() => setMobileView('right')}
            disabled={!store.active}
          >
            {pane === 'analysis' ? 'Analysis' : pane === 'response' ? 'Response' : 'Details'}
          </MobileTab>
        </div>
      </nav>

      {showHelp ? <HelpModal onClose={() => setShowHelp(false)} /> : null}
    </div>
  );
}

// --- Header ---

function Header({ onHelp, theme, setTheme, notificationsOn, notificationPermission, toggleNotifications, incomingPulse }) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--canvas)]/85"
      style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
    >
      <div className="max-w-[1400px] mx-auto px-3 sm:px-4 h-14 flex items-center gap-2 sm:gap-3">
        <a
          className="flex items-center gap-2.5 group"
          href="https://nexaric.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="HookRick by NeXaric — visit nexaric.com"
          itemProp="url"
        >
          <div
            className="h-8 w-8 rounded-md bg-[var(--ink)] text-[var(--canvas)] flex items-center justify-center shrink-0"
          >
            <IconWebhook size={16} strokeWidth={1.4} />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[15px] font-semibold text-[var(--ink)] tracking-tight whitespace-nowrap">
              <span itemProp="name">HookRick</span>
              <span className="text-[var(--ink-4)] font-normal"> by </span>
              <span className="text-[var(--ink)]">NeXaric</span>
            </span>
            <span className="text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-4)] font-medium whitespace-nowrap">
              Webhook inspector
            </span>
          </div>
        </a>

        <span className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            onClick={onHelp}
            className="btn btn-ghost btn-sm"
            aria-label="How it works"
          >
            <IconHelp size={14} />
            <span className="hidden sm:inline">How it works</span>
          </button>
          <BellToggle
            on={notificationsOn}
            permission={notificationPermission}
            onClick={toggleNotifications}
            incomingPulse={incomingPulse}
          />
          <span className="hidden md:inline-block h-5 w-px bg-[var(--line)]" />
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </span>
      </div>
    </header>
  );
}

function BellToggle({ on, permission, onClick, incomingPulse }) {
  // Disabled: when notifications are not supported at all, OR denied by the OS.
  const supported = permission !== 'unsupported';
  const denied = permission === 'denied';

  let title = 'Enable browser alerts for incoming webhooks';
  if (!supported) title = 'Browser notifications are not supported here';
  if (denied)     title = 'Notifications are blocked — enable in your browser settings';
  if (on)         title = 'Alerts on — click to disable';

  // Pulse-ring animation when a new request just landed.
  const Pulse = incomingPulse > 0 && on ? (
    <span key={incomingPulse} className="pulse-ring" />
  ) : null;

  return (
    <button
      onClick={onClick}
      disabled={!supported || denied}
      title={title}
      aria-label={title}
      aria-pressed={on}
      className={`relative btn btn-ghost btn-icon-sm ${on ? 'text-[var(--ink)]' : ''} disabled:opacity-40`}
    >
      {on ? <IconBell size={14} /> : <IconBellOff size={14} />}
      {on ? (
        <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--m-get)]" />
      ) : null}
      {Pulse}
    </button>
  );
}

function MobileTab({ active, onClick, disabled, count, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`relative flex-1 h-10 rounded-md text-[13px] font-medium transition-colors ${
        active
          ? 'bg-[var(--ink)] text-[var(--canvas)]'
          : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
      } disabled:opacity-30 disabled:pointer-events-none`}
    >
      {children}
      {count > 0 ? (
        <span
          className={`ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-semibold rounded-full t-tabular ${
            active ? 'bg-[var(--canvas)]/20 text-[var(--canvas)]' : 'bg-[var(--surface-2)] text-[var(--ink-3)] border border-[var(--line)]'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

// --- Help / "How it works" modal ---

function HelpModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-overlay" onClick={onClose} role="presentation">
      <div
        className="card w-full max-w-xl max-h-[90vh] overflow-y-auto sm:!rounded-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="How hookrick works"
      >
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center gap-2.5 sticky top-0 bg-[var(--surface)] z-10">
          <IconSparkle size={16} className="text-[var(--ink)]" />
          <h2 className="text-[15px] t-display font-semibold text-[var(--ink)] flex-1">How hookrick works</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <IconClose size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <ol className="space-y-3 text-[13px] text-[var(--ink)] list-decimal pl-5 marker:text-[var(--ink-4)]">
            <li>
              A unique endpoint ID is generated the moment you load the page. Copy the URL or scan the QR code.
            </li>
            <li>
              Fire any HTTP method at that URL. The capture server parses headers, query, cookies, body, files — then broadcasts the result over a WebSocket.
            </li>
            <li>
              Requests appear instantly in the list. Click one to inspect raw, pretty, or parsed bodies, headers, query, cookies, files, and a timeline.
            </li>
            <li>
              Use <span className="ic">Response</span> to define a custom status, headers, and body the server returns to the caller.
            </li>
            <li>
              Toggle the bell to receive a browser notification whenever a new webhook arrives — even when the tab is in the background.
            </li>
          </ol>

          <div className="grid grid-cols-2 gap-2.5">
            <Feature icon={IconActivity} title="Real-time" desc="WebSocket push from capture server" />
            <Feature icon={IconShield}   title="Privacy"   desc="No DB, no signup, capture never leaves your browser" />
            <Feature icon={IconServer}   title="Storage"   desc="LocalStorage / IndexedDB" />
            <Feature icon={IconLayers}   title="Capture"   desc="Method, header, body, file, auth, UA, geo" />
          </div>

          <div className="rounded-md border border-[var(--line)] bg-[var(--surface-2)] p-3 text-[11.5px] text-[var(--ink-3)] leading-relaxed">
            <strong className="text-[var(--ink)]">Privacy:</strong> sensitive headers (Authorization, API keys, cookies) are automatically masked in the UI. Raw values are still stored locally for replay purposes only.
          </div>

          <div className="flex items-center justify-end">
            <button className="btn btn-primary btn-sm" onClick={onClose}>
              Got it <IconArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={13} className="text-[var(--ink-3)]" />
        <span className="text-[12px] font-semibold text-[var(--ink)]">{title}</span>
      </div>
      <p className="text-[11px] text-[var(--ink-4)] leading-relaxed">{desc}</p>
    </div>
  );
}