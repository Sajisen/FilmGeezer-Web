# FilmGeezer Web

FilmGeezer Web is a full-stack movie, TV-series, Anime, and K-Drama discovery application. It is being developed as both a production-minded portfolio project and a practical full-stack software-engineering learning project.

## Current project status

The discovery platform, manual authentication/account management, persistent Watchlist, secure profile-picture upload, account entertainment preferences, personalised recommendations, discovery-quality caching, and the Contact/support workflow are implemented.

## Technology stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- zxcvbn-ts password-strength estimation

### Backend

- Node.js
- Express
- TypeScript
- MongoDB
- Zod validation
- Argon2id password hashing
- Sharp image decoding and safe WebP re-encoding
- Multer multipart upload limits
- Railway Buckets-compatible S3 storage adapter
- SimpleWebAuthn server verification for administrator passkeys
- QR-code generation for administrator authenticator enrollment

### External data

- TMDB for discovery, search, media details, trailers, seasons, episodes, recommendations, and legal watch availability
- MongoDB content links maintained by the FilmGeezer Telegram-bot system and exposed to the Web client through the Express API

## Implemented features

### Discovery

- Curated Home, Movies, TV Series, Anime, and K-Drama pages
- Responsive cinematic page banners
- Category-aware search and filtering
- Request cancellation and stale-response protection
- Loading, error, retry, and empty states
- Expanded TMDB candidate reservoirs for Movie, TV, Anime, and K-Drama collections
- Fair server-side row allocation so early rows do not consume every strong title
- Cross-row deduplication that is preserved after personalised recommendations are inserted
- Grounded Movie Drama and TV Comedy/Drama classification that penalises action-heavy mismatches
- Sports Anime collection sourced through exact TMDB keyword discovery while preserving TMDB IDs
- Quality-controlled filter-only Search discovery with category-aware rating and vote-confidence floors
- Exact title searches remain broad so obscure titles can still be found deliberately
- Era-balanced Movie Essentials that mix recent, modern, contemporary, and classic films instead of over-favouring older titles
- Low-confidence Anime with only the Animation genre is suppressed from broad discovery unless it has at least 100 votes
- Filter-only discovery enforces a universal minimum of rating 5 and 50 votes while exact title searches remain broad
- Public collection pages use process-local stale-while-revalidate caching and short browser/proxy cache headers to reduce repeated TMDB work

### Media details

- Cinematic Movie and TV details pages
- At-a-glance information
- Embedded trailers and videos
- Legal watch availability
- TV season and episode exploration
- Featured characters
- FilmGeezer content links
- More Like This recommendations

### Authentication and account security

- Manual email/password registration
- Email verification and automatic sign-in after verification
- Secure local login with server-side sessions
- HttpOnly session cookies, CSRF protection, and trusted-origin checks
- Password recovery and reset
- Display-name editing
- Password changes with session rotation
- Secure email-address changes
- Active-device management and individual session revocation
- Current-device and all-device sign out
- Account deactivation
- Authentication audit events

### Watchlist

- Browser-local saving without requiring an account
- Seven-day expiry and a twenty-title limit for guest Watchlists
- MongoDB-backed account Watchlists with a server-enforced fifty-title limit
- Safe guest-to-account merging after authentication
- Overflow-safe merge handling that preserves browser titles when an account is full
- Cross-tab guest synchronization and user-specific authenticated caching
- Optimistic account updates with rollback and retry handling
- Dedicated compact, filterable, responsive Watchlist page
- Accessible add/remove controls on media cards and Media Details
- Defensive storage and API-response validation

### Profile pictures

- Authenticated, CSRF-protected profile-picture upload and removal endpoints
- JPEG, PNG, and WebP input allowlist
- Five-megabyte request limit and twelve-megapixel decode limit
- Server-side decode, orientation correction, square crop, resize, metadata removal, and WebP re-encoding
- Maximum 256 KiB stored output
- Local development storage and private Railway Bucket support
- Presigned bucket delivery to avoid proxying image bytes through the application service
- Replacement cleanup, deactivation cleanup, rate limiting, and audit events
- Responsive Account-page preview, upload progress, replacement, removal, and initials fallback
- Live profile-picture updates in the Navbar, profile menu, mobile navigation, and account summary


### Entertainment preferences

- Private per-account preference document owned by the FilmGeezer user ID
- Personalisation on/off control without deleting saved choices
- Preferred Movies, TV Series, Anime, and K-Drama categories
- Preferred genres, lower-priority genres, and preferred content languages
- Strict backend allowlists, size limits, duplicate prevention, and CSRF protection
- Optimistic revision checks to prevent one device from silently overwriting another
- Responsive Account-page editor with reset, retry, collapsed disabled state, and accessible selection controls

