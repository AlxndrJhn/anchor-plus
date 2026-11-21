import {
  IsBoolean,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { PASSKEY_NAME_MAX_LENGTH } from '../constants/auth.constants';

export class TwoStepCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;
}

export class EnableTwoStepDto extends TwoStepCodeDto {
  // The session turning it on stays signed in; every other one is signed out.
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class PasswordSignInDto {
  @IsBoolean()
  enabled: boolean;
}

export class AddPasskeyDto {
  // Checked by the WebAuthn verification, not here.
  @IsObject()
  response: RegistrationResponseJSON;

  @IsOptional()
  @IsString()
  @MaxLength(PASSKEY_NAME_MAX_LENGTH)
  name?: string;
}

export class PasskeySignInDto {
  @IsString()
  @IsNotEmpty()
  challengeId: string;

  @IsObject()
  response: AuthenticationResponseJSON;
}
