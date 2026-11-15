import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { RejectUnknownFields } from '../../common/decorators/reject-unknown-fields.decorator';
import { OIDC_PROVIDER_ID_PATTERN } from '../../auth/oidc/oidc-providers';

/** Changes to a sign-in provider added in the admin UI. */
@RejectUnknownFields()
export class UpdateOidcProviderDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  issuerUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clientId?: string;

  /** Empty clears it; left out keeps it. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  clientSecret?: string;

  /** Empty clears it; left out keeps it. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  mobileClientId?: string;

  /** Its sign-out page, if it publishes no end_session_endpoint. Empty clears it. */
  @IsOptional()
  @ValidateIf((dto: UpdateOidcProviderDto) => dto.logoutUrl !== '')
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  logoutUrl?: string;
}

/** A sign-in provider the admin adds. */
@RejectUnknownFields()
export class CreateOidcProviderDto extends UpdateOidcProviderDto {
  /** Its slug, in its callback URL. */
  @IsString()
  @Matches(OIDC_PROVIDER_ID_PATTERN, {
    message:
      'id must be lowercase letters, numbers and dashes, up to 32 of them',
  })
  id!: string;
}
