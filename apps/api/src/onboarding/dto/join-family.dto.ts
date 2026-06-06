import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class JoinFamilyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  username!: string;
}
