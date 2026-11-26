import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import type { AuthenticatedRequest } from './authenticated-request';
import { ALLOW_BEFORE_SECOND_FACTOR } from './decorators/allow-before-second-factor.decorator';
import {
  SECOND_FACTOR_REQUIRED,
  SecondFactorService,
} from './second-factor.service';
import { ErrorCode } from '../common/errors/coded';

/**
 * Once the grace period is over, someone signed in with a password alone can
 * only set up a passkey or authenticator app. Runs after the guards, so it
 * sees whoever they signed in.
 */
@Injectable()
export class SecondFactorInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly secondFactor: SecondFactorService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') return next.handle();
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    const allowed = this.reflector.getAllAndOverride<boolean>(
      ALLOW_BEFORE_SECOND_FACTOR,
      [context.getHandler(), context.getClass()],
    );
    if (user && !allowed && (await this.secondFactor.isBlocked(user.id))) {
      throw new ForbiddenException({
        statusCode: 403,
        error: SECOND_FACTOR_REQUIRED,
        code: ErrorCode.SECOND_FACTOR_REQUIRED,
        message:
          'Your admin asks everyone to sign in with a passkey or an authenticator app. Set one up to carry on.',
      });
    }
    return next.handle();
  }
}
