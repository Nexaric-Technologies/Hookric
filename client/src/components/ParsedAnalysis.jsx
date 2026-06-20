import React from 'react';
import { Globe, Server, Shield, KeyRound, Fingerprint, Clock, ListTree, Layers } from 'lucide-react';
import { formatBytes } from '../lib/format.js';

export default function ParsedAnalysis({ request }) {
  if (!request) {
    return (
      <div className="p-6 text-sm text-muted-foreground text-center">
        Select a request to see parsed analysis.
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-3 text-sm">
      <Section icon={Globe} title="Network">
        <KV k="Method" v={request.method} />
        <KV k="URL" v={request.url} mono />
        <KV k="Path" v={request.path} mono />
        <KV k="Host" v={request.host} mono />
        <KV k="Protocol" v={`${(request.protocol || '').toUpperCase()} ${request.httpVersion || ''}`} />
        <KV k="Source IP" v={request.ip?.remote} mono />
        <KV k="X-Forwarded-For" v={request.ip?.xForwardedFor} mono />
        <KV k="Country" v={request.ip?.country} />
        <KV k="Region" v={request.ip?.region} />
        <KV k="City" v={request.ip?.city} />
        <KV k="ASN" v={request.ip?.asn} mono />
        <KV k="Secure" v={request.secure ? 'yes' : 'no'} />
      </Section>

      <Section icon={Server} title="TLS">
        <KV k="Secure" v={request.tls?.secure ? 'yes' : 'no'} />
        <KV k="Version" v={request.tls?.version || '—'} mono />
        <KV k="Cipher" v={request.tls?.cipher || '—'} mono />
      </Section>

      <Section icon={Fingerprint} title="User agent">
        <KV k="Browser" v={request.userAgent?.browser ? `${request.userAgent.browser} ${request.userAgent.browserVersion || ''}` : '—'} />
        <KV k="OS" v={request.userAgent?.os ? `${request.userAgent.os} ${request.userAgent.osVersion || ''}` : '—'} />
        <KV k="Device" v={request.userAgent?.device || request.userAgent?.deviceType || '—'} />
        <KV k="Detected" v={request.userAgent?.detected || '—'} />
        <KV k="Bot" v={request.userAgent?.bot ? 'likely' : 'no'} />
        <details className="mt-1">
          <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">Raw UA string</summary>
          <div className="text-[11px] text-foreground/80 font-mono break-all mt-1">{request.userAgent?.raw || '—'}</div>
        </details>
      </Section>

      <Section icon={Shield} title="Authentication">
        {request.auth?.basic ? (
          <>
            <KV k="Type" v="Basic" />
            <KV k="User" v={request.auth.basic.user} mono />
          </>
        ) : null}
        {request.auth?.bearer ? (
          <>
            <KV k="Type" v="Bearer" />
            <KV k="Token length" v={request.auth.bearer.length} mono />
            <KV k="JWT" v={request.auth.bearer.claims ? 'yes' : 'no'} />
            {request.auth.bearer.expires ? <KV k="JWT expires" v={request.auth.bearer.expires} /> : null}
            {request.auth.bearer.claims ? (
              <details className="mt-1">
                <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">JWT claims</summary>
                <pre className="code mt-1 p-2 rounded-md border border-border bg-muted/40 max-h-40 overflow-auto">{JSON.stringify(request.auth.bearer.claims, null, 2)}</pre>
              </details>
            ) : null}
          </>
        ) : null}
        {request.auth?.apiKey ? (
          <>
            <KV k="API key" v="present (header: x-api-key)" />
            <KV k="Length" v={String(request.auth.apiKey).length} />
          </>
        ) : null}
        {!request.auth?.basic && !request.auth?.bearer && !request.auth?.apiKey ? (
          <div className="text-[12px] text-muted-foreground">No credentials detected.</div>
        ) : null}
      </Section>

      <Section icon={KeyRound} title="Webhook signatures">
        {request.signatures?.length ? (
          <ul className="space-y-1.5">
            {request.signatures.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px]">
                <span className="chip border-[hsl(var(--method-get)/0.4)] text-[hsl(var(--method-get))] bg-[hsl(var(--method-get)/0.10)]">
                  {s.provider}
                </span>
                <span className="text-muted-foreground">signature present</span>
              </li>
            ))}
          </ul>
        ) : request.analysis?.isWebhook ? (
          <div className="text-[12px] text-[hsl(var(--method-put))]">Looks like a webhook (vendor headers detected) but no signature header.</div>
        ) : (
          <div className="text-[12px] text-muted-foreground">No signature headers detected.</div>
        )}
      </Section>

      <Section icon={Layers} title="Body analysis">
        <KV k="Kind" v={request.body?.kind || '—'} />
        <KV k="Content-Type" v={request.body?.contentType || '—'} mono />
        <KV k="Size" v={formatBytes(request.body?.size || 0)} />
        {request.body?.files?.length ? <KV k="Files" v={String(request.body.files.length)} /> : null}
        {request.analysis?.jsonShape ? (
          <>
            <KV k="JSON type" v={request.analysis.jsonShape.type} />
            {request.analysis.jsonShape.totalKeys ? <KV k="Total keys" v={String(request.analysis.jsonShape.totalKeys)} /> : null}
          </>
        ) : null}
      </Section>

      <Section icon={Clock} title="Timeline">
        <ul className="space-y-1.5 text-[12px]">
          {(request.timeline || []).map((t, i) => (
            <li key={i} className="flex items-center gap-2 font-mono">
              <span className="text-muted-foreground w-12 tabular-nums">{t.ms}ms</span>
              <span className="text-foreground/90">{t.label}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-[11px] text-muted-foreground tabular-nums">Total processing: {request.processingMs ?? 0}ms</div>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function KV({ k, v, mono }) {
  return (
    <div className="flex items-start gap-3 text-[12px]">
      <span className="text-muted-foreground w-28 shrink-0">{k}</span>
      <span className={`text-foreground break-all min-w-0 flex-1 ${mono ? 'font-mono' : ''}`}>{v ?? '—'}</span>
    </div>
  );
}
