import React, { useState } from 'react';
import { Webhook, Github, BookOpen, Zap, Shield, Database, Server, X, Sparkles, ArrowRight } from 'lucide-react';
import { useWebhookStore } from './lib/useWebhookStore.js';
import EndpointCard from './components/EndpointCard.jsx';
import SearchBar from './components/SearchBar.jsx';
import RequestList from './components/RequestList.jsx';
import RequestDetails from './components/RequestDetails.jsx';
import ParsedAnalysis from './components/ParsedAnalysis.jsx';
import ResponseBuilder from './components/ResponseBuilder.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';

export default function App() {
  const store = useWebhookStore();
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail' | 'analysis'
  const [showHelp, setShowHelp] = useState(false);

  const regenerate = () => {
    // endpoint id is persisted in localStorage; easiest path is a reload
    window.location.reload();
  };

  return (
    <div className="h-full flex flex-col bg-background text-foreground">
      <Header
        onHelp={() => setShowHelp(true)}
        theme={store.theme}
        setTheme={store.setTheme}
        resolvedTheme={store.resolvedTheme}
      />

      <main className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto px-3 sm:px-4 pb-20 md:pb-4 pt-3 flex flex-col gap-3">
        <EndpointCard
          endpointId={store.endpointId}
          onRegenerate={regenerate}
          connected={store.connected}
        />

        <div className="flex items-stretch gap-2">
          <SearchBar
            value={store.query}
            onChange={store.setQuery}
            storageMode={store.storageMode}
            onStorageMode={store.switchStorageMode}
            idbReady={store.idbReady}
          />
          <ResponseBuilder config={store.responseConfig} onChange={store.setResponseConfig} />
        </div>

        {/* Desktop 3-panel grid; mobile uses the bottom tab strip */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(300px,380px)] gap-3">
          <div className={`card min-h-0 ${mobileView === 'list' ? '' : 'hidden md:block'}`}>
            <RequestList
              requests={store.requests}
              activeId={store.activeId}
              onSelect={(id) => { store.setActiveId(id); setMobileView('detail'); }}
              onClear={store.clearAll}
              totalCount={store.totalCount}
              query={store.query}
            />
          </div>

          <div className={`card min-h-0 ${mobileView === 'detail' ? '' : 'hidden md:block'}`}>
            <RequestDetails request={store.active} allRequests={store.requests} />
          </div>

          <div className={`card min-h-0 flex flex-col ${mobileView === 'analysis' ? '' : 'hidden md:block'}`}>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Parsed analysis</span>
            </div>
            <div className="flex-1 min-h-0">
              <ParsedAnalysis request={store.active} />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile bottom tab strip */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="max-w-[1600px] mx-auto grid grid-cols-3 gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <MobileTab active={mobileView === 'list'} onClick={() => setMobileView('list')} count={store.totalCount}>Requests</MobileTab>
          <MobileTab active={mobileView === 'detail'} onClick={() => setMobileView('detail')} disabled={!store.active}>Details</MobileTab>
          <MobileTab active={mobileView === 'analysis'} onClick={() => setMobileView('analysis')} disabled={!store.active}>Analysis</MobileTab>
        </div>
      </nav>

      {showHelp ? <HelpModal onClose={() => setShowHelp(false)} /> : null}
    </div>
  );
}

function Header({ onHelp, theme, setTheme, resolvedTheme }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 h-14 flex items-center gap-2 sm:gap-3">
        <a className="flex items-center gap-2 group" href="/" onClick={(e) => e.preventDefault()}>
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-glow">
            <Webhook className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-display font-bold text-foreground tracking-tight">hookrick</span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">by nexaric</span>
          </div>
        </a>

        <span className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            onClick={onHelp}
            className="btn-ghost btn-sm"
            aria-label="How it works"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">How it works</span>
          </button>
          <a
            className="btn-ghost btn-icon-sm hidden sm:inline-flex"
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
          <span className="hidden md:inline-block h-5 w-px bg-border" />
          <ThemeToggle theme={theme} setTheme={setTheme} resolvedTheme={resolvedTheme} />
        </span>
      </div>
    </header>
  );
}

function MobileTab({ active, onClick, disabled, count, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative h-11 rounded-md text-sm font-medium transition-colors
        ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'}
        disabled:opacity-40 disabled:pointer-events-none`}
    >
      {children}
      {count > 0 ? (
        <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[10px] font-semibold rounded-full bg-secondary text-secondary-foreground tabular-nums">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function HelpModal({ onClose }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="card w-full max-w-xl max-h-[90vh] overflow-y-auto p-0 animate-scale-in sm:rounded-lg rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center gap-2 sticky top-0 bg-card z-10">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-base font-display font-bold text-foreground flex-1">How hookrick works</h2>
          <button className="btn-ghost btn-icon-sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <ol className="space-y-3 text-sm text-foreground/90 list-decimal pl-5 marker:text-muted-foreground">
            <li>
              A unique endpoint ID is generated the moment you load the page. Copy the URL or scan the QR code.
            </li>
            <li>
              Fire any HTTP method at that URL. The capture server parses headers, query, cookies, body, files — then broadcasts the result via Socket.IO.
            </li>
            <li>
              Requests appear instantly in the list. Click one to inspect raw, pretty, or parsed bodies, headers, query, cookies, files, and a timeline.
            </li>
            <li>
              Use the <span className="font-medium">Response</span> button to define a custom status, headers, and body the server returns to the caller.
            </li>
            <li>
              Switch storage to <span className="font-medium">IndexedDB</span> for hundreds of MB of history. Default is <span className="font-medium">LocalStorage</span> with a 5 MB ceiling.
            </li>
          </ol>

          <div className="grid grid-cols-2 gap-2.5">
            <Feature icon={Zap} title="Real-time" desc="WebSocket push from capture server" />
            <Feature icon={Shield} title="Privacy" desc="No DB, no signup, capture never leaves your browser" />
            <Feature icon={Database} title="Storage" desc="LocalStorage / IndexedDB" />
            <Feature icon={Server} title="Capture" desc="Method, header, body, file, auth, UA, geo" />
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 text-[11.5px] text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Privacy:</strong> sensitive headers (Authorization, API keys, cookies) are automatically masked in the UI. Raw values are still stored locally for replay purposes only.
          </div>

          <div className="flex items-center justify-end">
            <button className="btn-primary btn-sm" onClick={onClose}>
              Got it <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
