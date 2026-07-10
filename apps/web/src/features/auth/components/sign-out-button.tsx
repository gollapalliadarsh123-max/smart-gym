'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@smart-gym/supabase';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        const supabase = createClient();
        await signOut(supabase);
        router.replace('/login');
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
