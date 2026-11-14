import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Actor, createE2EApp, E2EApp } from '../support';

const KB = 1024;
const MB = 1024 * KB;

/** A PDF of about [bytes], to fill a quota with. */
const pdfOf = (bytes: number) =>
  Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.alloc(bytes - 15, 0x20),
    Buffer.from('\n%%EOF'),
  ]);

/**
 * A storage quota per account, for a hosted server: uploads count against
 * whoever uploaded them, and stop at the plan's limit or the admin's own for
 * the account. Without STORAGE_QUOTA_* (as here) the plans have no limit.
 */
describe('storage quota', () => {
  let ctx: E2EApp;
  let admin: Actor;
  let user: Actor;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await ctx.resetDb();
    admin = await ctx.registerUser('Admin');
    await ctx.prisma.user.update({
      where: { id: admin.id },
      data: { isAdmin: true },
    });
    user = await ctx.registerUser('Sam');
  });

  const setQuota = (body: Record<string, unknown>) =>
    admin.http.patch(`/api/admin/users/${user.id}`).send(body).expect(200);

  const upload = (noteId: string, bytes: number) =>
    user.attachments.uploadRequest(
      noteId,
      'scan.pdf',
      pdfOf(bytes),
      'application/pdf',
    );

  it('shows usage with no limit on a server without quotas', async () => {
    const note = await user.notes.create({ title: 'papers' });
    await upload(note.id, 300 * KB).expect(201);

    const res = await user.http.get('/api/users/me/storage').expect(200);
    expect(res.body).toEqual({
      plan: 'free',
      usedBytes: 300 * KB,
      limitBytes: null,
    });
  });

  it("stops uploads at the admin's limit for the account", async () => {
    await setQuota({ storageQuotaMb: 1 });
    const note = await user.notes.create({ title: 'papers' });

    await upload(note.id, 600 * KB).expect(201);
    const refused = await upload(note.id, 600 * KB).expect(413);
    expect(refused.body).toMatchObject({
      code: 'STORAGE_QUOTA_EXCEEDED',
      usedBytes: 600 * KB,
      limitBytes: 1 * MB,
    });
    expect(await user.attachments.list(note.id)).toHaveLength(1);

    // Another account's uploads don't count.
    const other = await admin.notes.create({ title: 'mine' });
    await admin.attachments
      .uploadRequest(other.id, 'big.pdf', pdfOf(900 * KB), 'application/pdf')
      .expect(201);
    expect(
      (await user.http.get('/api/users/me/storage').expect(200)).body,
    ).toMatchObject({ usedBytes: 600 * KB });
  });

  it('refuses a copy of a note that would go past the limit', async () => {
    const note = await user.notes.create({ title: 'papers' });
    await upload(note.id, 600 * KB).expect(201);
    await setQuota({ storageQuotaMb: 1 });

    await user.http.post(`/api/notes/${note.id}/copy`).expect(413);
  });

  it('frees room once a note is deleted for good', async () => {
    await setQuota({ storageQuotaMb: 1 });
    const note = await user.notes.create({ title: 'papers' });
    await upload(note.id, 900 * KB).expect(201);

    await ctx.prisma.note.update({
      where: { id: note.id },
      data: { state: 'deleted' },
    });
    const next = await user.notes.create({ title: 'more' });
    await upload(next.id, 900 * KB).expect(201);
  });

  it('lets the admin set the plan and lists usage per account', async () => {
    const changed = await setQuota({ plan: 'plus', storageQuotaMb: 50 });
    expect(changed.body).toMatchObject({ plan: 'plus', storageQuotaMb: 50 });

    const list = await admin.http.get('/api/admin/users').expect(200);
    const sam = (
      list.body as {
        users: { id: string; plan: string; storage: unknown }[];
      }
    ).users.find((u) => u.id === user.id);
    expect(sam).toMatchObject({
      plan: 'plus',
      storageQuotaMb: 50,
      storage: { usedBytes: 0, limitBytes: 50 * MB },
    });

    // Back to the plan's limit (none on this server).
    await setQuota({ storageQuotaMb: null });
    expect(
      (await user.http.get('/api/users/me/storage').expect(200)).body,
    ).toEqual({ plan: 'plus', usedBytes: 0, limitBytes: null });
  });

  it("saves a member's plan from the edit dialog with one admin", async () => {
    // The dialog sends the whole form, isAdmin: false included.
    await setQuota({
      name: 'Sam',
      isAdmin: false,
      plan: 'plus',
      storageQuotaMb: null,
    });

    expect(
      (await user.http.get('/api/users/me/storage').expect(200)).body,
    ).toMatchObject({ plan: 'plus' });
  });

  it('keeps plans to admins', async () => {
    await user.http
      .patch(`/api/admin/users/${user.id}`)
      .send({ plan: 'plus' })
      .expect(403);
  });
});
