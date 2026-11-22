import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { POSITIONS_MAX_NOTES } from '../constants/notes.constants';

export class NotePlaceDto {
  @IsString()
  @IsNotEmpty()
  noteId: string;

  // Higher sorts first; null forgets the place, back to when it was made.
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  position: number | null;
}

/** Several notes put in place at once, such as a whole list's order. */
export class NotePositionsDto {
  @IsArray()
  @ArrayMaxSize(POSITIONS_MAX_NOTES)
  @ValidateNested({ each: true })
  @Type(() => NotePlaceDto)
  positions: NotePlaceDto[];
}
