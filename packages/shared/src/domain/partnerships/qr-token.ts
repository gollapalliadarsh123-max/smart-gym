/** Pure helpers for secure gym check-in QR tokens (no gym/user IDs in payload). */

export function buildGymCheckInPath(token: string): string {
  return `/checkin/${token}`;
}

export function buildGymCheckInUrl(token: string, origin?: string): string {
  const path = buildGymCheckInPath(token);
  if (!origin) return path;
  return `${origin.replace(/\/$/, '')}${path}`;
}

/** Extract a 64-char hex token from a scanned URL or raw token. */
export function extractQrToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return trimmed.toLowerCase();

  try {
    const url = new URL(trimmed, 'https://smartgym.local');
    const parts = url.pathname.split('/').filter(Boolean);
    const checkinIdx = parts.findIndex((p) => p.toLowerCase() === 'checkin');
    if (checkinIdx >= 0 && parts[checkinIdx + 1]) {
      const token = parts[checkinIdx + 1]!;
      if (/^[a-f0-9]{64}$/i.test(token)) return token.toLowerCase();
    }
  } catch {
    // fall through
  }

  const match = trimmed.match(/\/checkin\/([a-f0-9]{64})/i);
  if (match?.[1]) return match[1].toLowerCase();

  return null;
}
