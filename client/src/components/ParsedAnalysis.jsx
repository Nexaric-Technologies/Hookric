import React from 'react';
import {
  Globe, Server, Shield, KeyRound, Fingerprint, Clock, Layers,
  MapPin, Bot, CheckCircle2, XCircle, Calendar,
} from 'lucide-react';
import { formatBytes } from '../lib/format.js';

// Map helpers ----------------------------------------------------------

function locationLine(ip) {
  if (!ip) return null;
  const parts = [];
  if (ip.city) parts.push(ip.city);
  if (ip.region) parts.push(ip.region);
  if (ip.country) parts.push(ip.country);
  return parts.length ? parts.join(', ') : null;
}

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

export default function ParsedAnalysis({ request }) {
  if (!request) {
    return (
      <div className="p-6 text-sm text-muted-foreground text-center">
        Select a request to see parsed analysis.
      </div>
    );
  }

  const ip = request.ip || {};
  const ua = request.userAgent || {};
  const auth = request.auth || {};
  const body = request.body || {};
  const analysis = request.analysis || {};

  return (
    // Inner scroll container — owns its own padding so all content
    // (KV rows, details blocks, lists, code, maps) gets consistent
    // left/right gutter, with safe bottom padding so the last
    // section never visually collides with the panel border.
    <div className="h-full overflow-y-auto px-4 py-4 text-sm">
      <div className="space-y-4">
        {/* Network */}
        <Section icon={Globe} title="Network">
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

        {/* IP & Geo */}
        <Section icon={MapPin} title="IP & location">
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

        {/* TLS */}
        <Section icon={Server} title="TLS">
          <KV k="Secure" v={request.tls?.secure ? 'yes' : 'no'} />
          <ScrollKV k="Version" v={request.tls?.version || '—'} />
          <ScrollKV k="Cipher" v={request.tls?.cipher || '—'} />
          <KV k="Client cert" v={request.tls?.clientAuth ? 'presented' : '—'} />
        </Section>

        {/* User agent */}
        <Section icon={Fingerprint} title="User agent">
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
            <details className="pt-1.5 mt-1.5 border-t border-border/60">
              <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground select-none">
                Raw UA string
              </summary>
              <ScrollBlock className="mt-1.5 font-mono text-[11px] text-foreground/80 p-2 rounded-md border border-border bg-muted/40 whitespace-pre">
                {ua.raw}
              </ScrollBlock>
            </details>
          ) : null}
        </Section>

        {/* Authentication */}
        <Section icon={Shield} title="Authentication">
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
                    <details className="pt-1.5 mt-1.5 border-t border-border/60">
                      <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground select-none">
                        JWT claims
                      </summary>
                      <ScrollBlock as="pre" className="code mt-1.5 p-2 rounded-md border border-border bg-muted/40 max-h-40 text-[11px]">
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

        {/* Webhook signatures */}
        <Section icon={KeyRound} title="Webhook signatures">
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

        {/* Body */}
        <Section icon={Layers} title="Body analysis">
          <KV k="Kind" v={body.kind} badge={body.kind === 'json' ? 'method-post' : body.kind === 'multipart' ? 'method-patch' : null} />
          <ScrollKV k="Content-Type" v={body.contentType || '—'} />
          <KV k="Size" v={formatBytes(body.size || 0)} />
          {body.files?.length ? <KV k="Files" v={String(body.files.length)} /> : null}
          {analysis.jsonShape ? (
            <>
              <KV k="JSON type" v={analysis.jsonShape.type} />
              {analysis.jsonShape.totalKeys ? <KV k="Total keys" v={String(analysis.jsonShape.totalKeys)} /> : null}
              {analysis.jsonShape.fields?.length ? (
                <details className="pt-1.5 mt-1.5 border-t border-border/60">
                  <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground select-none">
                    JSON shape ({analysis.jsonShape.fields.length} field{analysis.jsonShape.fields.length === 1 ? '' : 's'})
                  </summary>
                  <ScrollBlock as="ul" className="mt-1.5 space-y-1 text-[11px] font-mono max-h-40 p-2 rounded-md border border-border bg-muted/40">
                    {analysis.jsonShape.fields.slice(0, 50).map((f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-foreground/90 whitespace-nowrap">{f.path}</span>
                        <span className="ml-auto text-muted-foreground shrink-0 pl-2">{f.type}</span>
                      </li>
                    ))}
                  </ScrollBlock>
                </details>
              ) : null}
            </>
          ) : null}
        </Section>

        {/* Timeline (last — keeps a comfortable gap to the panel bottom) */}
        <Section icon={Clock} title="Timeline">
          <ul className="space-y-1 text-[12px]">
            {(request.timeline || []).map((t, i) => (
              <li key={i} className="flex items-center gap-2 font-mono">
                <span className="text-muted-foreground w-12 tabular-nums shrink-0">{t.ms}ms</span>
                <span className="text-foreground/90">{t.label}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 mt-2 border-t border-border/60 text-[11px] text-muted-foreground inline-flex items-center gap-1.5 tabular-nums">
            <Calendar className="h-3 w-3" />
            Total processing: <span className="text-foreground/90 font-mono">{request.processingMs ?? 0}ms</span>
          </div>
        </Section>
      </div>
    </div>
  );
}

// Sub-components -------------------------------------------------------

// Inner sections are framed boxes that live entirely inside the
// "Parsed analysis" panel. They render as flat blocks with a thin
// top divider between them — no nested card chrome, so the panel's
// own border is the only outer container. Each section is a
// horizontal-scroll container: if a long URL, JSON path, or code
// block is wider than the card, you can scroll the card content
// sideways without breaking the page layout.
function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-md border border-border/60 bg-card/40 overflow-hidden min-w-0">
      <header className="flex items-center gap-1.5 px-3 py-2 border-b border-border/60 bg-muted/30 shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground leading-none">
          {title}
        </h3>
      </header>
      <div className="px-3 py-2.5 space-y-1 overflow-x-auto overflow-y-hidden">
        {children}
      </div>
    </section>
  );
}

