'use client';

import { useMemberContext } from '@/features/member/components/member-provider';
import type { ReactNode } from 'react';

export function MemberGate({ children }: { children: ReactNode }) {
  const { isLoading, error, userId, membership } = useMemberContext();

  if (isLoading) {
    return <p className="message-text">Loading your membership…</p>;
  }

  if (error) {
    return (
      <p className="message-text" role="alert" style={{ color: 'var(--danger)' }}>
        {error.message}
      </p>
    );
  }

  if (!userId) {
    return <p className="message-text">Sign in required.</p>;
  }

  if (!membership) {
    return (
      <div className="dashboard-layout">
        <main className="main-content" style={{ margin: '40px auto', maxWidth: 560 }}>
          <div className="panel-card">
            <div className="card-header">
              <h3>No active membership</h3>
              <span className="tag">Join required</span>
            </div>
            <p className="message-text">
              Join a gym with its code, then wait for the owner to approve you before using the
              dashboard.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