### Personalised recommendations

- Signed-in-only recommendation rows on Movies, TV Series, Anime, and K-Drama pages
- Trending/current content remains the first row; personalised results appear second
- Explicit saved interests receive more ranking weight than inferred Watchlist signals
- Watchlist inference begins only after at least five saved account titles
- Preferences are ignored while personalised suggestions are turned off
- Recommendation rows stay hidden when neither source provides enough useful signal
- Category-safe Movie, TV, Anime, and K-Drama candidate filtering
- Watchlist titles and current trending titles are excluded from recommendation results
- Recommended titles are removed from lower curated rows to prevent repeated cards
- Media Details adds a signed-in-only “You may also like” row after More Like This
- Media Details personal results exclude the current title and More Like This items
- Server-side quality scoring, explicit-preference weighting, Watchlist affinity, TMDB seed boosts, diversity controls, revision-aware caching, and authenticated rate limiting

### Contact and support

- Real Contact form backed by the FilmGeezer Web MongoDB database
- General question, problem report, content/link issue, account-help, and feedback categories
- Strict Zod validation, Unicode normalization, body-size limits, trusted-origin enforcement, and rate limiting
- Hidden honeypot handling that does not reveal bot detection
- Safe public reference numbers for follow-up
- No passwords, codes, session material, or other authentication secrets stored with messages
- Admin-ready status and category indexes for the future support dashboard
- Responsive dark cinematic form, signed-in name/email prefill, field errors, retry handling, and confirmation state

### User experience

- Route-backed authentication modals with direct-route fallbacks
- Responsive account settings page
- Desktop and mobile navigation
- Keyboard and focus-management support
- Reduced-motion-aware interactions
- Safe external-link confirmation

## Architecture

```text
React client
    ↓ HTTPS/JSON
Express API
    ├── TMDB
    ├── FilmGeezer Web MongoDB database
    └── Read-only FilmGeezer content-links database
```

React never connects directly to MongoDB. Controllers handle HTTP concerns, services contain domain logic, and repositories own database access.

Authentication uses opaque session tokens stored in HttpOnly cookies. The server stores only hashed session material and remains authoritative for users, roles, account status, ownership, and security-sensitive operations.

## Collection caching strategy

Public Home, Movie, TV, Anime, and K-Drama collections are shared across users. The API keeps these responses in a process-local stale-while-revalidate cache and deduplicates concurrent refreshes. Home collections refresh after two hours; category collections refresh after six hours and may serve a previously successful result for up to twenty-four hours while TMDB temporarily fails or a background refresh runs.

Redis is intentionally deferred while FilmGeezer runs one API instance. A shared Redis cache becomes useful when the API uses multiple replicas, requires shared rate-limit state, or measured traffic shows that process-local caching is no longer sufficient.

## Planned work

The next planned phases are:

1. In-app notification foundation and delivery preferences
2. Protected administration features, including Contact-message review
3. Production email delivery, shared rate limiting, automated tests, and Railway deployment hardening

## Local development

### 1. Create environment files

Copy the provided examples:

```text
client/.env.example  → client/.env.local
server/.env.example  → server/.env
```

Replace the placeholders in the local files. Never commit or share real environment files, API tokens, MongoDB credentials, authentication peppers, or email-provider secrets.

### 2. Install dependencies

```bash
cd client
npm install

cd ../server
npm install
```

### 3. Start the backend

```bash
cd server
npm run dev
```

The development API normally runs at:

```text
http://localhost:5000
```

### 4. Start the frontend

In a second terminal:

```bash
cd client
npm run dev
```

The Vite development client normally runs at:

```text
http://localhost:5173
```

## Quality checks

Run these checks before committing or merging:

```bash
cd server
npm run build

cd ../client
npm run lint
npm run build
```

## Repository workflow

- `main` contains stable milestones.
- `develop` is the normal integration branch.
- Temporary `feature/*` branches are used for large or cross-cutting work such as authentication and Watchlist persistence.

## Data and attribution

FilmGeezer Web uses TMDB data but is not endorsed or certified by TMDB. FilmGeezer content links are served through the backend and are identified by the canonical combination of TMDB media type and TMDB ID.

## Contact support conversations

Signed-in users can access their five most recently active support requests from
`/contact`, open a request by its public reference, review the chronological
conversation, and add follow-up replies. Guest submissions remain supported but
are not exposed through account history; the guest must retain the reference
number shown after submission.

