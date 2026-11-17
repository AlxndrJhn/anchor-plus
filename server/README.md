# Anchor Server

Nest.js backend for Anchor application.

## Prerequisites

- Node.js
- Docker & Docker Compose

## Setup

1.  Install dependencies:

    ```bash
    pnpm install
    ```

2.  Set up environment variables:
    Copy `.env.example` to `.env` (if it exists) or ensure `.env` has:

    ```env
    PORT=3001
    DATABASE_URL="postgresql://anchor:password@localhost:5432/anchor?schema=public"
    JWT_SECRET="anchor-local-development-secret"
    ```

    Environment variables are validated at startup (see `src/config/`), so the
    app fails fast with a clear message if a required value is missing or
    invalid. `DATABASE_URL` and `JWT_SECRET` are required; `JWT_SECRET` must be
    at least 16 characters. Optional: `APP_URL`, `DATA_DIR` (uploads root,
    defaults to `/data`), `CORS_ORIGINS` (comma-separated allowlist), `WEB_DIR`
    (the web app's static build, `../web/out`, to serve on the same port; unset
    serves only the API).

3.  Start Database:
    From the project root:

    ```bash
    docker compose -f ../docker-compose.dev.yml up -d db
    ```

4.  Generate Prisma Client:

    ```bash
    pnpm exec prisma generate
    ```

5.  Run Migrations:
    ```bash
    pnpm exec prisma migrate dev
    ```

## Running the app

```bash
# development
pnpm run start

# watch mode
pnpm run start:dev

# production mode
pnpm run start:prod
```

## Linting & Formatting

This project uses ESLint (type-aware) + Prettier.

```bash
pnpm check        # ESLint + Prettier, read-only
pnpm check:fix    # ESLint --fix + Prettier --write
```

## Test

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e
```

Unit specs are co-located with the code as `*.spec.ts`; e2e specs live in
`test/` as `*.e2e-spec.ts`. Shared unit-test helpers (e.g. the Prisma mock)
go in `test/` and are reused across specs.

## API Endpoints

### Auth

- `GET /api/auth/registration-mode` - Get current registration mode (public)
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `POST /api/auth/logout` - Revoke refresh token
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile name
- `POST /api/auth/profile/image` - Upload profile image
- `DELETE /api/auth/profile/image` - Remove profile image
- `POST /api/auth/change-password` - Change password

### OIDC Authentication

- `GET /api/auth/oidc/config` - Get OIDC configuration (public): the first provider's fields, and `providers`, one entry per provider that's on
- `GET /api/auth/oidc/initiate` - Initiate OIDC login flow (redirects to provider; `?provider=<id>`, the first when left out)
- `GET /api/auth/oidc/callback` - The first provider's OIDC callback (handles provider redirect)
- `GET /api/auth/oidc/callback/:provider` - Another provider's OIDC callback
- `POST /api/auth/oidc/link` - Connect the signed-in account to a provider (`{ provider }`, the first when left out)
- `POST /api/auth/oidc/exchange` - Exchange one-time code for tokens (web)
- `POST /api/auth/oidc/exchange/mobile` - Exchange IdP access token for app tokens (mobile; `{ access_token, provider }`)

### Notes

- `GET /api/notes` - Get all notes (supports `?search=term` and `?tagId=id`)
- `GET /api/notes/trash` - Get all trashed notes
- `GET /api/notes/archive` - Get all archived notes
- `POST /api/notes` - Create a note
- `GET /api/notes/:id` - Get a specific note
- `PATCH /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note (soft delete)
- `PATCH /api/notes/:id/restore` - Restore a note from trash
- `DELETE /api/notes/:id/permanent` - Permanently delete a note
- `POST /api/notes/bulk/delete` - Bulk delete notes
- `POST /api/notes/bulk/archive` - Bulk archive notes

### Note Attachments

- `POST /api/notes/:noteId/attachments` - Upload an attachment (multipart/form-data)
- `GET /api/notes/:noteId/attachments` - List all attachments for a note
- `GET /api/notes/:noteId/attachments/:id` - Get attachment file (stream)
- `DELETE /api/notes/:noteId/attachments/:id` - Delete an attachment
- `PATCH /api/notes/:noteId/attachments/reorder` - Reorder attachments (body: `{ orderedIds: string[] }`)

### Note Sharing

- `POST /api/notes/:id/shares` - Share a note with a user
- `GET /api/notes/:id/shares` - Get all shares for a note
- `PATCH /api/notes/:id/shares/:shareId` - Update share permission
- `DELETE /api/notes/:id/shares/:shareId` - Revoke a share

### Import & Export

- `GET /api/export` - Export the user's full library (notes, tags, attachments) as a streamed zip
- `POST /api/import/notes` - Import notes from a parsed manifest (also used for Google Keep imports)
- `POST /api/import/notes/:noteId/attachments` - Upload an attachment for an imported note (multipart/form-data)

### Tags

- `GET /api/tags` - Get all tags
- `POST /api/tags` - Create a tag
- `GET /api/tags/:id` - Get a specific tag
- `GET /api/tags/:id/notes` - Get all notes with a specific tag
- `PATCH /api/tags/:id` - Update a tag
- `DELETE /api/tags/:id` - Delete a tag

### Sync

- `POST /api/sync` - Combined push + pull: applies client changes, returns the change feed past a cursor
- `GET /api/sync/events` - SSE stream of `{ seq }` pokes telling clients when to pull

### Admin (requires admin privileges)

- `GET /api/admin/stats` - Get server statistics
- `GET /api/admin/settings/registration` - Get registration settings
- `PATCH /api/admin/settings/registration` - Update registration mode (disabled if locked by env)
- `GET /api/admin/settings/oidc` - Get OIDC settings
- `PATCH /api/admin/settings/oidc` - Update the first provider's OIDC settings (disabled if locked by env)
- `POST /api/admin/settings/oidc/providers` - Add another OIDC provider
- `PATCH /api/admin/settings/oidc/providers/:id` - Change a provider added in the admin UI
- `DELETE /api/admin/settings/oidc/providers/:id` - Remove a provider added in the admin UI
- `GET /api/admin/users` - Get all users (supports `?skip=n` and `?take=n`)
- `GET /api/admin/users/pending` - Get pending users awaiting approval
- `POST /api/admin/users` - Create a new user
- `PATCH /api/admin/users/:id` - Update a user
- `DELETE /api/admin/users/:id` - Delete a user
- `POST /api/admin/users/:id/reset-password` - Reset a user's password
- `POST /api/admin/users/:id/approve` - Approve a pending user
- `POST /api/admin/users/:id/reject` - Reject and delete a pending user

### Health

- `GET /api/health` - The server's identity, version and protocols; always 200 while it runs
- `GET /api/health/ready` - For uptime monitors: 200, or 503 when the database doesn't answer
