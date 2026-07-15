'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@smart-gym/supabase';
import { createClient } from '@/lib/supabase/client';

const GUARD = { smartGymLogoutGuard: true } as const;

/**
 * While logged in, every browser Back press asks whether to log out.
 * Cancel keeps you on the current page; OK signs out and goes to /login.
 */
export function LogoutOnBackGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const stayHref = useRef('');
  const busy = useRef(false);

  // Track the page the user is on so Cancel can restore it after Back.
  useEffect(() => {
    stayHref.current = window.location.href;
    window.history.pushState(GUARD, '', stayHref.current);
  }, [pathname]);

  useEffect(() => {
    const onPopState = () => {
      if (busy.current) return;
      busy.current = true;

      const restore = stayHref.current || window.location.href;
      // Re-lock immediately so Back never leaves the app silently.
      window.history.pushState(GUARD, '', restore);

      let path = pathname;
      try {
        const url = new URL(restore);
        path = url.pathname + url.search;
      } catch {
        /* keep pathname */
      }

      if (window.location.pathname + window.location.search !== path) {
        router.replace(path);
      }

      const shouldLogout = window.confirm(
        'Do you want to log out?\n\nOK = Log out\nCancel = Stay signed in',
      );

      if (shouldLogout) {
        void (async () => {
          try {
            const supabase = createClient();
            await signOut(supabase);
          } finally {
            router.replace('/login');
            router.refresh();
            busy.current = false;
          }
        })();
        return;
      }

      busy.current = false;
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [pathname, router]);

  return null;
}
