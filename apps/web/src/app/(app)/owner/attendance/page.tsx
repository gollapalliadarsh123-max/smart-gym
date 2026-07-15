import type { Metadata } from 'next';
import { OwnerAttendancePanel } from '@/features/attendance/components/owner-attendance-panel';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'Attendance' };

export default function Page() {
  return (
    <PageContainer>
      <OwnerAttendancePanel />
    </PageContainer>
  );
}
