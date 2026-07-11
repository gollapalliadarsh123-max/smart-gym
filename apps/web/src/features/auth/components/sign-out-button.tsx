'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@smart-gym/supabase';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(className)}
      onClick={async () => {
        const supabase = createClient();
        await signOut(supabase);
        router.replace('/login');
        router.refresh();
      }}
    >
      Logout
    </Button>
  );
}
