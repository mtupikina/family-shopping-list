import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberContextResponse } from '../auth/auth.types';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async getContext(memberId: string): Promise<MemberContextResponse> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: { family: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return {
      username: member.username,
      familyName: member.family.name,
      memberId: member.id,
      familyId: member.familyId,
    };
  }
}
