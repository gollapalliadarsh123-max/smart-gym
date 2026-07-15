import type { Metadata } from 'next';
import { MemberAttendancePanel } from '@/features/attendance/components/member-attendance-panel';
import { PageContainer } from '@/components/layout/page-container';

export const metadata: Metadata = { title: 'Attendance' };

export default function Page() {
  return (
    <PageContainer>
      <MemberAttendancePanel />
    </PageContainer>
  );
}
