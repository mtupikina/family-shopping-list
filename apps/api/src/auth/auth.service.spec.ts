import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { hashToken } from '../common/token.util';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    magicLinkToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    member: { findUnique: jest.Mock };
    refreshToken: {
      findUnique: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
    };
  };
  let jwtService: { sign: jest.Mock; signAsync: jest.Mock };
  let emailService: { sendMagicLink: jest.Mock };

  beforeEach(() => {
    prisma = {
      magicLinkToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      member: { findUnique: jest.fn() },
      refreshToken: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('pending-token'),
      signAsync: jest.fn().mockResolvedValue('member-token'),
    };

    emailService = {
      sendMagicLink: jest.fn().mockResolvedValue(undefined),
    };

    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          MAGIC_LINK_EXPIRES_IN: '15m',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '90d',
        };
        return values[key] ?? fallback;
      }),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
      emailService as unknown as EmailService,
    );
  });

  it('requests a magic link and stores hashed token', async () => {
    await service.requestMagicLink('Marta@Example.com');

    expect(prisma.magicLinkToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'marta@example.com',
        }),
      }),
    );
    expect(emailService.sendMagicLink).toHaveBeenCalledWith(
      'marta@example.com',
      expect.any(String),
    );
  });

  it('verifies magic link for existing member', async () => {
    const raw = 'raw-token';
    prisma.magicLinkToken.findUnique.mockResolvedValue({
      id: '1',
      email: 'marta@example.com',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.member.findUnique.mockResolvedValue({
      id: 'member-1',
      email: 'marta@example.com',
      familyId: 'family-1',
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.verifyMagicLink(raw);

    expect(prisma.magicLinkToken.update).toHaveBeenCalled();
    expect(result.needsOnboarding).toBe(false);
    expect(result.accessToken).toBe('member-token');
    expect(result.refreshToken).toEqual(expect.any(String));
  });

  it('verifies magic link for new user with pending onboarding', async () => {
    prisma.magicLinkToken.findUnique.mockResolvedValue({
      id: '1',
      email: 'new@example.com',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.member.findUnique.mockResolvedValue(null);

    const result = await service.verifyMagicLink('raw-token');

    expect(result.needsOnboarding).toBe(true);
    expect(result.accessToken).toBe('pending-token');
    expect(result.refreshToken).toBeUndefined();
  });

  it('rejects invalid magic link', async () => {
    prisma.magicLinkToken.findUnique.mockResolvedValue(null);

    await expect(service.verifyMagicLink('bad')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes member tokens and revokes old refresh token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      member: {
        id: 'member-1',
        email: 'marta@example.com',
        familyId: 'family-1',
      },
    });
    prisma.refreshToken.create.mockResolvedValue({});

    const result = await service.refresh('refresh-raw');

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(result.needsOnboarding).toBe(false);
  });

  it('logout revokes refresh token by hash', async () => {
    const raw = 'logout-token';
    await service.logout(raw);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { tokenHash: hashToken(raw), revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
