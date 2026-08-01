# FilmGeezer Web

FilmGeezer Web is a full-stack movie, TV-series, Anime, and K-Drama discovery application. It is being developed as both a production-minded portfolio project and a practical full-stack software-engineering learning project.

## Current project status

The discovery platform, manual authentication/account-management foundation, persistent Watchlist, and the secure backend foundation for profile-picture uploads are implemented.

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

### Profile-picture foundation

- Authenticated, CSRF-protected profile-picture upload and removal endpoints
- JPEG, PNG, and WebP input allowlist
- Five-megabyte request limit and twelve-megapixel decode limit
- Server-side decode, orientation correction, square crop, resize, metadata removal, and WebP re-encoding
- Maximum 256 KiB stored output
- Local development storage and private Railway Bucket support
- Presigned bucket delivery to avoid proxying image bytes through the application service
- Replacement cleanup, deactivation cleanup, rate limiting, and audit events

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

## Planned work

The next planned phases are:

1. Profile-picture account UI and avatar integration
2. Entertainment preferences and personalised recommendations
3. Notifications and contact/support completion
4. Protected administration features
5. Production email delivery, shared rate limiting, automated tests, and Railway deployment hardening

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


===== server/.env.example =====
# This file documents the environment variables used by the FilmGeezer
# server. Copy it to a local file named .env and replace every placeholder.
# Never commit the real .env file to version control.

# Server runtime
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# Public FilmGeezer client origin used in password-reset links
# Use the LAN address while testing reset links from another device.
CLIENT_APP_ORIGIN=http://localhost:5173

# TMDB
TMDB_READ_ACCESS_TOKEN=replace_with_your_tmdb_read_access_token

# MongoDB connection
MONGODB_URI=replace_with_your_mongodb_connection_string

# Telegram bot-owned read-only content database
MONGODB_CONTENT_DB_NAME=filmgeezer_bot
MONGODB_CONTENT_LINKS_COLLECTION=content_links

# FilmGeezer Web-owned application database
MONGODB_WEB_DB_NAME=filmgeezer_web

# Authentication secrets
# Generate separate random values. Each must contain at least 32 characters.
AUTH_CHALLENGE_PEPPER=replace_with_a_random_32_byte_secret
AUTH_SESSION_PEPPER=replace_with_a_different_random_32_byte_secret

# Profile pictures
# Local development writes processed WebP files under server/.data.
# Railway production must use railway-bucket.
PROFILE_IMAGE_STORAGE_DRIVER=local
PROFILE_IMAGE_LOCAL_DIRECTORY=.data/profile-images

# Railway Bucket variables are required only when the driver is railway-bucket.
# Map these values from the Bucket service's BUCKET, ENDPOINT, REGION,
# ACCESS_KEY_ID, and SECRET_ACCESS_KEY variables.
PROFILE_IMAGE_BUCKET_NAME=
PROFILE_IMAGE_BUCKET_ENDPOINT=
PROFILE_IMAGE_BUCKET_REGION=auto
PROFILE_IMAGE_BUCKET_ACCESS_KEY_ID=
PROFILE_IMAGE_BUCKET_SECRET_ACCESS_KEY=
PROFILE_IMAGE_BUCKET_FORCE_PATH_STYLE=false