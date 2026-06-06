import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { InvitesService } from '../invites/invites.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: {
    member: { findUnique: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let authService: { isPendingPayload: jest.Mock; issueMemberTokens: jest.Mock };
  let invitesService: { markAccepted: jest.Mock };

  beforeEach(() => {
    prisma = {
      member: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'member-2',
          email: 'partner@example.com',
          familyId: 'family-1',
        }),
      },
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

    invitesService = {
      markAccepted: jest.fn().mockResolvedValue(undefined),
    };

    service = new OnboardingService(
      prisma as unknown as PrismaService,
      authService as unknown as AuthService,
      invitesService as unknown as InvitesService,
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

  it('rejects create family for invited pending user', async () => {
    await expect(
      service.createFamily(
        {
          sub: 'partner@example.com',
          email: 'partner@example.com',
          pending: true,
          familyId: 'family-1',
        },
        { familyName: 'Smith Family', username: 'Partner' },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('joins invited user to existing family', async () => {
    const result = await service.joinFamily(
      {
        sub: 'partner@example.com',
        email: 'partner@example.com',
        pending: true,
        familyId: 'family-1',
      },
      { username: 'Partner' },
    );

    expect(prisma.member.create).toHaveBeenCalledWith({
      data: {
        email: 'partner@example.com',
        username: 'Partner',
        familyId: 'family-1',
      },
    });
    expect(invitesService.markAccepted).toHaveBeenCalledWith('family-1', 'partner@example.com');
    expect(authService.issueMemberTokens).toHaveBeenCalledWith(
      'member-2',
      'partner@example.com',
      'family-1',
    );
    expect(result.needsOnboarding).toBe(false);
  });
});
