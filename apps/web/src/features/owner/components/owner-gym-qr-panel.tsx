'use client';

import { useMemo, useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import {
  buildGymCheckInUrl,
  useActiveGymQr,
  useGymQrHistory,
  useRegenerateGymQr,
} from '@smart-gym/supabase';
import { Download, Maximize2, Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import { useOwnerContext } from '@/features/owner/components/owner-provider';
import { SectionCard } from '@/components/layout/section-card';
import { Button } from '@/components/ui/button';
import { StatusBadge, statusToneFromLabel } from '@/components/layout/status-badge';
import { cn } from '@/lib/utils';

function formatGenerated(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function OwnerGymQrPanel() {
  const { client, gym } = useOwnerContext();
  const gymId = gym?.id;
  const qrQuery = useActiveGymQr(client, gymId);
  const historyQuery = useGymQrHistory(client, gymId);
  const regenerate = useRegenerateGymQr(client);
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const checkInUrl = useMemo(() => {
    if (!qrQuery.data?.token) return '';
    return buildGymCheckInUrl(qrQuery.data.token, origin || undefined);
  }, [origin, qrQuery.data?.token]);

  async function handleRegenerate() {
    if (!gymId) return;
    setMessage(null);
    setError(null);
    try {
      await regenerate.mutateAsync({
        gymId,
        reason: 'Rotated by owner from Gym QR page',
      });
      setConfirmOpen(false);
      setMessage('New QR generated. The previous QR is now invalid.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not regenerate QR.');
    }
  }

  function downloadPng() {
    const canvas = canvasHostRef.current?.querySelector('canvas');
    if (!canvas || !gym) return;
    const link = document.createElement('a');
    link.download = `${gym.code || 'gym'}-checkin-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function printQr() {
    if (!checkInUrl || !gym) return;
    const win = window.open('', '_blank', 'noopener,noreferrer,width=480,height=640');
    if (!win) return;
    win.document.write(`<!doctype html><html><head><title>${gym.name} Check-in QR</title>
      <style>
        body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;gap:16px}
        h1{font-size:20px;margin:0} p{color:#555;font-size:12px;word-break:break-all;max-width:360px;text-align:center}
      </style></head><body>
      <h1>${gym.name}</h1>
      <div id="qr"></div>
      <p>${checkInUrl}</p>
      <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"><\/script>
      <script>
        QRCode.toCanvas(document.createElement('canvas'), ${JSON.stringify(checkInUrl)}, {width:280,margin:2}, function(err, canvas){
          if(!err) document.getElementById('qr').appendChild(canvas);
          setTimeout(function(){ window.print(); }, 300);
        });
      <\/script>
      </body></html>`);
    win.document.close();
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Gym QR Code"
        description="Members scan this code to check in. It never contains gym or member IDs — only a secure token."
      >
        {qrQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading QR…</p>
        ) : !qrQuery.data ? (
          <p className="text-sm text-destructive">Could not load gym QR.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl border border-border bg-white p-4 dark:bg-card">
                <QRCodeSVG value={checkInUrl} size={220} level="M" includeMargin />
              </div>
              {/* Off-screen canvas for PNG download */}
              <div ref={canvasHostRef} className="pointer-events-none absolute -left-[9999px] opacity-0">
                <QRCodeCanvas value={checkInUrl} size={512} level="M" includeMargin />
              </div>
              <StatusBadge tone={statusToneFromLabel(qrQuery.data.status)}>
                {qrQuery.data.status === 'active' ? 'Active' : qrQuery.data.status}
              </StatusBadge>
            </div>

            <div className="space-y-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Last generated</dt>
                  <dd className="font-medium">{formatGenerated(qrQuery.data.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">QR status</dt>
                  <dd className="font-medium capitalize">{qrQuery.data.status}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Check-in URL</dt>
                  <dd className="break-all font-mono text-xs">{checkInUrl}</dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setFullscreen(true)}>
                  <Maximize2 className="size-4" />
                  Full screen
                </Button>
                <Button type="button" variant="outline" onClick={downloadPng}>
                  <Download className="size-4" />
                  Download PNG
                </Button>
                <Button type="button" variant="outline" onClick={printQr}>
                  <Printer className="size-4" />
                  Print QR
                </Button>
                <Button type="button" onClick={() => setConfirmOpen(true)}>
                  <RefreshCw className="size-4" />
                  Regenerate QR Code
                </Button>
              </div>

              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                Regenerating immediately invalidates the previous QR. Keep the printed copy updated.
              </p>

              {message ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{message}</p>
              ) : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="QR history" description="Previous codes are kept for audit and stay revoked.">
        {(historyQuery.data ?? []).length <= 1 ? (
          <p className="text-sm text-muted-foreground">No previous QR rotations yet.</p>
        ) : (
          <ul className="space-y-2">
            {(historyQuery.data ?? []).map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-1 rounded-xl border border-border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  {formatGenerated(row.created_at)}
                  {row.revoked_at ? ` · revoked ${formatGenerated(row.revoked_at)}` : ''}
                </span>
                <StatusBadge tone={statusToneFromLabel(row.status)}>{row.status}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close"
            onClick={() => setConfirmOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Regenerate gym QR?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              The current QR becomes invalid immediately. Members and printed posters must use the
              new code. The old token is kept in history for audit only.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={regenerate.isPending}
                onClick={() => void handleRegenerate()}
              >
                {regenerate.isPending ? 'Regenerating…' : 'Regenerate now'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {fullscreen && checkInUrl ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-6">
          <p className="text-lg font-semibold">{gym?.name}</p>
          <div className="rounded-3xl border border-border bg-white p-6 dark:bg-card">
            <QRCodeSVG value={checkInUrl} size={320} level="M" includeMargin />
          </div>
          <Button type="button" variant="outline" onClick={() => setFullscreen(false)}>
            Close
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Compact QR block for the attendance page sidebar. */
export function OwnerAttendanceQrCard({ className }: { className?: string }) {
  const { client, gym } = useOwnerContext();
  const qrQuery = useActiveGymQr(client, gym?.id);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url =
    qrQuery.data?.token && origin
      ? buildGymCheckInUrl(qrQuery.data.token, origin)
      : qrQuery.data?.token
        ? buildGymCheckInUrl(qrQuery.data.token)
        : '';

  if (!url) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>Loading secure QR…</div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="inline-flex rounded-2xl border border-border bg-white p-3 dark:bg-card">
        <QRCodeSVG value={url} size={160} level="M" includeMargin />
      </div>
      <p className="break-all font-mono text-[11px] text-muted-foreground">{url}</p>
    </div>
  );
}
