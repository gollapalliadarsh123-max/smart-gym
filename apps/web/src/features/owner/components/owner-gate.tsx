'use client';

import { useOwnerContext } from '@/features/owner/components/owner-provider';
import type { ReactNode } from 'react';

export function OwnerGate({ children }: { children: ReactNode }) {
  const { isLoading, error, gym, userId } = useOwnerContext();

  if (isLoading) {
    return <p className="message-text">Loading your gym…</p>;
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

  if (!gym) {
    return (
      <div className="dashboard-layout">
        <main className="main-content" style={{ margin: '40px auto', maxWidth: 560 }}>
          <div className="panel-card">
            <div className="card-header">
              <h3>No gym found</h3>
              <span className="tag">Setup</span>
            </div>
            <p className="message-text">
              Your account does not own a gym yet. Complete owner signup or contact support.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
