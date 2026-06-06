import { Body, Controller, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { JoinFamilyDto } from './dto/join-family.dto';
import { CurrentUser } from '../auth/auth.decorators';
import { JwtPayload } from '../auth/auth.types';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('family')
  createFamily(@CurrentUser() user: JwtPayload, @Body() dto: CreateFamilyDto) {
    return this.onboardingService.createFamily(user, dto);
  }

  @Post('join')
  joinFamily(@CurrentUser() user: JwtPayload, @Body() dto: JoinFamilyDto) {
    return this.onboardingService.joinFamily(user, dto);
  }
}
