/** Shared auth user response shape for sign-in and auth flows */
export interface AuthUserResponse {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  onboardingComplete: boolean;
  isProfileComplete: boolean;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  contributionScore: number;
  tasksCompleted: number;
  daysWorked: number;
  team: string | null;
  reportingTo: string | null;
  refreshToken?: string;
}

type UserInput = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  profileImageUrl?: string | null;
  fullName?: string | null;
  role: string;
  isActive: boolean;
  onboardingCompleted: boolean;
  reputationScore?: number | null;
  tasksCompletedCount?: number | null;
  daysWorkedCount?: number | null;
  team?: { name: string } | null;
  reportingManager?: { name: string } | null;
};

export function toAuthUserResponse(
  user: UserInput,
  options?: { refreshToken?: string }
): AuthUserResponse {
  const name = user.fullName ?? user.name ?? '';
  const avatarUrl = user.avatarUrl ?? user.profileImageUrl ?? null;
  const isProfileComplete = !!(
    user.name &&
    user.name.length > 1 &&
    !user.name.startsWith('User ') &&
    !user.name.startsWith('Wallet ')
  );

  const result: AuthUserResponse = {
    id: user.id,
    name,
    email: user.email ?? null,
    avatarUrl,
    onboardingComplete: user.onboardingCompleted,
    isProfileComplete,
    role: user.role,
    status: user.isActive ? 'ACTIVE' : 'INACTIVE',
    contributionScore: user.reputationScore ?? 0,
    tasksCompleted: user.tasksCompletedCount ?? 0,
    daysWorked: user.daysWorkedCount ?? 0,
    team: user.team?.name ?? null,
    reportingTo: user.reportingManager?.name ?? null,
  };

  if (options?.refreshToken) {
    result.refreshToken = options.refreshToken;
  }

  return result;
}
