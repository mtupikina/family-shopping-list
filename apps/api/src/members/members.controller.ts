import { Controller, Get } from '@nestjs/common';
import { MembersService } from './members.service';
import { RequiresMember, CurrentUser } from '../auth/auth.decorators';
import { JwtMemberPayload } from '../auth/auth.types';

@Controller('me')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get('context')
  @RequiresMember()
  getContext(@CurrentUser() user: JwtMemberPayload) {
    return this.membersService.getContext(user.sub);
  }
}
