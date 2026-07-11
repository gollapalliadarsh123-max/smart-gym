'use client';

import { CROWD_LEVELS, getCrowdLabel, type CrowdLevel } from '@smart-gym/shared';
import { cn } from '@/lib/utils';

const SEGMENT_COLORS = [
  'bg-emerald-500',
  'bg-lime-500',
  'bg-amber-400',
  'bg-orange-500',
  'bg-red-500',
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
    <div className={cn(!compact && 'sg-panel')}>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Live crowd level
          </p>
          <div
            className="mt-3 flex gap-2"
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
                  'h-3.5 flex-1 rounded-full transition-all',
                  entry.level <= level
                    ? SEGMENT_COLORS[entry.level - 1]
                    : 'bg-slate-200 dark:bg-slate-700',
                )}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Level</p>
            <p className="font-bold">{level} / 5</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Status</p>
            <p className="font-bold">{getCrowdLabel(level)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {liveCount} live · {activeCount} active members
        </p>
      </div>
    </div>
  );
}
