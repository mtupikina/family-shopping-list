import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  familyName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  username!: string;
}
