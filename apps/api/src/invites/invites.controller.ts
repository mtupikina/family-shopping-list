import { Body, Controller, Get, Post, Query, UnauthorizedException } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { CurrentUser, Public, RequiresMember } from '../auth/auth.decorators';
import { JwtMemberPayload } from '../auth/auth.types';

@Controller('family')
export class FamilyInvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post('invites')
  @RequiresMember()
  createInvite(@CurrentUser() user: JwtMemberPayload, @Body() dto: CreateInviteDto) {
    return this.invitesService.createInvite(user.sub, user.familyId, dto.email);
  }
}

@Controller('invites')
@Public()
export class InvitesPreviewController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get('preview')
  previewInvite(@Query('token') token: string) {
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    return this.invitesService.previewInvite(token);
  }
}
