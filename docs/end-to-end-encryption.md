# End-to-end encryption

Status: design, not built yet (2026-11-13)

Every new account is encrypted end to end by default. Notes, tags, pictures and files are
encrypted on the device before they leave it, and the server only stores and passes on
ciphertext. Nobody who runs a server, hosted or self-hosted, can read what people write.

People who would rather have the server-side features (server search, OCR and picture
search on the server, the hosted MCP connector, a password reset by the admin) can turn
encryption off for their account. See [On by default, can be turned off](#on-by-default-can-be-turned-off).

This document says what gets encrypted, how keys work, what each feature becomes, what
stays visible to the server, and the order to build it in.

## Goals and limits

**Goals**

- The server, its database, its backups and anyone who steals them see no note titles,
  text, checklists, tag names, pictures, files, file names, OCR text or picture-search
  data.
- Every way of signing in keeps working: password, OIDC, passkeys, sign-in codes from
  another device, two-step.
- Sharing with other people, share links, live editing, offline use, search, OCR and
  picture search keep working.
- Losing a password does not mean losing notes, as long as the person kept their
  recovery key or still has a signed-in device.
- Turning encryption off is a deliberate choice by the person, made on their own device.
  A server can never switch an account to plain text by itself.

**What the server still sees** (metadata, needed to sync and share)

- Who has an account, when they sign in, from which IP.
- How many notes, tags and files someone has, their sizes and when each changed.
- Note colour, pinned, archived, trashed, order, lock kind, reminder times.
- Who shares which note with whom, and that a share link exists.

Encrypting more of this (colours, reminder times, the share graph) is possible later,
but each costs a server feature, so it is left out of the first version.

**What it does not protect against**

- A server operator who changes the **web app** code it serves can make it send keys
  away. The desktop and mobile apps don't load code from the server, so they are the
  safe choice; the web app is as trustworthy as the server that hosts it. Mitigations:
  published source, reproducible builds, and a notice in the web app that says so.
- A device that is itself compromised.
- Someone the note is shared with keeping a copy.

## On by default, can be turned off

Each account has an encryption mode: **encrypted** (the default) or **not encrypted**.

| | Encrypted (default) | Not encrypted |
|---|---|---|
| Server can read notes | No | Yes |
| Search | On the device | On the server, as today |
| OCR and picture search | On the device | On the server, as today |
| MCP connector | Local bridge on your computer | Hosted endpoint, as today |
| Forgotten password | Another sign-in method, a device or the recovery key | Admin reset works, nothing is lost |
| Recovery key at sign-up | Required | None |

**Signing up**: encryption is on. Below it, "Turn off end-to-end encryption" opens a
short explanation of what changes (the table above, in plain words) and asks for
confirmation. Someone who turns it off skips the recovery-key step.

**Switching later**, in Settings:

- **Turning it on** runs the same move as for existing accounts (see
  [Moving existing accounts](#moving-existing-accounts)).
- **Turning it off** decrypts everything on the device and uploads it as plain text.
  It needs the password or the recovery key to confirm and says what the server will be
  able to read afterwards. When it's done, the wrapped keys stay so the person can still
  open notes shared with them.

**The server can't downgrade an account.** The mode lives in the account's encrypted
settings as well as on the server. A client that knows its account is encrypted refuses
to upload plain text, whatever the server says, until the person turns encryption off on
that device. Other signed-in devices then show a notice that encryption was turned off,
from which device and when.

**Mixed sharing.** A note follows its owner's mode:

- An encrypted owner sharing with someone who has no keys yet (they turned encryption
  off before keys existed): that person is asked to set up keys the next time they open
  Anchor+ (a device key and their password, no recovery key needed), and the share shows
  as pending until then. Their server-side search and MCP can't read that note.
- A not-encrypted owner sharing with an encrypted person: the note stays in plain text,
  and the encrypted person sees it marked "Not end-to-end encrypted".

**Server admins** set two options (environment variables and the admin page):

- `E2EE_DEFAULT` (`on` by default): whether new accounts start encrypted.
- `E2EE_ALLOW_OPT_OUT` (`true` by default): whether people may turn it off. The hosted
  service keeps both defaults. A self-hosted family server might set the default to `off`,
  and a privacy-focused one might forbid opting out.

**Cost of keeping both**: the server keeps its search, OCR, picture search, export and MCP
code for not-encrypted accounts, and the clients carry the device-side versions for
encrypted ones. Every feature that reads notes has to handle both, and tests run in both
modes.

## Cryptography

One library on every platform, so all clients share one implementation of each
primitive and one set of test vectors:

- **libsodium**: `libsodium-wrappers-sumo` in web and desktop, `sodium_libs` in the
  Flutter app.
- **Symmetric**: XChaCha20-Poly1305 (`crypto_aead_xchacha20poly1305_ietf`), random
  24-byte nonces.
- **Files**: `crypto_secretstream_xchacha20poly1305` in 64 KiB chunks, so large files
  stream instead of loading whole into memory.
- **Password to key**: Argon2id (`crypto_pwhash`), 64 MiB memory, 3 passes. Parameters
  are stored with each wrapped key, so they can be raised later.
- **Key exchange for sharing**: X25519 sealed boxes (`crypto_box_seal`).
- **Keys**: 32 random bytes from `randombytes_buf`.

### Envelope

Every encrypted value is stored as one string:

```
enc:1:<base64url(nonce || ciphertext)>
```

The associated data binds a ciphertext to where it belongs (`note:<id>:body`,
`tag:<id>:name`, `attachment:<id>:meta`), so the server cannot swap one note's
ciphertext into another note or field without the client noticing.

## Keys

```
password ──Argon2id──► password key ──┐
recovery key (printed) ───────────────┤
passkey (WebAuthn PRF) ───────────────┼──► wraps ──► account key (random)
device key (secure storage) ──────────┘                   │
                                                          ├──► wraps ──► private key (X25519)
                                                          ├──► encrypts tag names, settings
                                                          └──► wraps ──► note keys (one per note)
                                                                              │
                                    sharee's public key ──► wraps ──► note key│
                                                                              ├──► note body
                                                                              ├──► revisions
                                                                              └──► file keys ──► files
```

- **Account key**: 32 random bytes, made on the device when the account is created. It
  never reaches the server unwrapped.
- **Wrapped copies** of the account key live on the server, one per way of unlocking:
  - **Password**: Argon2id of the password with a per-user salt. This is separate from
    the login check: the server keeps checking a bcrypt hash of a *different* value
    (derived from the same Argon2id output with a different context), so the login hash
    can't be used to unwrap anything.
  - **Recovery key**: 32 random bytes shown once as 24 words or a QR code at setup, and
    again on request in Settings. The account is not ready until the person confirms they
    saved it.
  - **Passkey**: the WebAuthn PRF extension gives a secret per passkey that wraps the
    account key. Supported in current Chrome, Safari and Android; where PRF is missing,
    a passkey only signs in and the device is unlocked another way.
  - **Device**: each signed-in device keeps a random device key in secure storage
    (Keychain/Keystore through `flutter_secure_storage`, Electron `safeStorage`, a
    non-extractable WebCrypto key in IndexedDB on the web) and a copy of the account key
    wrapped with it. Signing out deletes both.
- **Key pair**: an X25519 key pair per user. The public key is on the server; the
  private key is stored wrapped with the account key.
- **Note key**: 32 random bytes per note, wrapped with the account key for the owner and
  with the public key of each person the note is shared with.
- **File key**: per picture or file, wrapped with its note's key.

### Signing in on a new device

| Account | How the new device gets the account key |
|---|---|
| Password | Sign in, then the password unwraps it. |
| Passkey with PRF | The passkey sign-in unwraps it. |
| OIDC, or passkey without PRF | Scan a sign-in code from a device that is already signed in. The QR code carries the account key wrapped for a one-time key that never reaches the server. Without another device: the recovery key. |
| Any | The recovery key always works. |

The existing sign-in codes (`server/src/auth/magic-login.service.ts`) are extended for
this: the code in the QR stays the login, and a second secret in the URL fragment
carries the key.

### Changing and losing access

- **Changing the password** rewraps the account key. Nothing else is re-encrypted.
- **Forgotten password**: sign in another way (passkey, OIDC, another device) and set a
  new password, or use the recovery key.
- **Admin password reset** (`/api/admin/users/:id/reset-password` and
  `docker/reset-password`) resets the login only. The person then needs a device or
  their recovery key to read their notes. Both places say so before resetting.
- **Lost everything** (no password, device or recovery key): the notes cannot be
  recovered, by anyone. The account can be emptied and started over.

## What each part becomes

### Notes

Title, Quill content (text, checklists, formatting, inline picture references) are
encrypted together as the note's **body**. Encrypted notes store `Note.body` (ciphertext)
and `Note.keys` (the wrapped note keys) and leave `Note.title` and `Note.content` empty;
notes of not-encrypted accounts keep using `title` and `content`. `Note.encrypted` says
which. Colour, state, version and timestamps stay as they are.

### Sync

The protocol in `server/src/sync` already treats a note as a whole row with
optimistic versions. It keeps doing that, with ciphertext in place of title and content:
a stale `baseVersion` still stores the rejected copy as a conflict revision and returns
the server copy, and the client merges. The web app moves from the `/api/notes` REST
calls to the same `/api/sync` protocol the mobile app uses, so there is one path for
encrypted data.

### Live editing

Today the server merges everyone's edits (`server/src/collab/collab-document.ts`). It
can no longer read them, so it becomes an ordering relay:

- A client sends an encrypted edit with the revision it is based on.
- If that is the latest revision, the server appends it to the note's log and forwards
  it to the others. If not, it refuses and sends the edits the client missed; the
  client rebases its edit on them (the same `quill-delta` transform the server uses
  today) and sends it again.
- Clients upload an encrypted full body every so often and when the last person leaves,
  so new joiners don't replay the whole log.

This keeps Quill's delta format and the existing editor code, instead of moving to a
CRDT such as Yjs.

### Search

Search moves to the device. The mobile app already searches its local database. The web
app decrypts notes into memory after unlocking and searches there
(`web/features/notes/search.ts` already does most of this). Notes and their search index
are kept encrypted in IndexedDB, never in plain text.

### OCR and picture search

Both run on the device, and their results are stored encrypted with the picture:

- **OCR**: tesseract.js on web and desktop (`web/lib/image-text.ts`), ML Kit on mobile
  (`mobile/lib/core/files/image_text_reader.dart`). Both exist already.
- **Picture search**: the SigLIP model through `onnxruntime-web` on web and desktop.
  On mobile, pictures added there get their vector the next time a web or desktop client
  of the same account is open; a mobile model comes later.
- The server's `picture-text.service.ts` and `picture-search/` stay for not-encrypted
  accounts and skip encrypted pictures.

### Pictures and files

Encrypted with their file key before upload. File name, OCR text and the picture-search
vector go in an encrypted **meta** field next to it. MIME type and size stay plaintext
(the size is visible anyway).

### Tags

Tag names are encrypted with the account key. Colour and position stay plaintext.

### History

The server can't snapshot what it can't read, so revisions come from clients only (the
`recordClient` path that exists today), encrypted with the note key. Restoring a
revision happens on the device and syncs as a normal edit.

### Sharing with people

Sharing a note wraps its note key with the other person's public key. Removing someone
makes a new note key, re-encrypts the body and future revisions with it and wraps it for
the people who still have access. Their past copies can't be taken back.

A server could hand out a fake public key and read what is then shared. Against that,
each person's public key has a short fingerprint shown in the share dialog, which two
people can compare. Keys are trusted on first use and a changed key is flagged.

### Share links

The note key goes in the URL fragment (`/s/<token>#<key>`). Browsers don't send the
fragment to the server, and the share page is already a client-side page
(`web/app/s/[token]/shared-note-page.tsx`). Editing links join live editing with that
key. Revoking a link rotates the note key, as with people.

### Import, export and copy

- **Import**: Google Keep parsing already runs in the web app; it now encrypts before
  uploading. The server's import endpoint only stores rows.
- **Export**: built on the device (zip and Markdown), using the existing converters
  moved from `server/src/import-export` into shared code.
- **Copy**: the device decrypts, gives the copy a new note key and uploads.

### MCP and API tokens

The server can't read encrypted notes, so for encrypted accounts the hosted MCP endpoint
(`server/src/mcp`) answers with an explanation instead. Not-encrypted accounts keep the
hosted endpoint; it skips encrypted notes shared with them.

Encrypted accounts use the **MCP bridge**: a program on the person's own computer that
signs in like another device, holds keys, syncs, decrypts on that computer and serves
the same MCP tools to AI assistants. It works for not-encrypted accounts too, so there's
one local tool for everyone.

#### Where it runs

- **In the desktop app**: Settings → AI assistants → "Let AI assistants use my notes".
  It uses the desktop app's keys and sync, so there's nothing extra to install.
- **On its own**: `npx @anchor-plus/mcp`, for computers without the desktop app,
  servers and Claude Code. Its keys go in the OS keychain (Keychain, Windows Credential
  Manager, Secret Service); without a keychain, in a file only the user can read.

#### Connecting an assistant

- **stdio** (default): the assistant starts the bridge itself, as with any local MCP
  server in Claude Desktop, Claude Code, Cursor or ChatGPT's desktop app. The desktop app
  shows a ready-made config snippet to copy.
- **Local HTTP**: streamable HTTP on `127.0.0.1` only, with a random bearer token, for
  assistants that want a URL. It never listens on other addresses.

Web and phone assistants (claude.ai in the browser, ChatGPT on the web) can't reach a
program on the person's computer. See [Web and phone assistants](#web-and-phone-assistants).

#### Signing in the bridge

`anchor-mcp login` (or the desktop switch) shows a sign-in code. The person approves it
on a signed-in device, as for any new device, and chooses what the bridge may do:

| Access | What the bridge gets | Enforced by |
|---|---|---|
| **All notes** | The account key, wrapped for the bridge's device key | Cryptography |
| **Only notes with certain tags** | No account key. Only the keys of matching notes, wrapped for the bridge's own key pair, as when sharing a note with a person. When a note gets one of those tags, the device that tags it wraps its key for the bridge too | Cryptography: the bridge can't decrypt anything else |
| **Read only** (either of the above) | The same keys, but its token can't write | The server refuses its writes |

The bridge shows up in Settings → Devices as "MCP bridge on <computer name>", with its
access level and when it last synced.

**Revoking** it there invalidates its token and deletes its wrapped keys, so it gets
nothing new. The bridge deletes its local copy the next time it starts and learns it was
revoked. A bridge with all-notes access had the account key, so after revoking one that
may have been stolen, Settings offers to **rotate the account key**: make a new one,
rewrap every note key and tag name, and sign the other devices in again.

#### How it works inside

- **Sync**: the same `/api/sync` protocol and change events as the other clients. It
  keeps an encrypted local copy (ciphertext, as received) and decrypts in memory after
  start, so it answers quickly and works briefly offline.
- **Search**: on the decrypted copy, including OCR text and, if picture search is turned
  on, picture vectors made by the other clients. The bridge can make missing vectors
  itself with the same SigLIP model (downloaded on first use, about 100 MB).
- **Reading**: the Delta-to-Markdown and attachment code in `server/src/mcp`
  (`note-markdown.util.ts`, `attachment-content.util.ts`) moves to a shared package that
  the server and the bridge both use. Pictures are resized on the computer with sharp
  before they go to the assistant.
- **Writing**: creating, updating, appending to and trashing notes encrypt with the
  note key (a new key for a new note) and sync like any client edit. If someone is
  editing that note live, the bridge sends its change through the live-editing relay, so
  nothing gets overwritten.
- **Locked notes** behave as today: the assistant sees the title, not the text.
- **Tools**: the same names and arguments as the hosted endpoint (`list_notes`,
  `get_note`, `create_note`, `update_note`, `append_to_note`, `trash_note`,
  `list_tags`, `create_tag`, `get_attachment`), so switching between them changes
  nothing in prompts or skills.

#### What it means for privacy

- **Whatever the assistant reads leaves end-to-end encryption.** It goes to the AI
  provider (Anthropic, OpenAI…) under that provider's terms. The sign-in screen and the
  desktop switch say so, which is why tag-limited access exists.
- **Text in notes can try to steer the assistant** (prompt injection), for example a
  shared note telling it to trash other notes. Read-only access and the assistant's own
  confirmation prompts limit this, and the bridge never deletes for good: trashed notes
  stay in the trash.
- **The bridge works only while the computer is on.** It's a local program, not a
  service.

#### Web and phone assistants

Assistants that run in the browser or on a phone need an internet URL. Any URL the
bridge exposes would carry decrypted notes through whatever relays it, so there's no
built-in relay in the first version. People who want this anyway can:

- turn encryption off for their account and use the hosted endpoint, or
- run the bridge's HTTP mode on a server they control and put it behind their own
  HTTPS and login (for example on a home server that's always on), knowing that server
  then holds keys.

A relay through the Anchor+ server is possible later, as an explicit opt-in that says the
server will see what the assistant reads.

### Reminders

Unchanged: reminders are scheduled on the device, which reads the title from its own
decrypted data. There is no server push to leak titles through.

### Self-hosting and the browser-only mode

Self-hosted servers run the same code, with the same defaults. Their admin can change the
default or forbid opting out (see `E2EE_DEFAULT` and `E2EE_ALLOW_OPT_OUT` above). The
browser-only mode (`web/lib/local-backend`, `ANCHOR_MODE=local`) never sends anything
anywhere and stays as it is.

## Moving existing accounts

1. After the update, the next time someone opens a client they're asked to set up
   encryption: save the recovery key, and choose password, passkey or device unlock.
   Where opting out is allowed, "Not now" keeps the account as it is and Settings offers
   it again later. Existing accounts are never switched without the person's action,
   whatever `E2EE_DEFAULT` says.
2. The client downloads every note, tag, revision and file, encrypts them and uploads
   the ciphertext, note by note, resuming if interrupted.
3. When the last item is done, the server deletes the plaintext columns, server-made
   revisions, OCR text and picture vectors for that account.
4. Backups made before that still contain plaintext. They age out under the normal
   retention, and the release notes say how long that is.

Notes shared between an encrypted and a not-yet-encrypted account are encrypted when
their owner moves. Until the owner has moved, the other person sees them as before.

The server refuses plaintext writes from an account while it is encrypted.

## Build order

Each step is its own PR and leaves the app working.

1. **Encryption at rest on the server** (independent of the rest): encrypted volumes,
   object storage and backups. Not end to end, but it protects stolen disks and backups
   now.
2. **Move work to the clients, still in plaintext**: search, OCR, picture search,
   export, copy and history restore on the device; the web app switches to `/api/sync`.
   This removes the server's need to read notes before any encryption exists.
3. **Crypto core**: one TypeScript and one Dart module with the envelope format, key
   hierarchy and shared test vectors, plus account setup, unlocking, the recovery key
   and device linking through sign-in codes. Accounts get keys but nothing is encrypted
   yet.
4. **Encrypted notes, tags and files**: sync carries ciphertext; new accounts are
   encrypted unless they opt out; existing accounts are offered the move described above.
   The account mode, `E2EE_DEFAULT` and `E2EE_ALLOW_OPT_OUT` arrive here.
5. **Live editing as an ordering relay** for encrypted notes; the server keeps merging
   edits for not-encrypted ones.
6. **Sharing and share links** with wrapped note keys, fingerprints, key rotation and
   mixed-mode sharing.
7. **MCP bridge**, in three PRs:
   1. The standalone `@anchor-plus/mcp` command with stdio, all-notes and read-only
      access, and the Markdown code moved into a shared package.
   2. The desktop app switch and local HTTP.
   3. Tag-limited access and account-key rotation.
8. **Turning encryption off**, with the downgrade protection and the notice on other
   devices.

## Open questions

- Argon2id parameters on older Android phones: measure, and fall back to lower memory
  with more passes if 64 MiB is too slow.
- Picture search on mobile: which model, or keep relying on a web or desktop client.
- Should colour, reminder times and the share graph be encrypted in a later version?
- Should the hosted service show not-encrypted accounts a reminder to turn encryption on,
  and how often?
- Should the MCP bridge also come as a single binary, for people without Node?
- Is an opt-in relay for web and phone assistants worth building, given that the server
  would see what the assistant reads?
