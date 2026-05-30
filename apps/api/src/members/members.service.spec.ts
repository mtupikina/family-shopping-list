import { NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MembersService', () => {
  let service: MembersService;
  let prisma: { member: { findUnique: jest.Mock } };

  beforeEach(() => {
    prisma = {
      member: { findUnique: jest.fn() },
    };

    service = new MembersService(prisma as unknown as PrismaService);
  });

  it('returns member context', async () => {
    prisma.member.findUnique.mockResolvedValue({
      id: 'member-1',
      username: 'Marta',
      familyId: 'family-1',
      family: { name: 'Smith Family' },
    });

    await expect(service.getContext('member-1')).resolves.toEqual({
      username: 'Marta',
      familyName: 'Smith Family',
      memberId: 'member-1',
      familyId: 'family-1',
    });
  });

  it('throws when member is missing', async () => {
    prisma.member.findUnique.mockResolvedValue(null);

    await expect(service.getContext('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
