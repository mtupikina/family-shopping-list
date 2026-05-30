import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtPayload } from '../auth/auth.types';
import { CreateFamilyDto } from './dto/create-family.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async createFamily(user: JwtPayload, dto: CreateFamilyDto) {
    if (!this.authService.isPendingPayload(user)) {
      throw new UnauthorizedException('Pending onboarding session required');
    }

    const email = user.email.trim().toLowerCase();
    const existing = await this.prisma.member.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('Member already exists for this email');
    }

    const member = await this.prisma.$transaction(async tx => {
      const family = await tx.family.create({
        data: { name: dto.familyName.trim() },
      });

      return tx.member.create({
        data: {
          email,
          username: dto.username.trim(),
          familyId: family.id,
        },
      });
    });

    return this.authService.issueMemberTokens(member.id, member.email, member.familyId);
  }
}
