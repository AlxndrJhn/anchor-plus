import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as crypto from 'crypto';
import { AuthConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { AttemptLimiter } from '../common/utils/attempt-limiter';
import {
  AUTH_ISSUER,
  FAILED_GUESS_WINDOW_MS,
  MAX_FAILED_GUESSES,
  RECOVERY_CODE_COUNT,
  SECURITY_SETUP_VALIDITY_MS,
} from './constants/auth.constants';
import { generateTotpSecret, totpUri, verifyTotp } from './utils/totp';
import { SecretBox } from './utils/secret-box';
import { coded, ErrorCode } from '../common/errors/coded';

/** What sign-in answers when the password was right but a code is missing. */
export const TWO_STEP_REQUIRED = 'two_step_required';

const hashRecoveryCode = (code: string) =>
  crypto
    .createHash('sha256')
    .update(code.replace(/[\s-]/g, '').toLowerCase())
    .digest('hex');

function newRecoveryCodes() {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const hex = crypto.randomBytes(5).toString('hex');
    return `${hex.slice(0, 5)}-${hex.slice(5)}`;
  });
  return { codes, hashes: codes.map(hashRecoveryCode) };
}

/**
 * Two-step sign-in with an authenticator app: after the password, a six-digit
 * code from the app, or one of the recovery codes given when it was set up.
 */
@Injectable()
export class TwoStepService implements OnModuleInit {
  private readonly logger = new Logger(TwoStepService.name);
  private readonly failedCodes = new AttemptLimiter(
    MAX_FAILED_GUESSES,
    FAILED_GUESS_WINDOW_MS,
  );
  // A secret shown for scanning, until its first code turns two-step on.
  private readonly pending = new Map<
    string,
    { secret: string; expiresAt: number }
  >();

  // The app's key is stored sealed, so a database copy alone makes no codes.
  private readonly box: SecretBox;

  constructor(
    private prisma: PrismaService,
    @Inject(AuthConfig.KEY) authConfig: ConfigType<typeof AuthConfig>,
  ) {
    this.box = new SecretBox(authConfig.jwtSecret, 'totp');
  }

  /** Seals the keys stored before they were sealed. */
  async onModuleInit() {
    const users = await this.prisma.user.findMany({
      where: {
        totpSecret: { not: null },
        NOT: { totpSecret: { startsWith: 'v1:' } },
      },
      select: { id: true, totpSecret: true },
    });
    for (const { id, totpSecret } of users) {
      if (!totpSecret) continue;
      // Only if it wasn't changed meanwhile.
      await this.prisma.user.updateMany({
        where: { id, totpSecret },
        data: { totpSecret: this.box.seal(totpSecret) },
      });
    }
    if (users.length)
      this.logger.log(`Sealed ${users.length} authenticator app key(s)`);
  }

  async start(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, totpSecret: true },
    });
    if (!user)
      throw coded(
        new ForbiddenException('User not found'),
        ErrorCode.USER_NOT_FOUND,
      );
    if (user.totpSecret)
      throw coded(
        new BadRequestException('Two-step sign-in is already on'),
        ErrorCode.TWO_STEP_ALREADY_ON,
      );

    const secret = generateTotpSecret();
    this.pending.set(userId, {
      secret,
      expiresAt: Date.now() + SECURITY_SETUP_VALIDITY_MS,
    });
    return { secret, uri: totpUri(secret, user.email, AUTH_ISSUER) };
  }

  /** Turns two-step on with the first code; answers the recovery codes. */
  async enable(userId: string, code: string) {
    const pending = this.pending.get(userId);
    if (!pending || Date.now() > pending.expiresAt) {
      this.pending.delete(userId);
      throw coded(
        new BadRequestException(
          'The setup has expired. Start it again to get a new QR code.',
        ),
        ErrorCode.TWO_STEP_SETUP_EXPIRED,
      );
    }
    this.failedCodes.check(`setup:${userId}`);
    const step = verifyTotp(pending.secret, code);
    if (step === null) {
      this.failedCodes.fail(`setup:${userId}`);
      throw coded(
        new ForbiddenException('That code isn’t right'),
        ErrorCode.TWO_STEP_CODE_WRONG,
      );
    }
    this.failedCodes.succeed(`setup:${userId}`);
    this.pending.delete(userId);

    const { codes, hashes } = newRecoveryCodes();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: this.box.seal(pending.secret),
        totpLastStep: step,
        totpRecoveryCodes: hashes,
      },
    });
    return { recoveryCodes: codes };
  }

  async disable(userId: string, code: string) {
    await this.verifyOrForbid(userId, code);
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpLastStep: null, totpRecoveryCodes: [] },
    });
  }

  async regenerateRecoveryCodes(userId: string, code: string) {
    await this.verifyOrForbid(userId, code);
    const { codes, hashes } = newRecoveryCodes();
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpRecoveryCodes: hashes },
    });
    return { recoveryCodes: codes };
  }

  /**
   * At sign-in, after the password: passes when two-step is off, or [code] is
   * a fresh code from the app or an unused recovery code (which it uses up).
   */
  async checkSignIn(userId: string, code: string | undefined) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true },
    });
    if (!user?.totpSecret) return;
    if (!code?.trim())
      throw new UnauthorizedException({
        statusCode: 401,
        error: TWO_STEP_REQUIRED,
        code: ErrorCode.TWO_STEP_REQUIRED,
        message: 'Enter the code from your authenticator app',
      });
    await this.verifyOrThrow(userId, code);
  }

  private async verifyOrThrow(userId: string, code: string) {
    if (await this.verifyLimited(userId, code)) return;
    throw new UnauthorizedException({
      statusCode: 401,
      error: TWO_STEP_REQUIRED,
      code: ErrorCode.TWO_STEP_CODE_WRONG,
      message: 'That code isn’t right',
    });
  }

  // Signed in already: a 401 would read as an ended session.
  private async verifyOrForbid(userId: string, code: string) {
    if (await this.verifyLimited(userId, code)) return;
    throw coded(
      new ForbiddenException('That code isn’t right'),
      ErrorCode.TWO_STEP_CODE_WRONG,
    );
  }

  private async verifyLimited(userId: string, code: string) {
    const key = `user:${userId}`;
    this.failedCodes.check(key);
    if (await this.verify(userId, code)) {
      this.failedCodes.succeed(key);
      return true;
    }
    this.failedCodes.fail(key);
    return false;
  }

  private async verify(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, totpLastStep: true, totpRecoveryCodes: true },
    });
    if (!user?.totpSecret)
      throw coded(
        new BadRequestException('Two-step is off'),
        ErrorCode.TWO_STEP_OFF,
      );

    // Unreadable after JWT_SECRET changed: only recovery codes work then.
    const secret = this.box.open(user.totpSecret);
    const step =
      secret === null ? null : verifyTotp(secret, code, user.totpLastStep);
    if (step !== null) {
      // Only if no other request used this step meanwhile.
      const { count } = await this.prisma.user.updateMany({
        where: {
          id: userId,
          OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
        },
        data: { totpLastStep: step },
      });
      return count === 1;
    }

    const hash = hashRecoveryCode(code);
    if (!user.totpRecoveryCodes.includes(hash)) return false;
    const { count } = await this.prisma.user.updateMany({
      where: { id: userId, totpRecoveryCodes: { has: hash } },
      data: {
        totpRecoveryCodes: user.totpRecoveryCodes.filter((h) => h !== hash),
      },
    });
    return count === 1;
  }
}
