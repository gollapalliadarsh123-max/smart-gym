'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type GymSwitcherOption = {
  id: string;
  name: string;
  code?: string | null;
};

export function GymSwitcher({
  gyms,
  selectedId,
  onSelect,
  className,
}: {
  gyms: GymSwitcherOption[];
  selectedId: string | null | undefined;
  onSelect: (gymId: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = gyms.find((g) => g.id === selectedId) ?? gyms[0];

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!selected) return null;
  if (gyms.length <= 1) {
    return (
      <div className={cn('min-w-0', className)}>
        <p className="truncate text-sm font-semibold tracking-tight text-foreground">
          {selected.name}
        </p>
        {selected.code ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">Code {selected.code}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        className="flex w-full min-w-0 items-center gap-1 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
            {selected.name}
          </span>
          {selected.code ? (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              Code {selected.code}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
        >
          {gyms.map((gym) => {
            const active = gym.id === selected.id;
            return (
              <li key={gym.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm',
                    active
                      ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                      : 'hover:bg-muted',
                  )}
                  onClick={() => {
                    onSelect(gym.id);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{gym.name}</span>
                  {gym.code ? (
                    <span className="text-xs text-muted-foreground">Code {gym.code}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
