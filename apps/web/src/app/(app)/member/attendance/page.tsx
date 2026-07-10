import type { Metadata } from 'next';
import { MemberAttendancePanel } from '@/features/attendance/components/member-attendance-panel';

export const metadata: Metadata = {
  title: 'Attendance',
};

export default function MemberAttendancePage() {
  return <MemberAttendancePanel />;
}
