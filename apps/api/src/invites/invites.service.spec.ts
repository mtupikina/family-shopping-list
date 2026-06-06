import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitesService } from './invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('InvitesService', () => {
  let service: InvitesService;
  let prisma: {
    member: { findUnique: jest.Mock };
    familyInvite: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    family: { findUnique: jest.Mock };
  };
  let emailService: { sendFamilyInvite: jest.Mock };

  beforeEach(() => {
    prisma = {
      member: { findUnique: jest.fn().mockResolvedValue(null) },
      familyInvite: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'invite-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      family: {
        findUnique: jest.fn().mockResolvedValue({ id: 'family-1', name: 'Smith Family' }),
      },
    };

    emailService = {
      sendFamilyInvite: jest.fn().mockResolvedValue(undefined),
    };

    const config = {
      get: jest.fn((_key: string, fallback?: string) => fallback),
    };

    service = new InvitesService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
      emailService as unknown as EmailService,
    );
  });

  it('creates invite and sends email', async () => {
    const result = await service.createInvite('member-1', 'family-1', 'Partner@Example.com');

    expect(prisma.familyInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          familyId: 'family-1',
          email: 'partner@example.com',
          invitedBy: 'member-1',
        }),
      }),
    );
    expect(emailService.sendFamilyInvite).toHaveBeenCalledWith(
      'partner@example.com',
      expect.any(String),
      'Smith Family',
    );
    expect(result).toEqual({ ok: true });
  });

  it('throws when email is already a member', async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.createInvite('member-1', 'family-1', 'partner@example.com'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when active invite already exists', async () => {
    prisma.familyInvite.findFirst.mockResolvedValue({ id: 'invite-1' });

    await expect(
      service.createInvite('member-1', 'family-1', 'partner@example.com'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('previews valid invite', async () => {
    prisma.familyInvite.findUnique.mockResolvedValue({
      id: 'invite-1',
      email: 'partner@example.com',
      acceptedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      family: { name: 'Smith Family' },
    });

    await expect(service.previewInvite('raw-token')).resolves.toEqual({
      familyName: 'Smith Family',
      email: 'partner@example.com',
    });
  });

  it('rejects expired invite preview', async () => {
    prisma.familyInvite.findUnique.mockResolvedValue({
      id: 'invite-1',
      email: 'partner@example.com',
      acceptedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
    });

    await expect(service.previewInvite('raw-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
