import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { isLockPattern, isLockPin } from '../dto/note-lock.dto';
import { hashLockSecret, lockSecretMatches } from '../utils/note-lock.util';
import { AttemptLimiter } from '../../common/utils/attempt-limiter';
import {
  FAILED_GUESS_WINDOW_MS,
  MAX_FAILED_GUESSES,
} from '../../auth/constants/auth.constants';
import { coded, ErrorCode } from '../../common/errors/coded';

type SecretKind = 'pin' | 'pattern';

const FIELD = { pin: 'lockPin', pattern: 'lockPattern' } as const;

/**
 * The one PIN and one pattern a person opens their locked notes with. Only
 * hashes are kept, and handed to the apps so they can check them offline.
 */
@Injectable()
export class NoteLocksService {
  // A PIN has few digits: without a limit it can be guessed through.
  private readonly failedGuesses = new AttemptLimiter(
    MAX_FAILED_GUESSES,
    FAILED_GUESS_WINDOW_MS,
  );

  constructor(private prisma: PrismaService) {}

  async secrets(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { lockPin: true, lockPattern: true, password: true },
    });
    return {
      pin: user.lockPin,
      pattern: user.lockPattern,
      // Without one (a single sign-on account), the web can't stand in a
      // password for a fingerprint.
      hasPassword: !!user.password,
    };
  }

  async setSecret(
    userId: string,
    kind: SecretKind,
    secret: string,
    proof: { current?: string; password?: string },
  ) {
    if (!(kind === 'pin' ? isLockPin : isLockPattern)(secret)) {
      throw kind === 'pin'
        ? coded(
            new BadRequestException('A PIN is 4 to 12 digits'),
            ErrorCode.LOCK_PIN_INVALID,
          )
        : coded(
            new BadRequestException('A pattern joins at least 4 dots'),
            ErrorCode.LOCK_PATTERN_INVALID,
          );
    }
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { lockPin: true, lockPattern: true, password: true },
    });
    const stored = user[FIELD[kind]];
    // Replacing one takes the old one, or the account password.
    if (stored) {
      const proven =
        (proof.current !== undefined &&
          lockSecretMatches(proof.current, stored)) ||
        (proof.password !== undefined &&
          !!user.password &&
          (await bcrypt.compare(proof.password, user.password)));
      if (!proven) {
        throw coded(
          new ForbiddenException(
            kind === 'pin'
              ? 'Wrong PIN or password'
              : 'Wrong pattern or password',
          ),
          ErrorCode.LOCK_SECRET_WRONG,
          { kind },
        );
      }
    }
    const hash = hashLockSecret(secret);
    await this.prisma.user.update({
      where: { id: userId },
      data: { [FIELD[kind]]: hash },
    });
    return this.secrets(userId);
  }

  /** For the web, which checks against the server rather than itself. */
  async verify(
    userId: string,
    kind: SecretKind | 'password',
    secret: string,
  ): Promise<{ ok: boolean }> {
    const attemptKey = `${userId}:${kind}`;
    this.failedGuesses.check(attemptKey);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { lockPin: true, lockPattern: true, password: true },
    });
    let ok: boolean;
    if (kind === 'password') {
      ok = !!user.password && (await bcrypt.compare(secret, user.password));
    } else {
      const stored = user[FIELD[kind]];
      ok = !!stored && lockSecretMatches(secret, stored);
    }
    if (ok) this.failedGuesses.succeed(attemptKey);
    else this.failedGuesses.fail(attemptKey);
    return { ok };
  }
}
