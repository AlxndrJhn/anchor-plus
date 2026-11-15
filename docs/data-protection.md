# Data protection

Status: design, not built yet (2026-11-15)

The server can read notes. That's what lets Anchor+ offer search across everything, OCR
and picture search, live editing, the hosted MCP connector, and a password reset by the
admin that loses nothing. Notes are protected the way most established services protect
them: encrypted on the way and at rest, seen by nobody without a reason and a record,
kept no longer than needed, and never handed to third parties.

This document covers what the app itself does. How a particular server is run (disks,
backups, who has shell access) is up to whoever runs it; the README's self-hosting
section gives the recommendations.

## What the server reads, and why

| Reads | For |
|---|---|
| Note titles and text | Search, live editing, history, export, the MCP connector |
| Pictures | OCR and picture search, both run on the server itself |
| Files and recordings | Serving them back to the people who may see them |
| Account details (email, name, sign-in methods) | Signing in, sharing |

No note, picture or file goes to an outside service. OCR (tesseract.js) and picture
search (a SigLIP model run with ONNX) run inside the Anchor+ server. Nothing is used to
train AI models, and there are no ads, trackers or third-party analytics.

The exception is one the person chooses: connecting an AI assistant through the MCP
connector sends what the assistant reads to that assistant's provider. See
[AI assistants](#ai-assistants).

## Encryption

### On the way

- HTTPS only, with HSTS. Live editing and change events use the same TLS connection.
- The mobile and desktop apps refuse plain-HTTP servers except `localhost` and private
  network addresses, where self-hosters often start without certificates.

### At rest

**Pictures, files and recordings** are encrypted by the app before they're written to
disk or object storage:

- Each file gets its own random data key (AES-256-GCM, Node's built-in `crypto`), and is
  encrypted in chunks so large files stream.
- The data key is stored next to the file, encrypted with the server's **storage key**.
- The storage key comes from `ANCHOR_STORAGE_KEY` or a secrets file, never from the
  database. A new server generates one on first start and keeps it beside the sign-in
  secret in the data folder; operators who want the protection to count keep it elsewhere
  (an environment secret, or a key management service later).
- Changing the storage key rewraps the small data keys, not the files.

So a copied bucket, a lost disk with only uploads on it, or an object-storage provider
looking in sees ciphertext only.

**The database** isn't encrypted column by column. That would break search inside
Postgres and protect little, since the key would live on the same server. It's protected
by an encrypted disk instead; the README says how for self-hosters, and the hosted
service does it as standard.

**Backups**: the `backup` command writes a plain archive, so it should go straight into
something that encrypts. The provided `borgmatic.yaml` already does: Borg encrypts with a
passphrase that should be kept off the server. The README says so plainly.

## Who can see notes

### No content in admin screens

Admin pages show counts, sizes, plans and sign-in details, never note titles, text,
pictures or tag names. That's true today (`server/src/admin/admin.service.ts`) and stays
a rule: a new admin feature that needs content needs a design change first.

### Support access only with permission

When someone needs help with a note, they can grant access from the note's menu or from
Settings → Privacy: "Let support see this note" or "…my account", for 24 hours or 7
days. While a grant is active, the admin can open what it covers in a read-only view.
The person can end it early, and sees each time it was used.

Without a grant, admins can't open notes in the app. Someone with shell access to the
server can still read the database; that's what the operator's own policy and the
access log below are for.

### Audit log

An `AuditLog` table records what admins do: reset a password, turn off two-step, change a
plan, delete an account, use a support grant, change server settings. Each entry has who,
what, whom, when and from which IP.

- Admins see the whole log on the admin page.
- People see the entries about them in Settings → Security, for example "An admin reset
  your password on 3 March".
- Entries are kept for a year, then deleted.

### Sessions

Settings → Security lists signed-in devices with their last use and approximate place,
and can sign out any of them. Sessions are already tracked per refresh token; this adds
the list and the sign-out.

## Keeping less

- **Deleting an account** from Settings (today only an admin can): asks for the password
  or a passkey, then deletes notes, revisions, files, OCR text, picture vectors, tags,
  sessions and tokens at once. Notes shared with others are deleted for them too, after a
  warning listing them.
- **Backups** still hold deleted data until they age out. The hosted service keeps them 30
  days; the provided `borgmatic.yaml` keeps six months of monthly archives, and the
  README explains the trade-off.
- **Export** of everything is already in Settings (`/api/export`).
- **Trash** empties itself after 30 days (`server/src/tasks/tasks.service.ts`) and old
  revisions are pruned, as today.
- **OCR text and picture vectors** are deleted with their picture.
- **Logs** keep IP addresses for 7 days at most, then drop or shorten them. Request logs
  never contain note content.

## AI assistants

The hosted MCP connector stays. Since it's how notes can reach an outside provider, it
gets finer control:

- **Read-only tokens**: an API token can be limited to reading.
- **Tag-limited tokens**: a token can be limited to notes with certain tags.
- Settings → AI assistants lists each token, what it may do and when it was last used,
  and says that whatever an assistant reads goes to its provider.

## Secret notes (later)

For the few notes someone wants nobody but themselves to read, locked notes can later
become truly encrypted ones: the text is encrypted on the device with a key from the
lock passphrase (Argon2id, then XChaCha20-Poly1305), and the server stores only
ciphertext. Unlike some apps, encryption and decryption happen only on the device. Those
notes lose search, OCR, live editing and MCP access, and can't be recovered if the
passphrase is lost. It's optional and not needed for launch.

## Build order

Each step is its own PR.

1. **Account deletion and audit log**: self-service deletion, the `AuditLog` table, the
   admin log page and the entries in Settings → Security.
2. **Encrypted files at rest**: data keys and the storage key, together with the move to
   object storage in the hosted-service plan, with a one-off command that encrypts
   existing uploads.
3. **Sessions list** with sign-out.
4. **Support access grants**.
5. **Read-only and tag-limited API tokens**.
6. **HTTPS rules in the apps** and the README's self-hosting security section (encrypted
   disk, backup passphrase, storage key kept apart).
7. **Secret notes**, if people ask for them.

## Open questions

- Should support grants also let the admin edit, to fix a broken note, or stay read-only?
- Where the hosted service keeps the storage key: an environment secret to start with, or
  a key management service from the start.
- Should the audit log be exportable for business customers?
