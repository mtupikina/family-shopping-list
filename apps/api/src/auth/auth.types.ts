export interface JwtMemberPayload {
  sub: string;
  email: string;
  familyId: string;
  pending?: false;
}

export interface JwtPendingPayload {
  sub: string;
  email: string;
  pending: true;
  familyId?: string;
}

export type JwtPayload = JwtMemberPayload | JwtPendingPayload;

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken?: string;
  needsOnboarding: boolean;
  onboardingKind?: 'create' | 'join';
}

export interface MemberContextResponse {
  username: string;
  familyName: string;
  memberId: string;
  familyId: string;
}
