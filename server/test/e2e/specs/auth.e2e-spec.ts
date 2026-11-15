import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { REFRESH_TOKEN_REUSE_WINDOW_MS } from 'src/auth/constants/auth.constants';
import { Actor, bodyOf, createE2EApp, E2EApp } from '../support';

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

describe('auth token refresh', () => {
  let ctx: E2EApp;
  let user: Actor;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.resetDb();
    user = await ctx.registerUser();
  });

  const login = async (): Promise<TokenPair> => {
    const res = await request(ctx.http)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password-123' })
      .expect(200);
    return bodyOf<TokenPair>(res);
  };

  const refresh = (refreshToken: string) =>
    request(ctx.http)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

  it('hands out a new pair that works', async () => {
    const { refresh_token } = await login();

    const res = await refresh(refresh_token).expect(200);
    const next = bodyOf<TokenPair>(res);

    expect(next.refresh_token).not.toBe(refresh_token);
    await request(ctx.http)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${next.access_token}`)
      .expect(200);
    await refresh(next.refresh_token).expect(200);
  });

  it('accepts the old token again when the first reply was lost', async () => {
    const { refresh_token } = await login();
    await refresh(refresh_token).expect(200);

    const res = await refresh(refresh_token).expect(200);
    await refresh(bodyOf<TokenPair>(res).refresh_token).expect(200);

    const old = await ctx.prisma.refreshToken.findUniqueOrThrow({
      where: { token: refresh_token },
    });
    expect(old.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + REFRESH_TOKEN_REUSE_WINDOW_MS,
    );
  });

  it('rejects the old token after the reuse window', async () => {
    const { refresh_token } = await login();
    await refresh(refresh_token).expect(200);

    await ctx.prisma.refreshToken.update({
      where: { token: refresh_token },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await refresh(refresh_token).expect(401);
  });

  it('answers two refreshes with the same token at once', async () => {
    const { refresh_token } = await login();

    const [a, b] = await Promise.all([
      refresh(refresh_token),
      refresh(refresh_token),
    ]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });
});

describe('provider-only sign-in', () => {
  let ctx: E2EApp;
  let user: Actor;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.resetDb();
    user = await ctx.registerUser();
  });

  const setOidc = (settings: Record<string, string>) =>
    ctx.prisma.settings.createMany({
      data: Object.entries(settings).map(([key, value]) => ({ key, value })),
    });

  const providerOnly = {
    oidc_enabled: 'true',
    oidc_provider_name: 'Pocket ID',
    oidc_issuer_url: 'https://auth.e2e.test',
    oidc_client_id: 'anchor',
    oidc_disable_internal_auth: 'true',
  };

  const login = () =>
    request(ctx.http)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password-123' });

  it('refuses email and password sign-in and sign-up', async () => {
    await setOidc(providerOnly);

    const signIn = await login().expect(403);
    expect(bodyOf<{ message: string }>(signIn).message).toBe(
      'Email and password sign-in is turned off. Sign in with Pocket ID.',
    );
    await request(ctx.http)
      .post('/api/auth/register')
      .send({ email: 'new@e2e.test', password: 'password-123', name: 'New' })
      .expect(403);
    expect(await ctx.prisma.user.count()).toBe(1);

    const config = await request(ctx.http)
      .get('/api/auth/oidc/config')
      .expect(200);
    expect(bodyOf<{ disableInternalAuth: boolean }>(config)).toMatchObject({
      enabled: true,
      disableInternalAuth: true,
    });
  });

  it('gives the phone app its own client once an admin sets one', async () => {
    await setOidc(providerOnly);
    await ctx.prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
    });
    const phoneClient = async () =>
      bodyOf<{ clientId: string }>(
        await request(ctx.http).get('/api/auth/oidc/config').expect(200),
      ).clientId;

    expect(await phoneClient()).toBe('anchor');

    const saved = await user.http
      .patch('/api/admin/settings/oidc')
      .send({ mobileClientId: 'anchor-phone' })
      .expect(200);
    expect(
      bodyOf<{ clientId: string; mobileClientId: string }>(saved),
    ).toMatchObject({ clientId: 'anchor', mobileClientId: 'anchor-phone' });
    expect(await phoneClient()).toBe('anchor-phone');

    await user.http
      .patch('/api/admin/settings/oidc')
      .send({ mobileClientId: '' })
      .expect(200);
    expect(await phoneClient()).toBe('anchor');
  });

  it('keeps sessions that are already signed in', async () => {
    await setOidc(providerOnly);

    await user.http.get('/api/auth/me').expect(200);
  });

  it('shows a sign-in button for each provider an admin adds', async () => {
    await setOidc({ ...providerOnly, oidc_disable_internal_auth: 'false' });
    await ctx.prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true },
    });

    const added = await user.http
      .post('/api/admin/settings/oidc/providers')
      .send({
        id: 'work',
        name: 'Work Keycloak',
        issuerUrl: 'https://sso.e2e.test/realms/staff',
        clientId: 'anchor-plus',
        clientSecret: 'shh',
      })
      .expect(201);
    const [work] = bodyOf<{
      providers: {
        id: string;
        hasClientSecret: boolean;
        callbackUrl: string;
      }[];
    }>(added).providers;
    expect(work).toMatchObject({ id: 'work', hasClientSecret: true });
    expect(work.callbackUrl).toMatch(/\/api\/auth\/oidc\/callback\/work$/);
    await user.http
      .post('/api/admin/settings/oidc/providers')
      .send({
        id: 'work',
        issuerUrl: 'https://x.e2e.test',
        clientId: 'x',
      })
      .expect(409);

    const config = bodyOf<{
      providers: { id: string; name: string; clientId: string }[];
    }>(await request(ctx.http).get('/api/auth/oidc/config').expect(200));
    expect(config).toMatchObject({ enabled: true, providerName: 'Pocket ID' });
    expect(config.providers).toEqual([
      expect.objectContaining({ id: 'default', name: 'Pocket ID' }),
      expect.objectContaining({ id: 'work', clientId: 'anchor-plus' }),
    ]);
    // No secret reaches the sign-in page.
    expect(JSON.stringify(config)).not.toContain('shh');

    await request(ctx.http)
      .get('/api/auth/oidc/initiate?provider=nope')
      .expect(400);

    await user.http
      .patch('/api/admin/settings/oidc/providers/work')
      .send({ enabled: false })
      .expect(200);
    await user.http
      .delete('/api/admin/settings/oidc/providers/default')
      .expect(403);
    await user.http
      .delete('/api/admin/settings/oidc/providers/work')
      .expect(200);
    const after = bodyOf<{ providers: { id: string }[] }>(
      await request(ctx.http).get('/api/auth/oidc/config').expect(200),
    );
    expect(after.providers.map((p) => p.id)).toEqual(['default']);
  });

  it('keeps password sign-in while the provider is not set up', async () => {
    await setOidc({ ...providerOnly, oidc_issuer_url: '' });

    await login().expect(200);
    const config = await request(ctx.http)
      .get('/api/auth/oidc/config')
      .expect(200);
    expect(bodyOf<{ disableInternalAuth: boolean }>(config)).toMatchObject({
      enabled: false,
      disableInternalAuth: false,
    });
  });
});

describe('sign-up on a fresh server', () => {
  let ctx: E2EApp;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.resetDb();
    // Nothing chosen yet, as on a new install.
    await ctx.prisma.settings.deleteMany({ where: { key: 'user_signup' } });
  });

  const register = (email: string) =>
    request(ctx.http)
      .post('/api/auth/register')
      .send({ email, password: 'password-123', name: 'Someone' })
      .expect(201);

  it('lets the first account in as an active admin, then asks for approval', async () => {
    const mode = await request(ctx.http)
      .get('/api/auth/registration-mode')
      .expect(200);
    expect(bodyOf<{ mode: string }>(mode).mode).toBe('enabled');

    const admin = bodyOf<{
      access_token?: string;
      user: { isAdmin: boolean; status: string };
    }>(await register('admin@e2e.test'));
    expect(admin.user).toMatchObject({ isAdmin: true, status: 'active' });
    expect(admin.access_token).toBeTruthy();

    const next = bodyOf<{ access_token?: string; user: { status: string } }>(
      await register('next@e2e.test'),
    );
    expect(next.user.status).toBe('pending');
    expect(next.access_token).toBeUndefined();
  });
});
