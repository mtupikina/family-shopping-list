import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestMagicLinkDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  inviteToken?: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class VerifyMagicLinkQueryDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}
