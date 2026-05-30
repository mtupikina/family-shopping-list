import { Controller, Get, Post, Body, Query, HttpCode, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LogoutDto, RefreshTokenDto, RequestMagicLinkDto } from './dto/auth.dto';
import { Public } from './auth.decorators';

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('magic-link')
  @HttpCode(200)
  async requestMagicLink(@Body() dto: RequestMagicLinkDto): Promise<{ ok: true }> {
    await this.authService.requestMagicLink(dto.email);
    return { ok: true };
  }

  @Get('magic-link/verify')
  async verifyMagicLink(@Query('token') token: string) {
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }
    return this.authService.verifyMagicLink(token);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() dto: LogoutDto): Promise<{ ok: true }> {
    await this.authService.logout(dto.refreshToken);
    return { ok: true };
  }
}
