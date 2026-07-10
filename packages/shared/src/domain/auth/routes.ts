import type { UserRole } from '../../constants/roles';

/** App paths keyed by authenticated role */
export const DASHBOARD_PATHS: Record<UserRole, string> = {
  platform_admin: '/admin',
  gym_owner: '/owner',
  trainer: '/trainer',
  member: '/member',
};

export const AUTH_PATHS = {
  login: '/login',
  signup: '/signup',
  signupOwner: '/signup/owner',
  signupMember: '/signup/member',
} as const;

export const PROTECTED_PREFIXES = ['/admin', '/owner', '/trainer', '/member'] as const;

export function getDashboardPath(role: UserRole | null | undefined): string {
  if (!role) return AUTH_PATHS.login;
  return DASHBOARD_PATHS[role] ?? AUTH_PATHS.login;
}

export function isAuthPath(pathname: string): boolean {
  return (
    pathname === AUTH_PATHS.login ||
    pathname === AUTH_PATHS.signup ||
    pathname.startsWith(`${AUTH_PATHS.signup}/`)
  );
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function roleForPath(pathname: string): UserRole | null {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'platform_admin';
  if (pathname === '/owner' || pathname.startsWith('/owner/')) return 'gym_owner';
  if (pathname === '/trainer' || pathname.startsWith('/trainer/')) return 'trainer';
  if (pathname === '/member' || pathname.startsWith('/member/')) return 'member';
  return null;
}
