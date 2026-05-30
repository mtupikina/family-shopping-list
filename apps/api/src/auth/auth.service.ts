import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  expiresAtFromDuration,
  generateToken,
  hashToken,
} from '../common/token.util';
import { AuthTokensResponse, JwtMemberPayload, JwtPayload, JwtPendingPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async requestMagicLink(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const magicLinkExpiresIn = this.config.get<string>('MAGIC_LINK_EXPIRES_IN', '15m');

    await this.prisma.magicLinkToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        expiresAt: expiresAtFromDuration(magicLinkExpiresIn),
      },
    });

    await this.emailService.sendMagicLink(normalizedEmail, rawToken);
  }

  async verifyMagicLink(rawToken: string): Promise<AuthTokensResponse> {
    const tokenHash = hashToken(rawToken);
    const storedToken = await this.prisma.magicLinkToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.usedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    await this.prisma.magicLinkToken.update({
      where: { id: storedToken.id },
      data: { usedAt: new Date() },
    });

    const member = await this.prisma.member.findUnique({
      where: { email: storedToken.email },
    });

    if (member) {
      return this.issueMemberTokens(member.id, member.email, member.familyId);
    }

    return this.issuePendingToken(storedToken.email);
  }

  async refresh(refreshToken: string): Promise<AuthTokensResponse> {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { member: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueMemberTokens(stored.member.id, stored.member.email, stored.member.familyId);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async issueMemberTokens(
    memberId: string,
    email: string,
    familyId: string,
  ): Promise<AuthTokensResponse> {
    const payload: JwtMemberPayload = {
      sub: memberId,
      email,
      familyId,
    };

    const accessToken = await this.signAccessToken(payload);
    const refreshToken = await this.createRefreshToken(memberId);

    return {
      accessToken,
      refreshToken,
      needsOnboarding: false,
    };
  }

  issuePendingToken(email: string): AuthTokensResponse {
    const payload: JwtPendingPayload = {
      sub: email,
      email,
      pending: true,
    };

    const expiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`;

    const accessToken = this.jwtService.sign(payload, { expiresIn });

    return {
      accessToken,
      needsOnboarding: true,
    };
  }

  async signAccessToken(payload: JwtMemberPayload): Promise<string> {
    const expiresIn = this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`;
    return this.jwtService.signAsync(payload, { expiresIn });
  }

  private async createRefreshToken(memberId: string): Promise<string> {
    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '90d');

    await this.prisma.refreshToken.create({
      data: {
        memberId,
        tokenHash,
        expiresAt: expiresAtFromDuration(refreshExpiresIn),
      },
    });

    return rawToken;
  }

  isPendingPayload(payload: JwtPayload): payload is JwtPendingPayload {
    return 'pending' in payload && payload.pending === true;
  }

  isMemberPayload(payload: JwtPayload): payload is JwtMemberPayload {
    return !this.isPendingPayload(payload) && !!payload.familyId;
  }
}
