import Link from 'next/link';
import { APP_NAME } from '@smart-gym/shared';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-muted-foreground">
          © {year} {APP_NAME}. All rights reserved.
        </p>
        <nav className="flex flex-wrap gap-4 text-sm" aria-label="Footer navigation">
          <Link href="/login" className="text-muted-foreground transition-colors hover:text-foreground">
            Log in
          </Link>
          <Link href="/signup" className="text-muted-foreground transition-colors hover:text-foreground">
            Sign up
          </Link>
        </nav>
      </div>
    </footer>
  );
}
