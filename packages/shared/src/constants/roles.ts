/** Platform-level roles enforced via Supabase RLS and app middleware */
export const USER_ROLES = ['platform_admin', 'gym_owner', 'trainer', 'member'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const STAFF_ROLES = ['gym_owner', 'trainer'] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export function isUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

export function isStaffRole(role: UserRole): role is StaffRole {
  return role === 'gym_owner' || role === 'trainer';
}

export const ROLE_LABELS: Record<UserRole, string> = {
  platform_admin: 'Platform Admin',
  gym_owner: 'Gym Owner',
  trainer: 'Trainer',
  member: 'Member',
};
