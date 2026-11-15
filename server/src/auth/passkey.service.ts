import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/configuration';
import { UserStatus } from '../generated/prisma/enums';
import { AuthService } from './auth.service';
import {
  AUTH_ISSUER,
  PASSKEY_NAME_MAX_LENGTH,
  PASSKEY_SIGN_IN_VALIDITY_MS,
  SECURITY_SETUP_VALIDITY_MS,
} from './constants/auth.constants';

interface Challenge {
  challenge: string;
  origin: string;
  expiresAt: number;
}

const MAX_SIGN_IN_CHALLENGES = 10_000;

/**
 * Passkeys: sign in without a password, with the device's lock (a
 * fingerprint, a face, a PIN) or a security key. A passkey belongs to the
 * host it was made on, which the browser makes sure of; the server checks
 * the answer came from that host.
 */
@Injectable()
export class PasskeyService implements OnModuleDestroy {
  private readonly registrations = new Map<string, Challenge>();
  private readonly signIns = new Map<string, Challenge>();
  private readonly cleanupInterval = setInterval(
    () => this.dropExpired(),
    PASSKEY_SIGN_IN_VALIDITY_MS,
  );

  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
    @Inject(AppConfig.KEY)
    private appConfig: ConfigType<typeof AppConfig>,
  ) {
    this.cleanupInterval.unref?.();
  }

  async list(userId: string) {
    return this.prisma.passkey.findMany({
      where: { userId },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async registrationOptions(userId: string, origin: string | undefined) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        passkeys: { select: { credentialId: true, transports: true } },
      },
    });
    if (!user) throw new ForbiddenException('User not found');
    const site = this.siteOf(origin);

    const options = await generateRegistrationOptions({
      rpName: AUTH_ISSUER,
      rpID: site.rpId,
      userName: user.email,
      userDisplayName: user.name,
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: user.passkeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports,
      })),
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });
    this.registrations.set(userId, {
      challenge: options.challenge,
      origin: site.origin,
      expiresAt: Date.now() + SECURITY_SETUP_VALIDITY_MS,
    });
    return options;
  }

  async register(
    userId: string,
    origin: string | undefined,
    response: RegistrationResponseJSON,
    name: string | undefined,
  ) {
    const pending = this.registrations.get(userId);
    this.registrations.delete(userId);
    const site = this.siteOf(origin);
    if (
      !pending ||
      Date.now() > pending.expiresAt ||
      pending.origin !== site.origin
    ) {
      throw new BadRequestException('Adding the passkey took too long');
    }

    let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: pending.challenge,
        expectedOrigin: site.origin,
        expectedRPID: site.rpId,
        requireUserVerification: false,
      });
    } catch {
      throw new BadRequestException('Couldn’t add that passkey');
    }
    if (!verification.verified)
      throw new BadRequestException('Couldn’t add that passkey');

    const { credential } = verification.registrationInfo;
    const passkey = await this.prisma.passkey.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: credential.transports ?? [],
        rpId: site.rpId,
        name: name?.trim().slice(0, PASSKEY_NAME_MAX_LENGTH) || 'Passkey',
      },
      select: { id: true, name: true, createdAt: true, lastUsedAt: true },
    });
    return passkey;
  }

  async remove(userId: string, id: string) {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          passwordSignIn: true,
          password: true,
          _count: { select: { oidcIdentities: true } },
        },
      });
      const count = await tx.passkey.count({ where: { userId } });
      const otherWayIn =
        (user?.password && user.passwordSignIn) ||
        !!user?._count.oidcIdentities;
      if (count <= 1 && !otherWayIn)
        throw new BadRequestException(
          'Turn password sign-in back on before removing your last passkey',
        );
      const { count: removed } = await tx.passkey.deleteMany({
        where: { id, userId },
      });
      if (removed === 0) throw new NotFoundException('Passkey not found');
    });
  }

  signInOptions(origin: string | undefined) {
    const site = this.siteOf(origin);
    return generateAuthenticationOptions({
      rpID: site.rpId,
      userVerification: 'preferred',
    }).then((options) => {
      if (this.signIns.size >= MAX_SIGN_IN_CHALLENGES) this.dropExpired();
      if (this.signIns.size >= MAX_SIGN_IN_CHALLENGES) {
        const oldest = this.signIns.keys().next().value;
        if (oldest !== undefined) this.signIns.delete(oldest);
      }
      const challengeId = crypto.randomBytes(16).toString('base64url');
      this.signIns.set(challengeId, {
        challenge: options.challenge,
        origin: site.origin,
        expiresAt: Date.now() + PASSKEY_SIGN_IN_VALIDITY_MS,
      });
      return { challengeId, options };
    });
  }

  async signIn(
    origin: string | undefined,
    challengeId: string,
    response: AuthenticationResponseJSON,
  ) {
    const pending = this.signIns.get(challengeId);
    this.signIns.delete(challengeId);
    const site = this.siteOf(origin);
    if (
      !pending ||
      Date.now() > pending.expiresAt ||
      pending.origin !== site.origin
    ) {
      throw new UnauthorizedException('Signing in took too long. Try again.');
    }

    const passkey = await this.prisma.passkey.findUnique({
      where: { credentialId: response.id },
      include: { user: true },
    });
    // The browser only offers passkeys of this host; one made on another
    // host of the same server doesn't sign in here.
    if (!passkey || passkey.rpId !== site.rpId) {
      throw new UnauthorizedException(
        'That passkey isn’t known here. It may have been removed.',
      );
    }

    let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: pending.challenge,
        expectedOrigin: site.origin,
        expectedRPID: site.rpId,
        credential: {
          id: passkey.credentialId,
          publicKey: new Uint8Array(passkey.publicKey),
          counter: Number(passkey.counter),
          transports: passkey.transports,
        },
        requireUserVerification: false,
      });
    } catch {
      throw new UnauthorizedException('Couldn’t sign in with that passkey');
    }
    if (!verification.verified)
      throw new UnauthorizedException('Couldn’t sign in with that passkey');

    const { user } = passkey;
    if (user.status === UserStatus.pending) {
      throw new UnauthorizedException(
        'Account pending approval. Please wait for an administrator to approve your account.',
      );
    }

    await this.prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    const tokens = await this.authService.createTokenPair(user.id, user.email);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profileImage,
        isAdmin: user.isAdmin,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        hasPassword: !!user.password,
      },
    };
  }

  /**
   * The page asking: the browser's Origin header, which a page can't set,
   * or else the app's own address. The host names the passkeys.
   */
  private siteOf(origin: string | undefined) {
    let url: URL;
    try {
      url = new URL(origin || this.appConfig.appUrl);
    } catch {
      throw new BadRequestException('Unknown origin');
    }
    return { origin: url.origin, rpId: url.hostname };
  }

  private dropExpired(): void {
    const now = Date.now();
    for (const map of [this.registrations, this.signIns]) {
      for (const [key, entry] of map) {
        if (now > entry.expiresAt) map.delete(key);
      }
    }
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }
}
