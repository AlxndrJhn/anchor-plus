import {
  Inject,
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { OidcConfigService } from './oidc/oidc-config.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserStatus } from '../generated/prisma/enums';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { generateApiToken } from './utils/generate-api-token';
import { TwoStepService } from './two-step.service';
import { SecondFactorService } from './second-factor.service';
import {
  PROFILE_IMAGE_EXTENSIONS,
  storedProfileImageFile,
} from './utils/profile-image.util';
import { deleteFileIfExists } from '../common/utils/file-system.util';
import { normalizeEmail, sameEmail } from '../common/utils/email.util';
import { AttemptLimiter } from '../common/utils/attempt-limiter';
import { StorageConfig } from '../config/configuration';
import { PUBLIC_PROFILES_PREFIX } from '../config/storage.constants';
import {
  API_TOKEN_MAX_GENERATION_RETRIES,
  BCRYPT_SALT_ROUNDS,
  FAILED_GUESS_WINDOW_MS,
  MAX_FAILED_GUESSES,
  REFRESH_TOKEN_BYTES,
  REFRESH_TOKEN_REUSE_WINDOW_MS,
  REFRESH_TOKEN_VALIDITY_DAYS,
} from './constants/auth.constants';
import { currentUserAgent } from '../common/utils/request-context';
import { describeDevice, trimUserAgent } from './utils/device-label.util';
import type { OidcSessionLink } from './oidc/oidc.types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly failedLogins = new AttemptLimiter(
    MAX_FAILED_GUESSES,
    FAILED_GUESS_WINDOW_MS,
  );

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private settingsService: SettingsService,
    private oidcConfigService: OidcConfigService,
    private twoStepService: TwoStepService,
    private secondFactorService: SecondFactorService,
    @Inject(StorageConfig.KEY)
    private storageConfig: ConfigType<typeof StorageConfig>,
  ) {}

  /** Sign-up is open to the very first account, which becomes the admin. */
  async getRegistrationMode() {
    if ((await this.prisma.user.count()) === 0) return { mode: 'enabled' };
    return {
      mode: await this.settingsService.getRegistrationMode(),
    };
  }

  async register(registerDto: RegisterDto) {
    const oidc = await this.oidcConfigService.getPublicConfig();
    if (oidc.disableInternalAuth) {
      throw new ForbiddenException(
        `Email and password sign-up is turned off. Sign up with ${oidc.providerName}.`,
      );
    }

    const registrationMode = await this.settingsService.getRegistrationMode();
    // Let in the very first account, the admin's, whatever the mode: there's
    // no one yet to approve it.
    const isFirstUser = (await this.prisma.user.count()) === 0;

    if (registrationMode === 'disabled' && !isFirstUser) {
      throw new ForbiddenException('Registration is disabled');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: sameEmail(registerDto.email) },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      BCRYPT_SALT_ROUNDS,
    );

    // Check if this is the first user (no admins exist)
    const adminCount = await this.prisma.user.count({
      where: { isAdmin: true },
    });

    // Determine user status based on registration mode
    const userStatus =
      registrationMode === 'review' && !isFirstUser
        ? UserStatus.pending
        : UserStatus.active;

    const user = await this.prisma.user.create({
      data: {
        email: normalizeEmail(registerDto.email),
        password: hashedPassword,
        name: registerDto.name,
        isAdmin: adminCount === 0, // First user becomes admin
        status: userStatus,
      },
      select: {
        id: true,
        email: true,
        name: true,
        profileImage: true,
        isAdmin: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Only return token if user is active (not pending)
    if (user.status === UserStatus.active) {
      const tokens = await this.createTokenPair(user.id, user.email);
      return {
        ...tokens,
        user,
      };
    }

    // Return without token for pending users
    return {
      user,
      message: 'Registration successful. Your account is pending approval.',
    };
  }

  async login(loginDto: LoginDto) {
    const oidc = await this.oidcConfigService.getPublicConfig();
    if (oidc.disableInternalAuth) {
      throw new ForbiddenException(
        `Email and password sign-in is turned off. Sign in with ${oidc.providerName}.`,
      );
    }

    const attemptKey = normalizeEmail(loginDto.email);
    this.failedLogins.check(attemptKey);

    // Accounts made before emails were matched without case may differ in
    // case only; the one typed exactly comes first.
    const candidates = await this.prisma.user.findMany({
      where: { email: sameEmail(loginDto.email) },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        profileImage: true,
        isAdmin: true,
        status: true,
        passwordSignIn: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    candidates.sort(
      (a, b) =>
        Number(b.email === loginDto.email) - Number(a.email === loginDto.email),
    );

    if (candidates.length === 0) {
      this.failedLogins.fail(attemptKey);
      throw new UnauthorizedException('Invalid credentials');
    }

    // OIDC users don't have passwords - they must use OIDC login
    if (candidates.every((candidate) => !candidate.password)) {
      throw new UnauthorizedException(
        'This account uses OIDC authentication. Please use the OIDC login option.',
      );
    }

    let user: (typeof candidates)[number] | undefined;
    for (const candidate of candidates) {
      if (
        candidate.password &&
        (await bcrypt.compare(loginDto.password, candidate.password))
      ) {
        user = candidate;
        break;
      }
    }

    if (!user) {
      this.failedLogins.fail(attemptKey);
      throw new UnauthorizedException('Invalid credentials');
    }
    this.failedLogins.succeed(attemptKey);

    // Check if user is pending approval
    if (user.status === UserStatus.pending) {
      throw new ForbiddenException(
        'Account pending approval. Please wait for an administrator to approve your account.',
      );
    }

    // Told only to whoever knows the password.
    if (!user.passwordSignIn) {
      throw new ForbiddenException(
        'Password sign-in is turned off for this account. Sign in with a passkey.',
      );
    }
    await this.twoStepService.checkSignIn(user.id, loginDto.code);
    await this.secondFactorService.checkPasswordSignIn(user.id);

    // Remove password from user object
    const { password, passwordSignIn, ...userWithoutPassword } = user;

    const tokens = await this.createTokenPair(user.id, user.email);
    return {
      ...tokens,
      user: {
        ...userWithoutPassword,
        hasPassword: true,
        secondFactor: await this.secondFactorService.getStatus(user.id),
      },
    };
  }

  async getMe<T extends { id: string }>(user: T) {
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });
    return {
      ...user,
      hasPassword: !!row?.password,
      secondFactor: await this.secondFactorService.getStatus(user.id),
    };
  }

  /** How this person signs in, for Settings. */
  async getSecurity(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        password: true,
        passwordSignIn: true,
        totpSecret: true,
        totpRecoveryCodes: true,
        oidcSubject: true,
        passkeys: {
          select: { id: true, name: true, createdAt: true, lastUsedAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!user) throw new ForbiddenException('User not found');
    return {
      hasPassword: !!user.password,
      passwordSignIn: user.passwordSignIn,
      twoStep: !!user.totpSecret,
      recoveryCodesLeft: user.totpRecoveryCodes.length,
      providerLinked: !!user.oidcSubject,
      passkeys: user.passkeys,
      secondFactor: await this.secondFactorService.getStatus(userId),
    };
  }

  /** Off only while a passkey can still sign this person in. */
  async setPasswordSignIn(userId: string, enabled: boolean) {
    if (!enabled) {
      const passkeys = await this.prisma.passkey.count({ where: { userId } });
      if (passkeys === 0)
        throw new BadRequestException(
          'Add a passkey before turning password sign-in off',
        );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordSignIn: enabled },
    });
    return this.getSecurity(userId);
  }

  async refreshTokens(refreshToken: string) {
    // Find the refresh token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token has expired
    if (storedToken.expiresAt < new Date()) {
      // deleteMany: a concurrent refresh may have already consumed the row.
      await this.prisma.refreshToken.deleteMany({
        where: { id: storedToken.id },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Check if user is still active
    if (storedToken.user.status === UserStatus.pending) {
      throw new UnauthorizedException('Account pending approval');
    }

    // Generate new token pair
    const tokens = await this.createTokenPair(
      storedToken.user.id,
      storedToken.user.email,
      storedToken,
    );

    // Keep the old token working for the reuse window.
    const reuseUntil = new Date(Date.now() + REFRESH_TOKEN_REUSE_WINDOW_MS);
    await this.prisma.refreshToken.updateMany({
      where: { id: storedToken.id, expiresAt: { gt: reuseUntil } },
      data: { expiresAt: reuseUntil },
    });

    return tokens;
  }

  async revokeRefreshToken(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    try {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } catch {
      // Silently ignore - don't leak whether token existed
    }
  }

  async revokeOtherRefreshTokens(
    userId: string,
    keepRefreshToken: string,
  ): Promise<void> {
    const kept = await this.prisma.refreshToken.findUnique({
      where: { token: keepRefreshToken },
    });
    await this.prisma.refreshToken.deleteMany({
      where:
        kept?.userId === userId
          ? { userId, sessionId: { not: kept.sessionId } }
          : { userId, token: { not: keepRefreshToken } },
    });
  }

  /** The devices signed in as this person, the one asking first. */
  async listSessions(userId: string, currentRefreshToken?: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    const currentSessionId = tokens.find(
      (t) => currentRefreshToken && t.token === currentRefreshToken,
    )?.sessionId;
    // Newest first, so a session's first token is its latest refresh.
    const sessions = new Map<string, (typeof tokens)[number]>();
    for (const token of tokens) {
      if (!sessions.has(token.sessionId)) sessions.set(token.sessionId, token);
    }
    return [...sessions.values()]
      .map((t) => ({
        id: t.sessionId,
        device: describeDevice(t.userAgent),
        signedInAt: t.signedInAt,
        lastActiveAt: t.createdAt,
        current: t.sessionId === currentSessionId,
      }))
      .sort((a, b) => Number(b.current) - Number(a.current));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { userId, sessionId },
    });
    if (count === 0) throw new NotFoundException('Session not found');
  }

  async getApiToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true, apiToken: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.status !== UserStatus.active) {
      throw new ForbiddenException('Account pending approval');
    }

    return { apiToken: user.apiToken };
  }

  async revokeApiToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.status !== UserStatus.active) {
      throw new ForbiddenException('Account pending approval');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { apiToken: null },
    });

    return { apiToken: null };
  }

  async regenerateApiToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (user.status !== UserStatus.active) {
      throw new ForbiddenException('Account pending approval');
    }

    const apiToken = await this.generateUniqueApiToken();
    await this.prisma.user.update({
      where: { id: userId },
      data: { apiToken },
    });

    return { apiToken };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // OIDC users don't have passwords
    if (!user.password) {
      throw new BadRequestException(
        'Password change is not available for OIDC-authenticated users. Please change your password through your identity provider.',
      );
    }

    // Verify current password
    this.failedLogins.check(`user:${userId}`);
    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      this.failedLogins.fail(`user:${userId}`);
      throw new ForbiddenException('Current password is incorrect');
    }
    this.failedLogins.succeed(`user:${userId}`);

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(
      changePasswordDto.newPassword,
      user.password,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      BCRYPT_SALT_ROUNDS,
    );

    // Whoever knew the old password is signed out everywhere else.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      }),
      this.prisma.refreshToken.deleteMany({
        where: {
          userId,
          ...(changePasswordDto.refreshToken
            ? { token: { not: changePasswordDto.refreshToken } }
            : {}),
        },
      }),
    ]);

    return { message: 'Password changed successfully' };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { name: updateProfileDto.name },
        select: {
          id: true,
          email: true,
          name: true,
          profileImage: true,
          isAdmin: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    } catch {
      throw new BadRequestException(
        'Failed to update profile. Please try again.',
      );
    }
  }

  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, profileImage: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const uploadsDir = this.storageConfig.profilesDir;
    await fs.mkdir(uploadsDir, { recursive: true });

    // File validation is handled at controller level with ParseFilePipe.
    // The extension comes from the checked type, never the uploaded name, so
    // the file is always served as an image.
    const ext = PROFILE_IMAGE_EXTENSIONS[file.mimetype];
    if (!ext) {
      throw new BadRequestException('Profile image must be JPEG, PNG or WebP');
    }
    const timestamp = Date.now();
    const filename = `${userId}-${timestamp}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    const imagePath = `${PUBLIC_PROFILES_PREFIX}/${filename}`;

    const oldImagePath: string | null = user.profileImage || null;
    let fileSaved = false;

    try {
      // Save new file first
      await fs.writeFile(filePath, file.buffer);
      fileSaved = true;

      // Update database with new image path
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { profileImage: imagePath },
        select: {
          id: true,
          email: true,
          name: true,
          profileImage: true,
          isAdmin: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Delete old image only after successful database update
      if (oldImagePath && oldImagePath !== imagePath) {
        await this.deleteProfileImage(oldImagePath);
      }

      return updatedUser;
    } catch {
      // If database update fails, delete the newly uploaded file
      if (fileSaved) {
        await deleteFileIfExists(filePath, this.logger);
      }
      throw new BadRequestException(
        'Failed to upload profile image. Please try again.',
      );
    }
  }

  async removeProfileImage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, profileImage: true },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const oldImagePath: string | null = user.profileImage || null;

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { profileImage: null },
        select: {
          id: true,
          email: true,
          name: true,
          profileImage: true,
          isAdmin: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Delete old image only after successful database update
      if (oldImagePath) {
        await this.deleteProfileImage(oldImagePath);
      }

      return updatedUser;
    } catch {
      throw new BadRequestException(
        'Failed to remove profile image. Please try again.',
      );
    }
  }

  private async deleteProfileImage(profileImagePath: string): Promise<void> {
    const fullPath = storedProfileImageFile(
      this.storageConfig.profilesDir,
      profileImagePath,
    );
    if (!fullPath) return;
    await deleteFileIfExists(fullPath, this.logger);
  }

  // Generate a secure random refresh token
  private generateRefreshTokenString(): string {
    return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
  }

  private async generateUniqueApiToken(): Promise<string> {
    // Retry a few times to avoid edge-case collisions on the unique column.
    for (let i = 0; i < API_TOKEN_MAX_GENERATION_RETRIES; i++) {
      const candidate = generateApiToken();
      const existingUser = await this.prisma.user.findUnique({
        where: { apiToken: candidate },
        select: { id: true },
      });

      if (!existingUser) {
        return candidate;
      }
    }

    throw new BadRequestException(
      'Failed to generate API token. Please try again.',
    );
  }

  /**
   * Create access and refresh token pair for a user.
   * Used by login, register, and OIDC flows.
   */
  /** Signs a device in, or carries [session] on to its next token. */
  async createTokenPair(
    userId: string,
    email: string,
    session?: {
      sessionId: string;
      signedInAt: Date;
      userAgent: string | null;
    } & Partial<OidcSessionLink>,
    oidc?: OidcSessionLink,
  ) {
    // A refresh carries the provider's session over from the token it replaces.
    const link = oidc ?? (session?.viaOidc ? session : undefined);
    const payload = { email, sub: userId };

    // Generate access token (short-lived)
    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token (long-lived)
    const refreshTokenString = this.generateRefreshTokenString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_VALIDITY_DAYS);

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenString,
        userId,
        expiresAt,
        ...(session && {
          sessionId: session.sessionId,
          signedInAt: session.signedInAt,
        }),
        userAgent: trimUserAgent(currentUserAgent()) ?? session?.userAgent,
        ...(link && {
          viaOidc: true,
          oidcSid: link.oidcSid ?? null,
          oidcIdToken: link.oidcIdToken ?? null,
        }),
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshTokenString,
    };
  }
}
