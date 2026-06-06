export interface AuthTokensResponse {
  accessToken: string;
  refreshToken?: string;
  needsOnboarding: boolean;
  onboardingKind?: 'create' | 'join';
}

export interface MemberContext {
  username: string;
  familyName: string;
  memberId: string;
  familyId: string;
  cachedAt?: string;
}

export const REFRESH_TOKEN_KEY = 'fsl_refresh_token';
export const MEMBER_CONTEXT_KEY = 'fsl_member_context';
