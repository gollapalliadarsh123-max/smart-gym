'use client';

import { CROWD_LEVELS, getCrowdLabel, type CrowdLevel } from '@smart-gym/shared';
import { cn } from '@/lib/utils';

const SEGMENT_COLORS = [
  'bg-emerald-600',
  'bg-lime-600',
  'bg-amber-500',
  'bg-orange-500',
  'bg-red-600',
];

export function CrowdMeter({
  level,
  liveCount,
  activeCount,
  compact = false,
}: {
  level: CrowdLevel;
  liveCount: number;
  activeCount: number;
  compact?: boolean;
}) {
  return (
    <div className={cn(!compact && 'rounded-xl border border-border bg-card p-4 sm:p-5')}>
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Live crowd level</p>
          <div
            className="mt-3 flex gap-1.5"
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
                  'h-2.5 flex-1 rounded-full',
                  entry.level <= level
                    ? SEGMENT_COLORS[entry.level - 1]
                    : 'bg-muted',
                )}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Level</p>
            <p className="font-semibold">{level} / 5</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-semibold">{getCrowdLabel(level)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {liveCount} live · {activeCount} active members
        </p>
      </div>
    </div>
  );
}
