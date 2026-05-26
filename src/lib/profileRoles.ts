export const PROFILE_IDS = {
  SUPER_ADMIN: 1,
  ADMIN: 2,
  OPERATIONAL: 3,
} as const;

export type UserRole = 'super_admin' | 'admin' | 'operational';

export const getRoleByProfileId = (profileId?: number | null): UserRole => {
  if (Number(profileId) === PROFILE_IDS.SUPER_ADMIN) return 'super_admin';
  if (Number(profileId) === PROFILE_IDS.ADMIN) return 'admin';
  return 'operational';
};

export const canManageSystem = (role: UserRole) => role === 'super_admin' || role === 'admin';
