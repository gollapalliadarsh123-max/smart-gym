import type { Metadata } from 'next';
import { OwnerSettingsForm } from '@/features/owner/components/owner-settings-form';

export const metadata: Metadata = {
  title: 'Gym settings',
};

export default function OwnerSettingsPage() {
  return <OwnerSettingsForm />;
}
