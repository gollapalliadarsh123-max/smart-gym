'use client';

import { CROWD_LEVELS, getCrowdLabel, type CrowdLevel } from '@smart-gym/shared';
import { cn } from '@/lib/utils';

export function CrowdMeter({
  level,
  liveCount,
  activeCount,
}: {
  level: CrowdLevel;
  liveCount: number;
  activeCount: number;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/40 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Live crowd</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{getCrowdLabel(level)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {liveCount} live · {activeCount} active members
          </p>
        </div>
        <div
          className="flex items-end gap-1.5"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={level}
          aria-label={`Crowd level ${level} of 5, ${getCrowdLabel(level)}`}
        >
          {CROWD_LEVELS.map((entry) => (
            <span
              key={entry.level}
              className={cn(
                'w-3 rounded-sm transition-colors',
                entry.level <= level ? 'bg-primary' : 'bg-muted',
              )}
              style={{ height: `${12 + entry.level * 6}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
