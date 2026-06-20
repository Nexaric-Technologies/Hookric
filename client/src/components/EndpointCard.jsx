import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { IconCopy, IconCheck, IconQR, IconRotate, IconLink } from './Icon.jsx';
import { copyToClipboard, generateId } from '../lib/format.js';
import { apiBase } from '../lib/apiBase.js';

const ENDPOINT_KEY = 'hookrick:v1:endpointId';

export default function EndpointCard({ endpointId, onRegenerate, connected }) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState('');

  const base = apiBase();
  const url = `${base}/r/hook-agent/${endpointId}`;
  const urlPrefix = `${base}/r/hook-agent/`;

  // Theme-aware QR colors
  useEffect(() => {
    if (!qrOpen) return;
    const root = document.documentElement;
    const dark = root.getAttribute('data-theme') === 'dark' || root.classList.contains('dark');
    const darkColor = dark ? '#F5F4F1' : '#111111';
    const lightColor = dark ? '#161614' : '#FFFFFF';
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
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="t-eyebrow">Endpoint</span>
          <span
            className={`chip ${connected ? 'chip-tint-green' : 'chip-tint-amber'}`}
            title={connected ? 'Connected to capture server' : 'Connecting…'}
          >
            <span className={`conn-dot ${connected ? 'live' : ''}`} />
            {connected ? 'Live' : 'Connecting'}
          </span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[var(--ink-4)]">
          <IconLink size={12} /> Auto-generated · no signup
        </span>
      </div>

      {/* URL row */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-1.5 px-3 h-10 rounded-md border border-[var(--line)] bg-[var(--surface-2)] font-mono text-[12.5px] overflow-hidden">
          <span className="text-[var(--ink-4)] shrink truncate min-w-0">{urlPrefix}</span>
          <span className="truncate text-[var(--ink)] min-w-0">{endpointId}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onCopy} title="Copy URL" className="btn btn-primary btn-sm sm:h-10 sm:px-3 flex-1 sm:flex-initial">
            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy URL'}</span>
          </button>
          <button
            onClick={() => setQrOpen((v) => !v)}
            title="QR code"
            aria-label="Toggle QR code"
            aria-expanded={qrOpen}
            className="btn btn-outline btn-icon shrink-0"
          >
            <IconQR size={16} />
          </button>
          <button
            onClick={onRegen}
            title="Generate new endpoint"
            aria-label="Generate new endpoint"
            className="btn btn-outline btn-icon shrink-0"
          >
            <IconRotate size={16} />
          </button>
        </div>
      </div>

      {/* QR drawer — inline expand, no overlay */}
      {qrOpen ? (
        <div className="mt-3 p-3 rounded-md border border-[var(--line)] bg-[var(--surface-2)] flex flex-col sm:flex-row items-center sm:items-start gap-4 anim-rise">
          <div className="h-32 w-32 rounded-md bg-[var(--surface)] border border-[var(--line)] flex items-center justify-center shrink-0 overflow-hidden">
            {qrData ? (
              <img src={qrData} alt="QR code for webhook endpoint" className="h-full w-full object-contain" />
            ) : (
              <div className="h-full w-full bg-[var(--surface-2)] animate-pulse-soft" />
            )}
          </div>
          <div className="text-xs text-[var(--ink-3)] leading-relaxed">
            <p className="text-[var(--ink)] font-medium mb-1 t-display" style={{ fontSize: '15px', letterSpacing: '-0.01em' }}>Scan to test</p>
            <p>
              Open the camera on a phone or any QR reader to fire a request at this endpoint. Useful for testing physical-device or POS webhooks.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}