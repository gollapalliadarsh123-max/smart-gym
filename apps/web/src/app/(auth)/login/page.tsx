import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthCard } from '@/features/auth/components/auth-card';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthCard title="Sign in" description="Access your Smart Gym account.">
        <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  );
}
