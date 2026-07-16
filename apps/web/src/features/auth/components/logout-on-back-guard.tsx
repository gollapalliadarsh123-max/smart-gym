'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@smart-gym/supabase';
import { createClient } from '@/lib/supabase/client';

const GUARD = { smartGymLogoutGuard: true } as const;

/**
 * While logged in, every browser / phone Back press asks whether to log out.
 * In-app tab switches should use history.replace so Back never hops between pages.
 * Cancel stays on the current page; OK signs out and goes to /login.
 */
export function LogoutOnBackGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const stayHref = useRef('');
  const busy = useRef(false);

  useEffect(() => {
    stayHref.current = window.location.href;
    // Replace current entry, then push a trap so the next Back is always ours.
    window.history.replaceState(GUARD, '', stayHref.current);
    window.history.pushState(GUARD, '', stayHref.current);
  }, [pathname]);

  useEffect(() => {
    const onPopState = () => {
      if (busy.current) return;
      busy.current = true;

      const restore = stayHref.current || window.location.href;
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
