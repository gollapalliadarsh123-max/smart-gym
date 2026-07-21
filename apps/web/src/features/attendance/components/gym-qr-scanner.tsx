'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { extractQrToken } from '@smart-gym/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'processing' | 'error';

export function GymQrScanner({
  onToken,
  disabled,
  className,
}: {
  onToken: (token: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const regionId = useRef(`gym-qr-scanner-${Math.random().toString(36).slice(2)}`).current;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const lastAtRef = useRef(0);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [cameraOn, setCameraOn] = useState(false);

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) {
      setCameraOn(false);
      setStatus('idle');
      return;
    }
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      // ignore stop races
    }
    setCameraOn(false);
    setStatus('idle');
  }, []);

  const handleDecoded = useCallback(
    async (raw: string) => {
      const token = extractQrToken(raw);
      if (!token) {
        setError('That QR is not a Smart Gym check-in code.');
        return;
      }
      const now = Date.now();
      if (lastTokenRef.current === token && now - lastAtRef.current < 4000) {
        return;
      }
      lastTokenRef.current = token;
      lastAtRef.current = now;
      setStatus('processing');
      setError(null);
      try {
        await onToken(token);
      } finally {
        setStatus('scanning');
      }
    },
    [onToken],
  );

  const startCamera = useCallback(async () => {
    if (disabled) return;
    setError(null);
    setStatus('starting');
    await stopCamera();

    try {
      const scanner = new Html5Qrcode(regionId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 8, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
        (decoded) => {
          void handleDecoded(decoded);
        },
        () => {
          // ignore frame-level no-match
        },
      );
      setCameraOn(true);
      setStatus('scanning');
    } catch (err) {
      setCameraOn(false);
      setStatus('error');
      setError(
        err instanceof Error
          ? err.message
          : 'Could not open the camera. You can paste the check-in link instead.',
      );
    }
  }, [disabled, handleDecoded, regionId, stopCamera]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const token = extractQrToken(manual);
    if (!token) {
      setError('Enter a valid check-in link or 64-character token.');
      return;
    }
    setError(null);
    setStatus('processing');
    try {
      await onToken(token);
      setManual('');
    } finally {
      setStatus(cameraOn ? 'scanning' : 'idle');
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="overflow-hidden rounded-2xl border border-border bg-black/90">
        <div id={regionId} className="min-h-[240px] w-full" />
        {!cameraOn ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 px-4 py-10 text-center text-sm text-white/80">
            <p>Point your camera at the gym’s check-in QR.</p>
            <Button type="button" disabled={disabled} onClick={() => void startCamera()}>
              Open camera
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {cameraOn ? (
          <Button type="button" variant="outline" onClick={() => void stopCamera()}>
            Stop camera
          </Button>
        ) : (
          <Button type="button" disabled={disabled} onClick={() => void startCamera()}>
            Scan Gym QR
          </Button>
        )}
        {status === 'processing' || status === 'starting' ? (
          <span className="inline-flex items-center text-sm text-muted-foreground">
            {status === 'starting' ? 'Starting camera…' : 'Checking in…'}
          </span>
        ) : null}
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => void submitManual(e)}>
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Paste check-in link or token"
          disabled={disabled || status === 'processing'}
          className="flex-1"
        />
        <Button type="submit" variant="outline" disabled={disabled || status === 'processing'}>
          Use link
        </Button>
      </form>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
