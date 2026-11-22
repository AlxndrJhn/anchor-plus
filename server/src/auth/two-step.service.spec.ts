import { beforeEach, describe, expect, it } from 'vitest';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { TwoStepService, TWO_STEP_REQUIRED } from './two-step.service';
import { PrismaService } from '../prisma/prisma.service';
import { totpCode } from './utils/totp';
import { SecretBox } from './utils/secret-box';

describe('TwoStepService', () => {
  interface Row {
    email: string;
    totpSecret: string | null;
    totpLastStep: number | null;
    totpRecoveryCodes: string[];
  }
  let row: Row;
  let service: TwoStepService;

  const step = () => Math.floor(Date.now() / 30_000);

  beforeEach(() => {
    row = {
      email: 'a@example.com',
      totpSecret: null,
      totpLastStep: null,
      totpRecoveryCodes: [],
    };
    const prisma = {
      user: {
        findUnique: () => Promise.resolve({ ...row }),
        findMany: () =>
          Promise.resolve(
            row.totpSecret && !row.totpSecret.startsWith('v1:')
              ? [{ id: 'u1', totpSecret: row.totpSecret }]
              : [],
          ),
        update: ({ data }: { data: Partial<Row> }) => {
          Object.assign(row, data);
          return Promise.resolve(row);
        },
        updateMany: ({
          where,
          data,
        }: {
          where: {
            OR?: unknown;
            totpSecret?: string;
            totpRecoveryCodes?: { has: string };
          };
          data: Partial<Row>;
        }) => {
          const fits = where.totpSecret
            ? row.totpSecret === where.totpSecret
            : where.totpRecoveryCodes
              ? row.totpRecoveryCodes.includes(where.totpRecoveryCodes.has)
              : row.totpLastStep === null ||
                row.totpLastStep < (data.totpLastStep ?? 0);
          if (fits) Object.assign(row, data);
          return Promise.resolve({ count: fits ? 1 : 0 });
        },
      },
    };
    service = new TwoStepService(prisma as unknown as PrismaService, {
      jwtSecret: 'a-sufficiently-long-secret',
    });
  });

  const turnOn = async () => {
    const { secret } = await service.start('u1');
    const { recoveryCodes } = await service.enable(
      'u1',
      totpCode(secret, step()),
    );
    return { secret, recoveryCodes };
  };

  it('turns on with a right code from the scanned secret', async () => {
    const { secret, uri } = await service.start('u1');
    expect(uri).toContain(`secret=${secret}`);
    await expect(service.enable('u1', '000000')).rejects.toThrow(
      ForbiddenException,
    );
    const { recoveryCodes } = await service.enable(
      'u1',
      totpCode(secret, step()),
    );
    expect(recoveryCodes).toHaveLength(10);
    // Stored sealed, not as the key itself.
    expect(row.totpSecret).toMatch(/^v1:/);
    expect(row.totpSecret).not.toContain(secret);
    expect(row.totpRecoveryCodes).not.toContain(recoveryCodes[0]);
  });

  it('lets sign-in through while two-step is off', async () => {
    await expect(service.checkSignIn('u1', undefined)).resolves.toBeUndefined();
  });

  it('asks for a code, and takes a fresh one once', async () => {
    const { secret } = await turnOn();
    await expect(service.checkSignIn('u1', undefined)).rejects.toMatchObject({
      response: { error: TWO_STEP_REQUIRED },
    });
    // The setup used the current step; the next one is fresh.
    const next = totpCode(secret, step() + 1);
    await expect(service.checkSignIn('u1', next)).resolves.toBeUndefined();
    await expect(service.checkSignIn('u1', next)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('takes each recovery code once, however it is typed', async () => {
    const { recoveryCodes } = await turnOn();
    const [code] = recoveryCodes;
    await expect(
      service.checkSignIn('u1', ` ${code.toUpperCase().replace('-', '')} `),
    ).resolves.toBeUndefined();
    await expect(service.checkSignIn('u1', code)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(row.totpRecoveryCodes).toHaveLength(9);
  });

  it('seals a key stored before sealing, which keeps working', async () => {
    const { secret } = await turnOn();
    row.totpSecret = secret; // as stored by an older version
    row.totpLastStep = null;
    await service.onModuleInit();
    expect(row.totpSecret).toMatch(/^v1:/);
    await expect(
      service.checkSignIn('u1', totpCode(secret, step())),
    ).resolves.toBeUndefined();
  });

  it('takes only recovery codes once the key can no longer be opened', async () => {
    const { secret, recoveryCodes } = await turnOn();
    row.totpSecret = new SecretBox('another-long-secret', 'totp').seal(secret);
    await expect(
      service.checkSignIn('u1', totpCode(secret, step() + 1)),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      service.checkSignIn('u1', recoveryCodes[0]),
    ).resolves.toBeUndefined();
  });

  it('turns off with a recovery code', async () => {
    const { recoveryCodes } = await turnOn();
    await service.disable('u1', recoveryCodes[1]);
    expect(row.totpSecret).toBeNull();
    expect(row.totpRecoveryCodes).toEqual([]);
  });
});
