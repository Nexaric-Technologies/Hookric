import React from 'react';
import {
  IconServer, IconShield, IconKey, IconBrowser, IconClock, IconLayers,
  IconMapPin, IconActivity, IconCheck, IconClose, IconCalendar, IconExternal, IconSparkle, IconHash, IconFileCode,
} from './Icon.jsx';
import { formatBytes, methodClass } from '../lib/format.js';

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
// Single vertical scroll surface on the right pane. Each section is a
// flat card (1px border, no shadow). Sections reveal with a staggered
// fade-up when a new request is selected.

export default function ParsedAnalysis({ request }) {
  if (!request) {
    return <AnalysisPlaceholder />;
  }

  const animKey = request.id;
  const ip = request.ip || {};
  const ua = request.userAgent || {};
  const auth = request.auth || {};
  const body = request.body || {};
  const analysis = request.analysis || {};

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-3 sm:px-4 py-4 text-[13px] space-y-3">
        {/* Eyebrow */}
        <div
          key={`${animKey}-masthead`}
          className="flex items-center justify-between gap-2 pb-1 anim-rise"
        >
          <span className="t-eyebrow">
            Request · {String(request.method || '?').toUpperCase()}
          </span>
          <span className="t-meta t-mono t-tabular">
            {request.processingMs ?? 0}ms
          </span>
        </div>

        <Section key={`${animKey}-net`} icon={IconExternal} title="Network" delay={1}>
          <KV k="Method" v={request.method} badge={methodClass(request.method)} />
          <KV k="URL" v={request.url} mono />
          <KV k="Path" v={request.path} mono />
          <KV k="Host" v={request.host} mono />
          <KV k="Protocol" v={`${(request.protocol || '').toUpperCase()} · ${request.httpVersion || ''}${ip.httpProtocol ? ` · ${ip.httpProtocol}` : ''}`} />
          <KV k="Secure" v={request.secure ? 'yes' : 'no'} />
        </Section>

        <Section key={`${animKey}-ip`} icon={IconMapPin} title="IP & location" delay={2}>
          <KV k="Source IP" v={ip.remote} mono />
          <KV k="X-Forwarded-For" v={ip.xForwardedFor} mono />
          <KV k="Real IP" v={ip.realIp} mono />
          <KV k="Country" v={ip.country} />
          <KV k="Region" v={ip.region} />
          <KV k="City" v={ip.city} />
          <KV k="Postal" v={ip.postalCode} mono />
          <KV k="Continent" v={ip.continent} />
          <KV k="ASN" v={ip.asn} mono />
          <KV k="ISP / Org" v={ip.isp} />
          <KV k="Edge colo" v={ip.colo} />
          <CoordRow ip={ip} />
        </Section>

        <Section key={`${animKey}-tls`} icon={IconServer} title="TLS" delay={3}>
          <KV k="Secure" v={request.tls?.secure ? 'yes' : 'no'} />
          <KV k="Version" v={request.tls?.version || '—'} mono />
          <KV k="Cipher" v={request.tls?.cipher || '—'} mono />
          <KV k="Client cert" v={request.tls?.clientAuth ? 'presented' : '—'} />
        </Section>

        <Section key={`${animKey}-ua`} icon={IconBrowser} title="User agent" delay={4}>
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
          <KV k="Bot" v={ua.bot ? 'likely' : 'no'} badge={ua.bot ? 'chip-tint-red' : 'chip-tint-green'} icon={ua.bot ? IconActivity : IconCheck} />
          {ua.raw ? (
            <details className="group/ua pt-2 mt-2 border-t border-[var(--line)]">
              <summary className="flex items-center gap-1.5 t-eyebrow cursor-pointer hover:text-[var(--ink)] select-none">
                <span className="inline-block transition-transform group-open/ua:rotate-90 text-[var(--ink-3)]">▸</span>
                Raw UA string
              </summary>
              <pre className="code-wrap mt-2 p-2.5 rounded-md bg-[var(--surface-2)] border border-[var(--line)] max-h-44 anim-rise-2">
                {ua.raw}
              </pre>
            </details>
          ) : null}
        </Section>

        <Section key={`${animKey}-auth`} icon={IconShield} title="Authentication" delay={5}>
          {auth.basic || auth.bearer || auth.apiKey ? (
            <>
              {auth.basic ? (
                <>
                  <KV k="Type" v="Basic" badge="chip-tint-blue" />
                  {auth.basic.user ? <KV k="User" v={auth.basic.user} mono /> : null}
                </>
              ) : null}
              {auth.bearer ? (
                <>
                  <KV k="Type" v="Bearer" badge="chip-tint-blue" />
                  <KV k="Token length" v={String(auth.bearer.length)} mono />
                  <KV k="JWT" v={auth.bearer.claims ? 'yes' : 'no'} />
                  {auth.bearer.expires ? <KV k="JWT expires" v={auth.bearer.expires} /> : null}
                  {auth.bearer.claims ? (
                    <details className="group/jwt pt-2 mt-2 border-t border-[var(--line)]">
                      <summary className="flex items-center gap-1.5 t-eyebrow cursor-pointer hover:text-[var(--ink)] select-none">
                        <span className="inline-block transition-transform group-open/jwt:rotate-90 text-[var(--ink-3)]">▸</span>
                        JWT claims
                      </summary>
                      <pre className="code-wrap mt-2 p-2.5 rounded-md bg-[var(--surface-2)] border border-[var(--line)] max-h-44 anim-rise-2">
                        {JSON.stringify(auth.bearer.claims, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </>
              ) : null}
              {auth.apiKey ? (
                <>
                  <KV k="API key" v="present" badge="chip-tint-amber" />
                  <KV k="Length" v={String(auth.apiKey.length)} mono />
                </>
              ) : null}
            </>
          ) : (
            <div className="text-[12px] text-[var(--ink-4)]">No credentials detected.</div>
          )}
        </Section>

        <Section key={`${animKey}-sig`} icon={IconKey} title="Webhook signatures" delay={6}>
          {request.signatures?.length ? (
            <ul className="space-y-1.5">
              {request.signatures.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-[12px]">
                  <span className="chip chip-tint-green">{s.provider}</span>
                  <span className="text-[var(--ink-3)] inline-flex items-center gap-1">
                    <IconCheck size={12} /> signature present
                  </span>
                </li>
              ))}
            </ul>
          ) : analysis.isWebhook ? (
            <div className="text-[12px] text-[var(--tint-amber-fg)] inline-flex items-center gap-1.5">
              <IconClose size={12} />
              Looks like a webhook (vendor headers detected) but no signature header.
            </div>
          ) : (
            <div className="text-[12px] text-[var(--ink-4)]">No signature headers detected.</div>
          )}
        </Section>

        <Section key={`${animKey}-body`} icon={IconLayers} title="Body analysis" delay={7}>
          <KV k="Kind" v={body.kind} badge={body.kind === 'json' ? 'chip-tint-blue' : body.kind === 'multipart' ? 'chip-tint-amber' : null} />
          <KV k="Content-Type" v={body.contentType || '—'} mono />
          <KV k="Size" v={formatBytes(body.size || 0)} />
          {body.files?.length ? <KV k="Files" v={String(body.files.length)} /> : null}
          {analysis.jsonShape ? (
            <>
              <KV k="JSON type" v={analysis.jsonShape.type} />
              {analysis.jsonShape.totalKeys ? <KV k="Total keys" v={String(analysis.jsonShape.totalKeys)} /> : null}
              {analysis.jsonShape.fields?.length ? (
                <details className="group/json pt-2 mt-2 border-t border-[var(--line)]">
                  <summary className="flex items-center gap-1.5 t-eyebrow cursor-pointer hover:text-[var(--ink)] select-none">
                    <span className="inline-block transition-transform group-open/json:rotate-90 text-[var(--ink-3)]">▸</span>
                    JSON shape ({analysis.jsonShape.fields.length} field{analysis.jsonShape.fields.length === 1 ? '' : 's'})
                  </summary>
                  <ul className="mt-2 p-2.5 rounded-md bg-[var(--surface-2)] border border-[var(--line)] space-y-0.5 text-[11.5px] t-mono max-h-44 overflow-auto anim-rise-2">
                    {analysis.jsonShape.fields.slice(0, 50).map((f, i) => (
                      <li key={i} className="flex items-center gap-2 py-0.5">
                        <span className="text-[var(--ink)] whitespace-nowrap">{f.path}</span>
                        <span className="ml-auto text-[var(--ink-4)] shrink-0 pl-2 t-tabular">{f.type}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          ) : null}
        </Section>

        <Section key={`${animKey}-tl`} icon={IconClock} title="Timeline" delay={8}>
          <ul className="space-y-1 text-[12px] t-mono">
            {(request.timeline || []).map((t, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-[var(--ink-4)] w-14 t-tabular shrink-0">{t.ms}ms</span>
                <span className="text-[var(--ink)]">{t.label}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 mt-2 border-t border-[var(--line)] text-[11px] text-[var(--ink-4)] inline-flex items-center gap-1.5 t-tabular">
            <IconCalendar size={11} />
            Total processing: <span className="text-[var(--ink)] t-mono">{request.processingMs ?? 0}ms</span>
          </div>
        </Section>
      </div>
    </div>
  );
}

// Placeholder shown when no request is selected.
function AnalysisPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center text-center px-6 py-12">
      <div className="anim-rise">
        <div className="mx-auto h-12 w-12 rounded-md border border-[var(--line)] bg-[var(--surface)] flex items-center justify-center text-[var(--ink-4)] mb-3">
          <IconSparkle size={20} />
        </div>
        <p className="text-[13px] t-display font-medium text-[var(--ink)]">No request selected</p>
        <p className="text-[11.5px] text-[var(--ink-4)] mt-1.5 max-w-[18rem] leading-relaxed">
          Pick a request from the list to see the parsed analysis render in real time.
        </p>
      </div>
    </div>
  );
}

// Sub-components -------------------------------------------------------

// Flat section card (1px border, no shadows). delay = 1..8 for stagger.
function Section({ icon: Icon, title, children, delay = 1 }) {
  const delayClass = `anim-rise anim-rise-${Math.min(8, Math.max(1, delay))}`;
  return (
    <section className={`card overflow-hidden ${delayClass}`}>
      <header className="flex items-center gap-2 px-3.5 py-2 border-b border-[var(--line)] bg-[var(--surface-2)]">
        <Icon size={12} className="text-[var(--ink-3)]" />
        <h3 className="t-eyebrow">{title}</h3>
      </header>
      <div className="px-3.5 py-2.5 space-y-1 overflow-x-auto">
        {children}
      </div>
    </section>
  );
}

// KV: a label-value row.
function KV({ k, v, mono, badge, icon: Icon }) {
  if (v == null || v === '' || v === '—') {
    return (
      <div className="flex items-center gap-2 text-[12px] text-[var(--ink-5)]">
        <span className="w-[7rem] shrink-0 t-eyebrow" style={{ letterSpacing: '0.06em' }}>{k}</span>
        <span className="text-[11px]">—</span>
      </div>
    );
  }
  const display = String(v);
  const isMono = mono || display.length > 40;
  return (
    <div className="flex items-start gap-2 text-[12px] group/row">
      <span
        className="w-[7rem] shrink-0 t-eyebrow pt-0.5 text-[var(--ink-4)] group-hover/row:text-[var(--ink-3)] transition-colors"
        style={{ letterSpacing: '0.06em' }}
      >
        {k}
      </span>
      <span className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
        {Icon ? <Icon size={11} className="text-[var(--ink-4)] shrink-0" /> : null}
        {badge ? (
          <span className={`chip ${badge}`}>{display}</span>
        ) : (
          <span className={`text-[var(--ink)] break-all min-w-0 ${isMono ? 't-mono text-[11.5px]' : ''}`}>
            {display}
          </span>
        )}
      </span>
    </div>
  );
}

// CoordRow: shows lat/lon + a small "view map" pill.
function CoordRow({ ip }) {
  const lat = fmtCoord(ip.latitude);
  const lon = fmtCoord(ip.longitude);
  if (!lat && !lon) return null;
  const url = mapUrl(ip);
  return (
    <div className="flex items-start gap-2 text-[12px] pt-2 mt-1.5 border-t border-[var(--line)]">
      <span className="w-[7rem] shrink-0 t-eyebrow text-[var(--ink-4)] inline-flex items-center gap-1.5 pt-0.5" style={{ letterSpacing: '0.06em' }}>
        <IconMapPin size={10} /> Coords
      </span>
      <span className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="t-mono text-[11.5px] text-[var(--ink)] t-tabular">{lat || '—'}, {lon || '—'}</span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 pl-2 pr-1 h-6 rounded-island text-[11px] font-medium text-[var(--ink-2)] bg-[var(--surface-2)] border border-[var(--line)] hover:bg-[var(--surface-3)] transition-colors"
          >
            <span>view map</span>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--surface-3)]">
              <IconExternal size={9} />
            </span>
          </a>
        ) : null}
      </span>
    </div>
  );
}