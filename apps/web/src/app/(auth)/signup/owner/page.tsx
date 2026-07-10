import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/auth-card';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { OwnerSignupForm } from '@/features/auth/components/owner-signup-form';

export const metadata: Metadata = {
  title: 'Gym owner signup',
};

export default function OwnerSignupPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Gym owner registration"
        description="Create your account and set up your gym in two steps."
      >
        <OwnerSignupForm />
      </AuthCard>
    </AuthLayout>
  );
}