Support requests remain in `contact_messages`. Chronological user/admin replies
are stored separately in `contact_thread_messages`, preventing an unbounded
message array from growing inside the request document. Existing schema-version
1 requests remain readable: their original `message` field is treated as the
first conversation message while new replies use the thread collection.

The former `/help` page has been removed. FilmGeezer's public informational and
support destinations are now About and Contact.

## Administrator application foundation

FilmGeezer now contains a hostname-aware administrator application inside the
existing React build. In development, open `http://localhost:5173/admin`. In
production, configure `ADMIN_APP_ORIGIN` and point the chosen administrator
subdomain to the same frontend service. The admin bundle is loaded lazily, so
normal public visitors do not download it.

Administrator authentication is separate from public authentication:

- separate HttpOnly admin cookie;
- separate MongoDB `admin_sessions` collection;
- exact administrator Origin and CSRF checks;
- eight-hour absolute session lifetime;
- thirty-minute idle timeout;
- maximum two active admin sessions per account;
- role validation against the current user document on every request;
- administrator audit events in `admin_audit_events`.

A normal public FilmGeezer session never unlocks the admin application.

### Local administrator setup

1. Register and verify the intended administrator account through FilmGeezer.
2. From `server`, run:

```powershell
npm run admin:grant -- -- --email=administrator@example.com
```

3. Open `http://localhost:5173/admin` and sign in again through the dedicated
   administrator login.

To revoke an administrator safely:

```powershell
npm run admin:revoke -- -- --email=administrator@example.com
```

The final active administrator cannot be revoked by the script, and revoking a
role closes that account's active admin sessions.

The first dashboard module provides live account, support-request, and admin
session counts. Support, Users, Content, Audit, and Settings routes are present
as protected module boundaries. The Contact support inbox is the next module to
implement.

Administrator MFA is intentionally identified as a production launch gate. The
current foundation provides role checks, isolated sessions, short lifetimes,
CSRF protection, rate limits, and audit logging, but production access should
not be enabled until MFA is added and tested.

## Administrator Contact support inbox

The protected administrator application now includes a real Contact support
workflow at `/admin/support` in development or `/support` on the dedicated
admin subdomain.

The module provides:

- paginated support queues;
- filters for status, category, and guest/account requesters;
- reference, subject, requester-name, and email search;
- complete chronological conversation review;
- administrator replies for signed-in FilmGeezer requesters;
- New, In review, Resolved, and Spam status controls;
- explicit guest-email delivery safeguards until transactional email exists;
- administrator audit records for replies and status changes.

Administrator endpoints:

```text
GET   /api/admin/support
GET   /api/admin/support/:referenceId
POST  /api/admin/support/:referenceId/messages
PATCH /api/admin/support/:referenceId/status
```

All routes require a current administrator session. Reply and status changes
also require the administrator CSRF token and the exact trusted admin Origin.

Signed-in Contact requests can receive in-app administrator replies immediately.
Guest requests remain visible and classifiable, but the reply composer is
intentionally disabled until transactional email delivery is configured. This
prevents the dashboard from recording a response that the guest cannot receive.

Administrator support actions are written to `admin_audit_events` as:

```text
admin-support-replied
admin-support-status-updated
```

## Administrator MFA, passkeys, and recent authentication

FilmGeezer administration uses a password-first flow with three verification
methods:

1. passkeys as the preferred strong factor;
2. authenticator-app TOTP as a fallback strong factor;
3. one-time recovery codes as an emergency fallback.

The passkey system extends the existing FilmGeezer administrator identity and
session architecture. It does not create a second administrator account system.
Administrators can register multiple labelled passkeys for Windows Hello,
mobile devices, or hardware security keys. FilmGeezer stores only public
credential material and WebAuthn metadata; biometric templates, device PINs,
and private keys never reach the application.

### Server configuration

Generate a dedicated TOTP encryption key and recovery-code pepper:

```powershell
cd server
npm run admin:mfa-secrets
```

Copy the generated values into the server environment and configure WebAuthn:

```env
ADMIN_MFA_REQUIRED=false
ADMIN_MFA_ENCRYPTION_KEY=<generated 32-byte base64 key>
ADMIN_MFA_RECOVERY_PEPPER=<generated independent pepper>

ADMIN_WEBAUTHN_RP_NAME=FilmGeezer Administration
ADMIN_WEBAUTHN_RP_ID=localhost
ADMIN_WEBAUTHN_ORIGIN=http://localhost:5173
```

Production uses the dedicated administrator hostname:

