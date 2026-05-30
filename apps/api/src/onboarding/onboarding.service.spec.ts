import { ConflictException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: {
    member: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let authService: { isPendingPayload: jest.Mock; issueMemberTokens: jest.Mock };

  beforeEach(() => {
    prisma = {
      member: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(),
    };

    authService = {
      isPendingPayload: jest.fn().mockReturnValue(true),
      issueMemberTokens: jest.fn().mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        needsOnboarding: false,
      }),
    };

    service = new OnboardingService(
      prisma as unknown as PrismaService,
      authService as unknown as AuthService,
    );
  });

  it('creates family and member in a transaction', async () => {
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        family: { create: jest.fn().mockResolvedValue({ id: 'family-1' }) },
        member: {
          create: jest.fn().mockResolvedValue({
            id: 'member-1',
            email: 'marta@example.com',
            familyId: 'family-1',
          }),
        },
      }),
    );

    const result = await service.createFamily(
      { sub: 'marta@example.com', email: 'marta@example.com', pending: true },
      { familyName: 'Smith Family', username: 'Marta' },
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(authService.issueMemberTokens).toHaveBeenCalledWith(
      'member-1',
      'marta@example.com',
      'family-1',
    );
    expect(result.needsOnboarding).toBe(false);
  });

  it('throws when member already exists', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createFamily(
        { sub: 'marta@example.com', email: 'marta@example.com', pending: true },
        { familyName: 'Smith Family', username: 'Marta' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
