import { IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  /** Asked for when the account has a password it signs in with. */
  @IsOptional()
  @IsString()
  password?: string;
}
