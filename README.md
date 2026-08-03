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