```env
ADMIN_APP_ORIGIN=https://admin.filmgeezer.site
ADMIN_WEBAUTHN_RP_ID=admin.filmgeezer.site
ADMIN_WEBAUTHN_ORIGIN=https://admin.filmgeezer.site
```

`ADMIN_WEBAUTHN_ORIGIN` must exactly match `ADMIN_APP_ORIGIN`, and its hostname
must exactly match the configured relying-party ID. Production WebAuthn requires
HTTPS. Localhost and production passkeys are separate credentials because they
belong to different relying parties.

`ADMIN_MFA_ENCRYPTION_KEY` protects TOTP secrets with AES-256-GCM.
`ADMIN_MFA_RECOVERY_PEPPER` creates keyed hashes for recovery codes. Preserve
these values across deployments and keep them outside source control.

Install the exact dependencies recorded in both lock files:

```powershell
cd client
npm install

cd ../server
npm install
```

### Safe rollout

1. Configure TOTP and WebAuthn while `ADMIN_MFA_REQUIRED=false`.
2. Restart the API and sign in to the administrator application.
3. Open **Security** and register a passkey.
4. Save the displayed recovery codes outside the browser and primary device.
5. Add an authenticator app as a fallback.
6. Sign out and verify password + passkey login.
7. Test **Use another method** with TOTP and one recovery code.
8. Set `ADMIN_MFA_REQUIRED=true` before exposing the production admin subdomain.

When policy is required, an administrator without a strong factor receives a
restricted enrollment session. The enrollment screen recommends a passkey and
no operational administrator route is unlocked until passkey or TOTP enrollment
completes. Existing TOTP administrators keep their factor and recovery codes
when passkeys are introduced.

### Login and recent authentication

After the password is accepted, passkey verification is preferred whenever the
administrator has an active passkey. Cancelling the browser prompt preserves
the short-lived challenge so the administrator can choose TOTP or a recovery
code instead. A full administrator session is issued only after successful
strong verification.

Passkey registration, passkey revocation, recovery-code replacement, and future
destructive administrator actions require a recent administrator-authentication
window. The administrator can refresh this window with a passkey or with the
password plus TOTP/recovery proof.

### Final-factor protection

The server prevents removal of the last strong factor:

- TOTP cannot be removed when no active passkey remains.
- The final passkey cannot be revoked when TOTP is disabled.
- One method may be removed when another strong method remains.
- Recovery codes never count as the primary strong factor.

Every rule is enforced in the backend, independently of button state in React.

### Recovery and emergency reset

Each recovery code works once. Generating a replacement set invalidates every
previous code. Recovery codes are stored in a provider-neutral record so they
continue to work for TOTP, passkey-plus-TOTP, and passkey-only administrators.
Existing embedded TOTP recovery hashes are migrated transactionally without
reissuing or exposing them.

A server operator can remove every administrator strong factor, invalidate open
verification challenges, and revoke all privileged sessions:

```powershell
npm run admin:mfa-reset -- -- --email=administrator@example.com
```

The next administrator sign-in must enroll a new strong factor when
`ADMIN_MFA_REQUIRED=true`. The command preserves the administrator role and does
not affect ordinary public FilmGeezer sessions.

### Security behavior

- TOTP uses SHA-1, six digits, 30-second periods, a small clock-drift window, and accepted-step replay prevention.
- WebAuthn uses server-generated, short-lived, single-use challenges and requires user verification.
- The server validates the exact challenge, origin, relying-party ID, credential ownership, public-key signature, and credential state.
- Registered credentials record label, transports, device type, backup state, counter, creation time, last use, and revocation state.
- Login, registration, and reauthentication challenges are rate-limited and expire through TTL-indexed MongoDB records.
- Recovery codes are high-entropy, HMAC-hashed, and never stored in plaintext.
- TOTP setup secrets are encrypted before they reach MongoDB.
- Passkey cancellation does not create a session or destroy the valid fallback challenge.
- Strong-factor registration or removal revokes other privileged sessions where the security boundary requires it.
- Passkey, TOTP, recovery, enrollment, reauthentication, revocation, reset, and failed verification events create administrator audit records without raw credential material.

### MongoDB collections

```text
admin_mfa_factors
admin_recovery_factors
admin_mfa_challenges
admin_passkey_credentials
admin_passkey_challenges
```

Challenge collections use TTL cleanup indexes. TOTP secrets are stored only as
AES-GCM ciphertext, IV, authentication tag, and key version. Recovery codes are
stored only as keyed hashes. Passkeys store only credential public keys,
signature counters, and safe operational metadata.

