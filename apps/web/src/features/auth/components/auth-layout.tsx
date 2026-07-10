import type { ReactNode } from 'react';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,oklch(0.55_0.2_264_/_0.12),transparent)]"
        aria-hidden
      />
      {children}
    </div>
  );
}
