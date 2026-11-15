import * as fs from 'fs';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { Client } from 'pg';

const MIGRATIONS = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'prisma',
  'migrations',
);
const MIGRATION = '20261114180000_oidc_identities';
const DATABASE = 'e2e_oidc_identities';

/**
 * The migration to one link per provider, run on a database of its own with
 * the migrations before it, then on accounts linked the old way.
 */
describe('oidc_identities migration', () => {
  let admin: Client;
  let db: Client;

  const run = async (name: string) =>
    db.query(
      fs.readFileSync(path.join(MIGRATIONS, name, 'migration.sql'), 'utf8'),
    );

  beforeAll(async () => {
    admin = new Client({ connectionString: inject('databaseUrl') });
    await admin.connect();
    await admin.query(`DROP DATABASE IF EXISTS ${DATABASE}`);
    await admin.query(`CREATE DATABASE ${DATABASE}`);
    const url = new URL(inject('databaseUrl'));
    url.pathname = `/${DATABASE}`;
    db = new Client({ connectionString: url.toString() });
    await db.connect();

    const before = fs
      .readdirSync(MIGRATIONS)
      .filter((name) =>
        fs.existsSync(path.join(MIGRATIONS, name, 'migration.sql')),
      )
      .sort()
      .filter((name) => name < MIGRATION);
    for (const name of before) await run(name);
  });

  afterAll(async () => {
    await db.end();
    await admin.query(`DROP DATABASE IF EXISTS ${DATABASE}`);
    await admin.end();
  });

  it('moves each linked account to a link the first provider claims', async () => {
    await db.query(
      `INSERT INTO "User" (id, email, password, name, "oidcSubject", "updatedAt")
       VALUES ('linked', 'linked@example.com', NULL, 'Linked', 'sub-1', now()),
              ('both', 'both@example.com', 'hash', 'Both', 'sub-2', now()),
              ('password', 'password@example.com', 'hash', 'Password', NULL, now())`,
    );

    await run(MIGRATION);

    const { rows } = await db.query<{
      userId: string;
      issuer: string;
      subject: string;
    }>(`SELECT "userId", issuer, subject FROM "OidcIdentity" ORDER BY subject`);
    expect(rows).toEqual([
      { userId: 'linked', issuer: '', subject: 'sub-1' },
      { userId: 'both', issuer: '', subject: 'sub-2' },
    ]);

    const { rows: columns } = await db.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'User'`,
    );
    expect(columns.map((c) => c.column_name)).not.toContain('oidcSubject');
  });

  it('keeps one link per provider account, and drops them with the user', async () => {
    await expect(
      db.query(
        `INSERT INTO "OidcIdentity" (id, "userId", issuer, subject)
         VALUES ('dup', 'password', '', 'sub-1')`,
      ),
    ).rejects.toThrow(/OidcIdentity_issuer_subject_key/);

    await db.query(
      `INSERT INTO "OidcIdentity" (id, "userId", issuer, subject)
       VALUES ('other-issuer', 'password', 'https://sso.example.org', 'sub-1')`,
    );
    await db.query(`DELETE FROM "User" WHERE id = 'linked'`);
    const { rows } = await db.query<{ id: string }>(
      `SELECT id FROM "OidcIdentity" WHERE "userId" = 'linked'`,
    );
    expect(rows).toEqual([]);
  });
});
