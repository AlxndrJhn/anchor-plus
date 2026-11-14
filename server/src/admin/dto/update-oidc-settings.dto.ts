import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { RejectUnknownFields } from '../../common/decorators/reject-unknown-fields.decorator';

@RejectUnknownFields()
export class UpdateOidcSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  providerName?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  issuerUrl?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;

  @IsOptional()
  @IsBoolean()
  clearClientSecret?: boolean;

  @IsOptional()
  @IsString()
  mobileClientId?: string;

  @IsOptional()
  @IsBoolean()
  disableInternalAuth?: boolean;

  @IsOptional()
  @IsBoolean()
  providerLogout?: boolean;

  /** Empty goes back to the provider's own end_session_endpoint. */
  @IsOptional()
  @ValidateIf((dto: UpdateOidcSettingsDto) => dto.logoutUrl !== '')
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  logoutUrl?: string;
}
