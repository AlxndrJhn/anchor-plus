import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserStatus } from '../generated/prisma/enums';
import { coded, ErrorCode } from '../common/errors/coded';

const SETTING_KEY = 'second_factor_required_since';
/** How long people have to add a passkey or authenticator app. */
export const SECOND_FACTOR_GRACE_DAYS = 30;
const GRACE_MS = SECOND_FACTOR_GRACE_DAYS * 24 * 60 * 60 * 1000;
const POLICY_CACHE_MS = 30_000;

export const SECOND_FACTOR_REQUIRED = 'second_factor_required';

/** Whether the admin asks for one, and from when a password alone stops working. */
export interface SecondFactorPolicy {
  required: boolean;
  since: Date | null;
  deadline: Date | null;
}

/** A person who signs in with a password alone. */
const PASSWORD_ONLY = {
  password: { not: null },
  totpSecret: null,
  oidcIdentities: { none: {} },
  passkeys: { none: {} },
} as const;

/**
 * The admin's rule that everyone signs in with more than a password: a
 * passkey, a code from an authenticator app, or the single sign-on provider.
 * After a grace period, a password alone only lets people set one up.
 */
@Injectable()
export class SecondFactorService {
  private cached: { policy: SecondFactorPolicy; at: number } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async getPolicy(): Promise<SecondFactorPolicy> {
    if (this.cached && Date.now() - this.cached.at < POLICY_CACHE_MS) {
      return this.cached.policy;
    }
    const row = await this.prisma.settings.findUnique({
      where: { key: SETTING_KEY },
    });
    const since = row ? new Date(row.value) : null;
    const policy =
      since && !Number.isNaN(since.getTime())
        ? {
            required: true,
            since,
            deadline: new Date(since.getTime() + GRACE_MS),
          }
        : { required: false, since: null, deadline: null };
    this.cached = { policy, at: Date.now() };
    return policy;
  }

  /** Turning it on starts the grace period; turning it off ends the rule. */
  async setRequired(required: boolean): Promise<SecondFactorPolicy> {
    const current = await this.getPolicy();
    if (required && !current.required) {
      await this.prisma.settings.upsert({
        where: { key: SETTING_KEY },
        update: { value: new Date().toISOString() },
        create: { key: SETTING_KEY, value: new Date().toISOString() },
      });
    } else if (!required) {
      await this.prisma.settings.deleteMany({ where: { key: SETTING_KEY } });
    }
    this.cached = null;
    return this.getPolicy();
  }

  private async isEnforced(): Promise<boolean> {
    const { deadline } = await this.getPolicy();
    return !!deadline && Date.now() >= deadline.getTime();
  }

  private async isPasswordOnly(userId: string): Promise<boolean> {
    return (
      (await this.prisma.user.count({
        where: { id: userId, ...PASSWORD_ONLY },
      })) > 0
    );
  }

  /** The grace period is over and this person hasn't set anything up yet. */
  async isBlocked(userId: string): Promise<boolean> {
    return (await this.isEnforced()) && (await this.isPasswordOnly(userId));
  }

  /** For the person's own app: whether to ask, and by when. */
  async getStatus(userId: string) {
    const policy = await this.getPolicy();
    if (!policy.required) return null;
    const needed = await this.isPasswordOnly(userId);
    return {
      deadline: policy.deadline!.toISOString(),
      needed,
      blocked: needed && Date.now() >= policy.deadline!.getTime(),
    };
  }

  /**
   * After the grace period a password alone signs no one in: those with a
   * passkey or single sign-on use that instead. (An authenticator app is
   * asked for right after the password, as always.)
   */
  async checkPasswordSignIn(userId: string) {
    if (!(await this.isEnforced())) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        totpSecret: true,
        _count: { select: { passkeys: true, oidcIdentities: true } },
      },
    });
    if (!user || user.totpSecret) return;
    if (user._count.passkeys > 0)
      throw coded(
        new ForbiddenException(
          'A password alone no longer signs you in. Sign in with your passkey.',
        ),
        ErrorCode.SIGN_IN_WITH_PASSKEY,
      );
    if (user._count.oidcIdentities > 0)
      throw coded(
        new ForbiddenException(
          'A password alone no longer signs you in. Sign in with your sign-in provider.',
        ),
        ErrorCode.SIGN_IN_WITH_PROVIDER,
      );
  }

  /** The active people still signing in with a password alone. */
  async listPasswordOnly() {
    return this.prisma.user.findMany({
      where: { status: UserStatus.active, ...PASSWORD_ONLY },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }
}
