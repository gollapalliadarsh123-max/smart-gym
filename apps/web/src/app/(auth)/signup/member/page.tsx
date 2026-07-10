import type { Metadata } from 'next';
import { AuthCard } from '@/features/auth/components/auth-card';
import { AuthLayout } from '@/features/auth/components/auth-layout';
import { MemberSignupForm } from '@/features/auth/components/member-signup-form';

export const metadata: Metadata = {
  title: 'Member signup',
};

export default function MemberSignupPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Member registration"
        description="Create your account, then join your gym with its code."
      >
        <MemberSignupForm />
      </AuthCard>
    </AuthLayout>
  );
}
