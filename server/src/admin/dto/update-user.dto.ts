import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Plan } from 'src/generated/prisma/enums';
import { RejectUnknownFields } from '../../common/decorators/reject-unknown-fields.decorator';

@RejectUnknownFields()
export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @IsOptional()
  @IsIn(Object.values(Plan))
  plan?: Plan;

  /** The account's own storage limit in MB; null follows the plan. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  storageQuotaMb?: number | null;
}
