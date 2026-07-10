import type { Metadata } from 'next';
import { OwnerAttendancePanel } from '@/features/attendance/components/owner-attendance-panel';

export const metadata: Metadata = {
  title: 'Attendance',
};

export default function OwnerAttendancePage() {
  return <OwnerAttendancePanel />;
}
