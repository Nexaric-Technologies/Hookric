import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode, RotateCcw, Link2 } from 'lucide-react';
import { copyToClipboard, generateId } from '../lib/format.js';

const ENDPOINT_KEY = 'hookrick:v1:endpointId';

export default function EndpointCard({ endpointId, onRegenerate, connected }) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState('');

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/r/${endpointId}`;

  // Theme-aware QR colors
  useEffect(() => {
    if (!qrOpen) return;
    const root = document.documentElement;
    const dark = root.getAttribute('data-theme') === 'dark' || root.classList.contains('dark');
    const darkColor = dark ? '#f8fafc' : '#0f172a';
    const lightColor = dark ? '#0b1120' : '#ffffff';
    let cancelled = false;
    (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(url, {
          color: { dark: darkColor, light: lightColor },
          width: 220,
          margin: 1,
        });
        if (!cancelled) setQrData(dataUrl);
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
  }, [qrOpen, url]);

  const onCopy = async () => {
    await copyToClipboard(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const onRegen = () => {
    const next = generateId(8);
    try { localStorage.setItem(ENDPOINT_KEY, next); } catch { /* noop */ }
    onRegenerate?.(next);
  };

  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">Your endpoint</span>
        <span
          className={`chip ${
            connected
              ? 'border-[hsl(var(--method-get)/0.4)] text-[hsl(var(--method-get))] bg-[hsl(var(--method-get)/0.10)]'
              : 'border-[hsl(var(--method-put)/0.4)] text-[hsl(var(--method-put))] bg-[hsl(var(--method-put)/0.10)]'
          }`}
          title={connected ? 'Connected to capture server' : 'Connecting…'}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-[hsl(var(--method-get))] animate-pulse-soft' : 'bg-[hsl(var(--method-put))] animate-pulse-soft'}`} />
          {connected ? 'Live' : 'Connecting'}
        </span>
        <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <Link2 className="h-3 w-3" /> Auto-generated · no signup
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <div className="flex-1 flex items-center gap-1.5 px-3 h-10 rounded-md border border-input bg-muted/40 font-mono text-[13px] overflow-hidden min-w-0">
          <span className="text-muted-foreground shrink-0 truncate">{origin}/r/</span>
          <span className="truncate text-foreground">{endpointId}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onCopy}
            title="Copy URL"
            className="btn-primary btn-sm sm:h-9 sm:px-3 flex-1 sm:flex-initial"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="hidden xs:inline sm:inline">{copied ? 'Copied' : 'Copy URL'}</span>
          </button>
          <button
            onClick={() => setQrOpen((v) => !v)}
            title="QR code"
            aria-label="Toggle QR code"
            className="btn-outline btn-icon"
          >
            <QrCode className="h-4 w-4" />
          </button>
          <button
            onClick={onRegen}
            title="Generate new endpoint"
            aria-label="Generate new endpoint"
            className="btn-outline btn-icon"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {qrOpen ? (
        <div className="mt-3 p-3 rounded-md border border-border bg-muted/40 flex flex-col sm:flex-row items-center sm:items-start gap-4 animate-fade-in">
          <div className="h-32 w-32 rounded-md bg-background border border-border flex items-center justify-center shrink-0 overflow-hidden">
            {qrData ? (
              <img src={qrData} alt="QR code" className="h-full w-full object-contain" />
            ) : (
              <div className="h-full w-full bg-muted animate-pulse" />
            )}
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            <p className="text-foreground font-medium mb-1">Scan to test</p>
            <p>
              Open the camera on a phone or any QR reader to fire a request at this
              endpoint. Useful for testing physical-device or POS webhooks.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
