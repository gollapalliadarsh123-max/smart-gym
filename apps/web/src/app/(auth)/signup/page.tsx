import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthCard } from '@/features/auth/components/auth-card';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Sign up',
};

export default function SignupPage() {
  return (
    <AuthLayout>
      <AuthCard title="Create account" description="Choose how you want to use Smart Gym.">
        <div className="flex flex-col gap-3">
          <Link href="/signup/owner">
            <Button className="w-full" variant="default">
              I own or manage a gym
            </Button>
          </Link>
          <Link href="/signup/member">
            <Button className="w-full" variant="outline">
              I am a gym member
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
