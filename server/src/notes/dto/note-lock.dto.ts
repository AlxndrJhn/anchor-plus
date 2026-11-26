import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';
import type { NoteLockKind } from 'src/generated/prisma/enums';
import { BULK_MAX_NOTE_IDS } from '../constants/notes.constants';
import { NOTE_LOCK_KINDS } from '../utils/note-lock.util';

export class NoteLockDto {
  // What opens the note from now on; null takes the lock off.
  @ValidateIf((_, value) => value !== null)
  @IsIn(NOTE_LOCK_KINDS)
  lock: NoteLockKind | null;
}

export class BulkLockDto extends NoteLockDto {
  @IsArray()
  @ArrayMaxSize(BULK_MAX_NOTE_IDS)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  noteIds: string[];
}

/**
 * A PIN is 4 to 12 digits. A pattern is the dots it joins, in order, as
 * digits 0 to 8 (left to right, top to bottom): 4 to 9 of them, none twice.
 */
export const isLockPin = (secret: string) => /^\d{4,12}$/.test(secret);
export const isLockPattern = (secret: string) =>
  /^[0-8]{4,9}$/.test(secret) && new Set(secret).size === secret.length;

export class SetLockSecretDto {
  @IsString()
  secret: string;

  // The PIN or pattern being replaced, or else the account password.
  @IsString()
  @IsOptional()
  current?: string;

  @IsString()
  @IsOptional()
  password?: string;
}

export class VerifyLockDto {
  @IsIn(['pin', 'pattern', 'password'])
  kind: 'pin' | 'pattern' | 'password';

  @IsString()
  @Matches(/^.{1,200}$/s)
  secret: string;
}
