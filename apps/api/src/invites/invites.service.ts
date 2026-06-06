import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  expiresAtFromDuration,
  generateToken,
  hashToken,
} from '../common/token.util';
import { FamilyInvite } from '@prisma/client';

export interface InvitePreviewResponse {
  familyName: string;
  email: string;
}

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async createInvite(
    memberId: string,
    familyId: string,
    email: string,
  ): Promise<{ ok: true }> {
    const normalizedEmail = email.trim().toLowerCase();

    const existingMember = await this.prisma.member.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingMember) {
      throw new ConflictException('Email is already a member of a family');
    }

    const existingInvite = await this.prisma.familyInvite.findFirst({
      where: {
        familyId,
        email: normalizedEmail,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      throw new ConflictException('An active invite already exists for this email');
    }

    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });

    if (!family) {
      throw new NotFoundException('Family not found');
    }

    const rawToken = generateToken();
    const tokenHash = hashToken(rawToken);
    const inviteExpiresIn = this.config.get<string>('INVITE_EXPIRES_IN', '7d');

    await this.prisma.familyInvite.create({
      data: {
        familyId,
        email: normalizedEmail,
        invitedBy: memberId,
        tokenHash,
        expiresAt: expiresAtFromDuration(inviteExpiresIn),
      },
    });

    await this.emailService.sendFamilyInvite(normalizedEmail, rawToken, family.name);

    return { ok: true };
  }

  async previewInvite(rawToken: string): Promise<InvitePreviewResponse> {
    const invite = await this.findValidInviteByToken(rawToken, {
      includeFamily: true,
    });

    if (!invite.family) {
      throw new NotFoundException('Family not found');
    }

    return {
      familyName: invite.family.name,
      email: invite.email,
    };
  }

  async validateInviteForMagicLink(
    rawToken: string,
    email: string,
  ): Promise<FamilyInvite> {
    const normalizedEmail = email.trim().toLowerCase();
    const invite = await this.findValidInviteByToken(rawToken);

    if (invite.email !== normalizedEmail) {
      throw new BadRequestException('Email does not match the invitation');
    }

    return invite;
  }

  async findValidInviteById(inviteId: string): Promise<FamilyInvite> {
    const invite = await this.prisma.familyInvite.findUnique({
      where: { id: inviteId },
    });

    if (!this.isInviteActive(invite)) {
      throw new UnauthorizedException('Invalid or expired invitation');
    }

    return invite;
  }

  async markAccepted(familyId: string, email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

    await this.prisma.familyInvite.updateMany({
      where: {
        familyId,
        email: normalizedEmail,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { acceptedAt: new Date() },
    });
  }

  private async findValidInviteByToken(
    rawToken: string,
    options?: { includeFamily?: boolean },
  ): Promise<FamilyInvite & { family?: { name: string } }> {
    const tokenHash = hashToken(rawToken);
    const invite = await this.prisma.familyInvite.findUnique({
      where: { tokenHash },
      include: options?.includeFamily ? { family: true } : undefined,
    });

    if (!this.isInviteActive(invite)) {
      throw new UnauthorizedException('Invalid or expired invitation');
    }

    return invite;
  }

  private isInviteActive(
    invite: FamilyInvite | null,
  ): invite is FamilyInvite {
    if (!invite) {
      return false;
    }

    if (invite.acceptedAt || invite.revokedAt) {
      return false;
    }

    return invite.expiresAt >= new Date();
  }
}
