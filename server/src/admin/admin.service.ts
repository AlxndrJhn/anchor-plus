import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { OidcConfigService } from '../auth/oidc/oidc-config.service';
import {
  SECOND_FACTOR_GRACE_DAYS,
  SecondFactorService,
} from '../auth/second-factor.service';
import { OidcClientService } from '../auth/oidc/oidc-client.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { NoteState } from 'src/generated/prisma/enums';
import { UserStatus } from 'src/generated/prisma/enums';
import type { Prisma } from 'src/generated/prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { BCRYPT_SALT_ROUNDS } from '../auth/constants/auth.constants';
import { normalizeEmail, sameEmail } from '../common/utils/email.util';
import { StorageQuotaService } from '../storage-quota/storage-quota.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private oidcConfigService: OidcConfigService,
    private secondFactorService: SecondFactorService,
    private oidcClientService: OidcClientService,
    private storageQuota: StorageQuotaService,
  ) {}

  async getStats() {
    const [totalUsers, totalNotes, totalTags] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.note.count({
        where: {
          state: { not: NoteState.deleted },
        },
      }),
      this.prisma.tag.count({
        where: {
          isDeleted: false,
        },
      }),
    ]);

    return {
      totalUsers,
      totalNotes,
      totalTags,
    };
  }

  async getRegistrationSettings() {
    return this.settingsService.getRegistrationSettings();
  }

  async updateRegistrationMode(mode: 'disabled' | 'enabled' | 'review') {
    await this.settingsService.setRegistrationMode(mode);
    return this.settingsService.getRegistrationSettings();
  }

  async findUsers(
    skip = 0,
    take = 50,
    filter: { q?: string; status?: UserStatus } = {},
  ) {
    const where: Prisma.UserWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.q
        ? {
            OR: [
              { name: { contains: filter.q, mode: 'insensitive' } },
              { email: { contains: filter.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          profileImage: true,
          isAdmin: true,
          status: true,
          plan: true,
          storageQuotaMb: true,
          oidcSubject: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              notes: {
                where: {
                  state: { not: NoteState.deleted },
                },
              },
              tags: { where: { isDeleted: false } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const usedBytes = await this.storageQuota.usedBytesByUser(
      users.map((user) => user.id),
    );
    const usersWithAuthMethod = users.map(({ oidcSubject, ...rest }) => {
      const limitMb = this.storageQuota.limitMb(rest.plan, rest.storageQuotaMb);
      return {
        ...rest,
        authMethod: oidcSubject ? ('oidc' as const) : ('local' as const),
        storage: {
          usedBytes: usedBytes.get(rest.id) ?? 0,
          limitBytes: limitMb === null ? null : limitMb * 1024 * 1024,
        },
      };
    });

    return {
      users: usersWithAuthMethod,
      total,
      skip,
      take,
    };
  }

  async getPendingUsers() {
    const users = await this.prisma.user.findMany({
      where: { status: UserStatus.pending },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        profileImage: true,
        isAdmin: true,
        status: true,
        oidcSubject: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const usersWithAuthMethod = users.map(({ oidcSubject, ...rest }) => ({
      ...rest,
      authMethod: oidcSubject ? ('oidc' as const) : ('local' as const),
    }));

    return usersWithAuthMethod;
  }

  async createUser(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: sameEmail(createUserDto.email) },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      BCRYPT_SALT_ROUNDS,
    );

    const user = await this.prisma.user.create({
      data: {
        email: normalizeEmail(createUserDto.email),
        password: hashedPassword,
        name: createUserDto.name,
        isAdmin: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: sameEmail(updateUserDto.email), id: { not: id } },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Demotion safety: cannot remove admin status from current user or the
    // last admin. Saving a member as a member demotes nobody.
    if (updateUserDto.isAdmin === false && user.isAdmin) {
      if (id === currentUserId) {
        throw new BadRequestException('Cannot change your own admin status');
      }
      const adminCount = await this.prisma.user.count({
        where: { isAdmin: true },
      });
      if (adminCount === 1) {
        throw new BadRequestException(
          'Cannot remove admin status from the last admin user',
        );
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (updateUserDto.email !== undefined)
      data.email = normalizeEmail(updateUserDto.email);
    if (updateUserDto.name !== undefined) data.name = updateUserDto.name;
    if (updateUserDto.isAdmin !== undefined)
      data.isAdmin = updateUserDto.isAdmin;
    if (updateUserDto.plan !== undefined) data.plan = updateUserDto.plan;
    if (updateUserDto.storageQuotaMb !== undefined)
      data.storageQuotaMb = updateUserDto.storageQuotaMb;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        plan: true,
        storageQuotaMb: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isAdmin) {
      // Check if this is the last admin
      const adminCount = await this.prisma.user.count({
        where: { isAdmin: true },
      });

      if (adminCount === 1) {
        throw new BadRequestException('Cannot delete the last admin user');
      }
    }

    // Delete user - notes and tags will be cascade deleted by database constraint
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  async resetPassword(id: string, newPassword?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate secure random password if not provided
    const password =
      newPassword ||
      crypto
        .randomBytes(12)
        .toString('base64')
        .replace(/[+/=]/g, '')
        .slice(0, 16);

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Return the new password (only if it was auto-generated)
    return {
      newPassword: newPassword ? undefined : password,
      message: newPassword
        ? 'Password reset successfully'
        : 'Password reset successfully. New password generated.',
    };
  }

  async approveUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.pending) {
      throw new BadRequestException('User is not pending approval');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.active },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async rejectUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.pending) {
      throw new BadRequestException('User is not pending approval');
    }

    // Delete the user
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User rejected and deleted successfully' };
  }

  async getOidcSettings() {
    return this.oidcConfigService.getOidcSettings();
  }

  async updateOidcSettings(settings: {
    enabled?: boolean;
    providerName?: string;
    issuerUrl?: string;
    clientId?: string;
    clientSecret?: string;
    clearClientSecret?: boolean;
    mobileClientId?: string;
    disableInternalAuth?: boolean;
  }) {
    const { clearClientSecret, ...rest } = settings;
    const toSet = { ...rest };
    if (clearClientSecret) {
      toSet.clientSecret = '';
    }
    await this.oidcConfigService.setOidcSettings(toSet);
    return this.oidcConfigService.getOidcSettings();
  }

  /** The sign-in rule, and who still signs in with a password alone. */
  async getSecondFactorSettings() {
    const [policy, passwordOnly] = await Promise.all([
      this.secondFactorService.getPolicy(),
      this.secondFactorService.listPasswordOnly(),
    ]);
    return {
      required: policy.required,
      since: policy.since?.toISOString() ?? null,
      deadline: policy.deadline?.toISOString() ?? null,
      graceDays: SECOND_FACTOR_GRACE_DAYS,
      passwordOnly,
    };
  }

  async setSecondFactorRequired(required: boolean) {
    await this.secondFactorService.setRequired(required);
    return this.getSecondFactorSettings();
  }

  testOidcIssuer(issuerUrl: string) {
    return this.oidcClientService.testIssuer(issuerUrl);
  }
}
