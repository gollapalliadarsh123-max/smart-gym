import {
  Activity,
  BarChart3,
  Bell,
  MessageCircle,
  Trophy,
  Users,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface LandingFeature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const LANDING_FEATURES: LandingFeature[] = [
  {
    title: 'Member Management',
    description: 'Approve join requests, manage plans, and track payment status in one place.',
    icon: Users,
  },
  {
    title: 'Attendance',
    description: 'Daily check-in codes, QR self check-in, live crowd meter, and history.',
    icon: Activity,
  },
  {
    title: 'Diet Dashboard',
    description: 'Log meals and water, score nutrition, and follow trends over time.',
    icon: UtensilsCrossed,
  },
  {
    title: 'Payments',
    description: 'Track member payments with search, filters, and automatic records on approval.',
    icon: Wallet,
  },
  {
    title: 'Global Leaderboard',
    description: 'Quarterly seasons with tiers, rankings across gyms, and friend requests.',
    icon: Trophy,
  },
  {
    title: 'Friends & Chat',
    description: 'Private messaging, friend requests, and realtime unread indicators.',
    icon: MessageCircle,
  },
  {
    title: 'Notifications',
    description: 'Gym owners broadcast updates that members receive instantly.',
    icon: Bell,
  },
  {
    title: 'Analytics',
    description: 'Weekly, monthly, and yearly attendance and revenue charts for owners.',
    icon: BarChart3,
  },
];

export const LANDING_TERMS = [
  'Use valid account details; fake or spam accounts may be restricted.',
  'Each user is responsible for their own login credentials and data.',
  'Gym owners are responsible for membership approvals and payment entries.',
  'Chat and friend features must be used respectfully and lawfully.',
  'Leaderboard points depend on attendance and diet activity in the app.',
  'Service features may improve over time with performance and UX updates.',
];

export const LANDING_STATS = [
  { label: 'Roles supported', value: '4' },
  { label: 'Platforms', value: 'Web + Mobile' },
  { label: 'Realtime', value: 'Built-in' },
];
