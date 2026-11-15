import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { DRIVE_FILE_ID_RE } from './google-drive';

/** The Takeout ZIP parts picked in the Google Picker, and its token. */
export class KeepDriveImportDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Matches(DRIVE_FILE_ID_RE, { each: true })
  fileIds: string[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  accessToken: string;
}