function KV({ k, v, mono, badge, icon: Icon }) {
  // Hide the row entirely if there's no meaningful value to show
  // (cleaner than showing a sea of em-dashes).
  if (v == null || v === '' || v === '—') {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground/60">
        <span className="w-28 shrink-0">{k}</span>
        <span className="text-[11px]">—</span>
      </div>
    );
  }
  const display = String(v);
  const isMono = mono || display.length > 40;
  return (
    <div className="flex items-start gap-2 text-[12px]">
      <span className="w-28 shrink-0 text-muted-foreground pt-0.5">{k}</span>
      <span className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
        {Icon ? <Icon className="h-3 w-3 text-muted-foreground shrink-0" /> : null}
        {badge ? (
          <span className={`chip border-[hsl(var(--${badge})/0.4)] text-[hsl(var(--${badge}))] bg-[hsl(var(--${badge})/0.10)]`}>
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

function CoordRow({ ip }) {
  const lat = fmtCoord(ip.latitude);
  const lon = fmtCoord(ip.longitude);
  if (!lat && !lon) return null;
  const url = mapUrl(ip);
  return (
    <div className="flex items-start gap-2 text-[12px] pt-1.5 mt-1.5 border-t border-border/60">
      <span className="w-28 shrink-0 text-muted-foreground inline-flex items-center gap-1.5 pt-0.5">
        <MapPin className="h-3 w-3" /> Coords
      </span>
      <span className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[11.5px] text-foreground tabular-nums">{lat || '—'}, {lon || '—'}</span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            className="chip border-[hsl(var(--primary)/0.4)] text-primary bg-[hsl(var(--primary)/0.10)] hover:bg-[hsl(var(--primary)/0.18)] transition-colors"
          >
            view map ↗
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

// ScrollKV: a KV row whose value is rendered in a horizontally
// scrollable mini-region. The label stays put; the value sits in
// a fixed-height scroll box that can pan sideways for long URLs,
// ASN strings, UAs, header values, etc. Falls through to the
// muted-dash placeholder if there's no value.
function ScrollKV({ k, v }) {
  if (v == null || v === '' || v === '—') {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground/60">
        <span className="w-28 shrink-0">{k}</span>
        <span className="text-[11px]">—</span>
      </div>
    );
  }
  const display = String(v);
  return (
    <div className="flex items-start gap-2 text-[12px]">
      <span className="w-28 shrink-0 text-muted-foreground pt-1.5">{k}</span>
      <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden max-h-7 rounded-sm border border-transparent hover:border-border/60 transition-colors">
        <div className="font-mono text-[11.5px] text-foreground whitespace-nowrap px-1.5 py-1">
          {display}
        </div>
      </div>
    </div>
  );
}

// ScrollBlock: a horizontally scrollable container for wide
// content (raw UA, JSON shape, JWT claims). The element is the
// scroll surface itself; we use the browser's intrinsic sizing
// (no inner wrapper) so HTML validity is preserved for <pre> /
// <ul>. Long content overflows horizontally rather than wrapping.
function ScrollBlock({ as: Tag = 'div', className = '', children, ...rest }) {
  // For <pre> the content is text — whitespace is preserved by
  // default and the pre grows to its content's intrinsic width.
  // For <ul> we need to prevent the <li>s from wrapping so the
  // list grows as wide as its widest item.
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
