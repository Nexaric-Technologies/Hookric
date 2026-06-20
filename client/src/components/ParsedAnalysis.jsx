import React from 'react';
import {
  Globe, Server, Shield, KeyRound, Fingerprint, Clock, Layers,
  MapPin, Bot, CheckCircle2, XCircle, Calendar, ArrowUpRight, Sparkles,
} from 'lucide-react';
import { formatBytes } from '../lib/format.js';

// Map helpers ----------------------------------------------------------

function mapUrl(ip) {
  if (!ip?.latitude || !ip?.longitude) return null;
  return `https://www.openstreetmap.org/?mlat=${ip.latitude}&mlon=${ip.longitude}#map=10/${ip.latitude}/${ip.longitude}`;
}

function fmtCoord(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n)) return null;
  return n.toFixed(4) + '°';
}

// Main component -------------------------------------------------------
//
// The right column is the single vertical scroll surface. Inside it,
// each section is a Double-Bezel "machined hardware" card: outer
// shell (hairline ring + 1.5px tray padding) wrapping an inner core
// (squircle radius + inset highlight). Each card fades up + blurs
// in with a staggered delay when a new request is selected.

export default function ParsedAnalysis({ request }) {
  if (!request) {
    return <AnalysisPlaceholder />;
  }

  // Re-keying on request.id re-mounts every section so the CSS
  // `rise` animation replays each time the user clicks a request.
  const animKey = request.id;

  const ip = request.ip || {};
  const ua = request.userAgent || {};
  const auth = request.auth || {};
  const body = request.body || {};
  const analysis = request.analysis || {};

  return (
    <div className="h-full overflow-y-auto orb-bg">
      <div className="px-4 py-5 text-sm space-y-3.5 relative">
        {/* Eyebrow strip — sits above the bento, gives the column
            a magazine-masthead feel. */}
        <div
          key={`${animKey}-masthead`}
          className="anim-rise flex items-center justify-between gap-2 pb-1"
        >
          <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80 font-medium">
            request · {String(request.method || '?').toUpperCase()}
          </span>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums font-mono">
            {request.processingMs ?? 0}ms
          </span>
        </div>

        <Section key={`${animKey}-net`} icon={Globe} title="Network" delay={1}>
          <KV k="Method" v={request.method} badge={methodBadgeClass(request.method)} />
          <ScrollKV k="URL" v={request.url} />
          <ScrollKV k="Path" v={request.path} />
          <ScrollKV k="Host" v={request.host} />
          <KV
            k="Protocol"
            v={`${(request.protocol || '').toUpperCase()} · ${request.httpVersion || ''}${ip.httpProtocol ? ` · ${ip.httpProtocol}` : ''}`}
          />
          <KV k="Secure" v={request.secure ? 'yes' : 'no'} />
        </Section>

        <Section key={`${animKey}-ip`} icon={MapPin} title="IP & location" delay={2}>
          <ScrollKV k="Source IP" v={ip.remote} />
          <ScrollKV k="X-Forwarded-For" v={ip.xForwardedFor} />
          <ScrollKV k="Real IP" v={ip.realIp} />
          <KV k="Country" v={ip.country} />
          <KV k="Region" v={ip.region} />
          <KV k="City" v={ip.city} />
          <ScrollKV k="Postal" v={ip.postalCode} />
          <KV k="Continent" v={ip.continent} />
          <ScrollKV k="ASN" v={ip.asn} />
          <KV k="ISP / Org" v={ip.isp} />
          <KV k="Edge colo" v={ip.colo} />
          <CoordRow ip={ip} />
        </Section>

        <Section key={`${animKey}-tls`} icon={Server} title="TLS" delay={3}>
          <KV k="Secure" v={request.tls?.secure ? 'yes' : 'no'} />
          <ScrollKV k="Version" v={request.tls?.version || '—'} />
          <ScrollKV k="Cipher" v={request.tls?.cipher || '—'} />
          <KV k="Client cert" v={request.tls?.clientAuth ? 'presented' : '—'} />
        </Section>

        <Section key={`${animKey}-ua`} icon={Fingerprint} title="User agent" delay={4}>
          <KV k="Browser" v={ua.browser ? `${ua.browser}${ua.browserVersion ? ' ' + ua.browserVersion : ''}` : null} />
          <KV k="Engine" v={ua.engine ? `${ua.engine}${ua.engineVersion ? ' ' + ua.engineVersion : ''}` : null} />
          <KV k="OS" v={ua.os ? `${ua.os}${ua.osVersion ? ' ' + ua.osVersion : ''}` : null} />
          <KV
            k="Device"
            v={ua.device
              ? `${ua.deviceVendor ? ua.deviceVendor + ' ' : ''}${ua.device}${ua.deviceType ? ' (' + ua.deviceType + ')' : ''}`
              : ua.deviceType || null}
          />
          <KV k="Detected" v={ua.detected} />
          <KV k="Bot" v={ua.bot ? 'likely' : 'no'} badge={ua.bot ? 'method-put' : 'method-get'} icon={ua.bot ? Bot : CheckCircle2} />
          {ua.raw ? (
            <details className="group/ua pt-2 mt-1.5 border-t border-border/40">
              <summary className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground cursor-pointer hover:text-foreground select-none transition-colors duration-500 ease-spring">
                <span className="inline-block transition-transform duration-500 ease-spring group-open/ua:rotate-90 text-foreground/70">▸</span>
                Raw UA string
              </summary>
              <ScrollBlock className="mt-2 font-mono text-[11px] text-foreground/85 p-2.5 rounded-bezel-inner bg-black/[0.03] dark:bg-white/[0.03] ring-1 ring-black/[0.05] dark:ring-white/[0.05] whitespace-pre anim-rise-2">
                {ua.raw}
              </ScrollBlock>
            </details>
          ) : null}
        </Section>

        <Section key={`${animKey}-auth`} icon={Shield} title="Authentication" delay={5}>
          {auth.basic || auth.bearer || auth.apiKey ? (
            <>
              {auth.basic ? (
                <>
                  <KV k="Type" v="Basic" badge="method-post" />
                  {auth.basic.user ? <KV k="User" v={auth.basic.user} mono /> : null}
                </>
              ) : null}
              {auth.bearer ? (
                <>
                  <KV k="Type" v="Bearer" badge="method-post" />
                  <KV k="Token length" v={auth.bearer.length} mono />
                  <KV k="JWT" v={auth.bearer.claims ? 'yes' : 'no'} />
                  {auth.bearer.expires ? <KV k="JWT expires" v={auth.bearer.expires} /> : null}
                  {auth.bearer.claims ? (
                    <details className="group/jwt pt-2 mt-1.5 border-t border-border/40">
                      <summary className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground cursor-pointer hover:text-foreground select-none transition-colors duration-500 ease-spring">
                        <span className="inline-block transition-transform duration-500 ease-spring group-open/jwt:rotate-90 text-foreground/70">▸</span>
                        JWT claims
                      </summary>
                      <ScrollBlock as="pre" className="code mt-2 p-2.5 rounded-bezel-inner bg-black/[0.03] dark:bg-white/[0.03] ring-1 ring-black/[0.05] dark:ring-white/[0.05] max-h-44 text-[11px] anim-rise-2">
                        {JSON.stringify(auth.bearer.claims, null, 2)}
                      </ScrollBlock>
                    </details>
                  ) : null}
                </>
              ) : null}
              {auth.apiKey ? (
                <>
                  <KV k="API key" v="present" badge="method-post" />
                  <KV k="Length" v={String(auth.apiKey).length} />
                </>
              ) : null}
            </>
          ) : (
            <div className="text-[12px] text-muted-foreground">No credentials detected.</div>
          )}
        </Section>

        <Section key={`${animKey}-sig`} icon={KeyRound} title="Webhook signatures" delay={6}>
          {request.signatures?.length ? (
            <ul className="space-y-1.5">
              {request.signatures.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="chip border-[hsl(var(--method-get)/0.4)] text-[hsl(var(--method-get))] bg-[hsl(var(--method-get)/0.10)]">
                    {s.provider}
                  </span>
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> signature present
                  </span>
                </li>
              ))}
            </ul>
          ) : analysis.isWebhook ? (
            <div className="text-[12px] text-[hsl(var(--method-put))] inline-flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5" />
              Looks like a webhook (vendor headers detected) but no signature header.
            </div>
          ) : (
            <div className="text-[12px] text-muted-foreground">No signature headers detected.</div>
          )}
        </Section>

        <Section key={`${animKey}-body`} icon={Layers} title="Body analysis" delay={7}>
          <KV k="Kind" v={body.kind} badge={body.kind === 'json' ? 'method-post' : body.kind === 'multipart' ? 'method-patch' : null} />
          <ScrollKV k="Content-Type" v={body.contentType || '—'} />
          <KV k="Size" v={formatBytes(body.size || 0)} />
          {body.files?.length ? <KV k="Files" v={String(body.files.length)} /> : null}
          {analysis.jsonShape ? (
            <>
              <KV k="JSON type" v={analysis.jsonShape.type} />
              {analysis.jsonShape.totalKeys ? <KV k="Total keys" v={String(analysis.jsonShape.totalKeys)} /> : null}
              {analysis.jsonShape.fields?.length ? (
                <details className="group/json pt-2 mt-1.5 border-t border-border/40">
                  <summary className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground cursor-pointer hover:text-foreground select-none transition-colors duration-500 ease-spring">
                    <span className="inline-block transition-transform duration-500 ease-spring group-open/json:rotate-90 text-foreground/70">▸</span>
                    JSON shape ({analysis.jsonShape.fields.length} field{analysis.jsonShape.fields.length === 1 ? '' : 's'})
                  </summary>
                  <ScrollBlock as="ul" className="mt-2 space-y-0.5 text-[11px] font-mono max-h-44 p-2.5 rounded-bezel-inner bg-black/[0.03] dark:bg-white/[0.03] ring-1 ring-black/[0.05] dark:ring-white/[0.05] anim-rise-2">
                    {analysis.jsonShape.fields.slice(0, 50).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 py-0.5">
                        <span className="text-foreground/90 whitespace-nowrap">{f.path}</span>
                        <span className="ml-auto text-muted-foreground shrink-0 pl-2 tabular-nums">{f.type}</span>
                      </li>
                    ))}
                  </ScrollBlock>
                </details>
              ) : null}
            </>
          ) : null}
        </Section>

        <Section key={`${animKey}-tl`} icon={Clock} title="Timeline" delay={8}>
          <ul className="space-y-1 text-[12px]">
            {(request.timeline || []).map((t, i) => (
              <li key={i} className="flex items-center gap-2 font-mono">
                <span className="text-muted-foreground w-12 tabular-nums shrink-0">{t.ms}ms</span>
                <span className="text-foreground/90">{t.label}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 mt-2 border-t border-border/40 text-[11px] text-muted-foreground inline-flex items-center gap-1.5 tabular-nums">
            <Calendar className="h-3 w-3" />
            Total processing: <span className="text-foreground/90 font-mono">{request.processingMs ?? 0}ms</span>
          </div>
        </Section>
      </div>
    </div>
  );
}

// Placeholder shown when no request is selected. Lives inside the
// same orb-bg wrapper so the glow is consistent with the loaded
// state. Uses a shimmer bar to signal "ready, waiting".
function AnalysisPlaceholder() {
  return (
    <div className="h-full overflow-y-auto orb-bg">
      <div className="px-4 py-6 text-sm flex flex-col items-center justify-center h-full text-center">
        <div className="bezel-shell inline-flex p-3 mb-4">
          <div className="bezel-core w-12 h-12 flex items-center justify-center rounded-bezel-inner">
            <Sparkles className="h-5 w-5 text-primary animate-pulse-soft" />
          </div>
        </div>
        <p className="text-[13px] text-foreground/90 font-display tracking-tight">No request selected</p>
        <p className="text-[11.5px] text-muted-foreground mt-1.5 max-w-[220px] leading-relaxed">
          Pick a request from the list to see the parsed analysis render in real time.
        </p>
        <div className="mt-5 w-32 h-1 rounded-full overflow-hidden bg-black/[0.06] dark:bg-white/[0.06] relative">
          <div className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
}

// Sub-components -------------------------------------------------------

// Double-Bezel section card.
//
// DOM: <motion.bezel-shell>  ← outer tray (ring-1, p-1.5, bezel-outer radius)
//        <bezel-core>        ← inner core (inset highlight, bezel-inner radius)
//          <header>
//          <body>
//
// `delay` controls the staggered entry animation (1..8). Re-mounting
// the section (via a key change when request.id changes) replays the
// rise animation so each new request gets its own reveal.
function Section({ icon: Icon, title, children, delay = 1 }) {
  const delayClass = `anim-rise-${Math.min(8, Math.max(1, delay))}`;
  return (
    <div className={`bezel-shell magnetic ${delayClass}`}>
      <section className="bezel-core">
        <header className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border/40 bg-gradient-to-b from-white/[0.02] to-transparent">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-[8px] bg-foreground/[0.06] dark:bg-white/[0.06] ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <Icon className="h-3 w-3 text-primary" strokeWidth={1.5} />
          </span>
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground leading-none">
            {title}
          </h3>
        </header>
        <div className="px-3.5 py-3 space-y-1 overflow-x-auto overflow-y-hidden">
          {children}
        </div>
      </section>
    </div>
  );
}

// KV: a label-value row. Short values are inline; long ones stay
// inline too — but the chip/badge variants get the magnetic hover.
function KV({ k, v, mono, badge, icon: Icon }) {
  if (v == null || v === '' || v === '—') {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground/50">
        <span className="w-[6.5rem] shrink-0 text-[11px] uppercase tracking-[0.08em]">{k}</span>
        <span className="text-[11px]">—</span>
      </div>
    );
  }
  const display = String(v);
  const isMono = mono || display.length > 40;
  return (
    <div className="flex items-start gap-2 text-[12px] group/row">
      <span className="w-[6.5rem] shrink-0 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/80 pt-0.5 transition-colors duration-500 ease-spring group-hover/row:text-muted-foreground">
        {k}
      </span>
      <span className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
        {Icon ? <Icon className="h-3 w-3 text-muted-foreground shrink-0" strokeWidth={1.5} /> : null}
        {badge ? (
          <span className={`chip border-[hsl(var(--${badge})/0.4)] text-[hsl(var(--${badge}))] bg-[hsl(var(--${badge})/0.10)] magnetic`}>
            {display}
          </span>
        ) : (
          <span className={`text-foreground break-all min-w-0 ${isMono ? 'font-mono text-[11.5px]' : ''}`}>
            {display}
          </span>
        )}
      </span>
    </div>
  );
}

// CoordRow — the only true CTA in the column. Renders the "view map"
// link using the Button-in-Button pattern: an outer pill with a
// nested icon circle that translates diagonally on hover.
function CoordRow({ ip }) {
  const lat = fmtCoord(ip.latitude);
  const lon = fmtCoord(ip.longitude);
  if (!lat && !lon) return null;
  const url = mapUrl(ip);
  return (
    <div className="flex items-start gap-2 text-[12px] pt-2 mt-1.5 border-t border-border/40">
      <span className="w-[6.5rem] shrink-0 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/80 inline-flex items-center gap-1.5 pt-0.5">
        <MapPin className="h-3 w-3" strokeWidth={1.5} /> Coords
      </span>
      <span className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[11.5px] text-foreground tabular-nums">{lat || '—'}, {lon || '—'}</span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            // Button-in-Button: outer pill + nested rounded-full
            // icon circle that translates diagonally on hover.
            className="group/map relative inline-flex items-center gap-1.5 pl-3 pr-1.5 h-7 rounded-island
                       text-[11.5px] font-medium text-primary
                       bg-primary/[0.10] ring-1 ring-primary/30
                       hover:bg-primary/[0.18] hover:ring-primary/40
                       active:scale-[0.98]
                       transition-all duration-500 ease-spring"
          >
            <span>view map</span>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20
                             transition-transform duration-500 ease-spring
                             group-hover/map:translate-x-0.5 group-hover/map:-translate-y-[1px] group-hover/map:scale-105">
              <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
            </span>
          </a>
        ) : null}
      </span>
    </div>
  );
}

