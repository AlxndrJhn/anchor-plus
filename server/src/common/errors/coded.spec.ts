import { describe, expect, it } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { coded, ErrorCode } from './coded';

describe('coded', () => {
  it('adds the code next to the English message', () => {
    const exception = coded(
      new ForbiddenException('Registration is disabled'),
      ErrorCode.REGISTRATION_DISABLED,
    );
    expect(exception.getResponse()).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Registration is disabled',
      code: 'REGISTRATION_DISABLED',
    });
  });

  it('carries the values the message names', () => {
    const exception = coded(
      new BadRequestException('Sign in with Pocket ID.'),
      ErrorCode.PASSWORD_SIGN_IN_DISABLED,
      { provider: 'Pocket ID' },
    );
    expect(exception.getResponse()).toMatchObject({
      code: 'PASSWORD_SIGN_IN_DISABLED',
      params: { provider: 'Pocket ID' },
    });
  });

  it('leaves a bare string body alone', () => {
    const exception = coded(
      new HttpException('Teapot', 418),
      ErrorCode.VALIDATION_FAILED,
    );
    expect(exception.getResponse()).toBe('Teapot');
  });

  it('names each code after itself', () => {
    for (const [key, value] of Object.entries(ErrorCode))
      expect(value).toBe(key);
  });
});
