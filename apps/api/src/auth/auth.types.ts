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
}

export type JwtPayload = JwtMemberPayload | JwtPendingPayload;

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken?: string;
  needsOnboarding: boolean;
}

export interface MemberContextResponse {
  username: string;
  familyName: string;
  memberId: string;
  familyId: string;
}