function methodBadgeClass(method) {
  if (!method) return null;
  const m = String(method).toLowerCase();
  if (['get', 'post', 'put', 'patch', 'delete'].includes(m)) return `method-${m}`;
  return 'method-other';
}

// ScrollKV: KV row whose value sits in a horizontally scrollable
// mini-region. Label stays put; value pans sideways for long URLs,
// ASNs, header values, etc.
function ScrollKV({ k, v }) {
  if (v == null || v === '' || v === '—') {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground/50">
        <span className="w-[6.5rem] shrink-0 text-[11px] uppercase tracking-[0.08em]">{k}</span>
        <span className="text-[11px]">—</span>
      </div>
    );
  }
  const display = String(v);
  return (
    <div className="flex items-start gap-2 text-[12px]">
      <span className="w-[6.5rem] shrink-0 text-[11px] uppercase tracking-[0.08em] text-muted-foreground/80 pt-1.5">{k}</span>
      <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden max-h-8 rounded-[8px] ring-1 ring-transparent hover:ring-border/60 transition-all duration-500 ease-spring">
        <div className="font-mono text-[11.5px] text-foreground whitespace-nowrap px-2 py-1.5">
          {display}
        </div>
      </div>
    </div>
  );
}

// ScrollBlock: a horizontally scrollable container for wide content
// (raw UA, JSON shape, JWT claims). Preserves HTML validity by
// applying sizing classes directly to the underlying element.
function ScrollBlock({ as: Tag = 'div', className = '', children, ...rest }) {
  const extra = Tag === 'pre' || Tag === 'code'
    ? 'min-w-max whitespace-pre'
    : Tag === 'ul' || Tag === 'ol'
    ? 'min-w-max [&>li]:flex [&>li]:flex-nowrap [&>li]:whitespace-nowrap'
    : 'min-w-max';
  return (
    <Tag className={`overflow-x-auto overflow-y-auto ${extra} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
