# FilmGeezer Web

FilmGeezer Web is a full-stack movie, TV-series, Anime, and K-Drama discovery application. It is being developed as both a production-minded portfolio project and a practical full-stack software-engineering learning project.

## Current project status

The discovery platform and the manual authentication/account-management foundation are implemented. A browser-based guest Watchlist is also available, with authenticated MongoDB synchronization and guest-to-account merging planned next.

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
- Seven-day expiry for each saved title
- Twenty-title browser limit
- Cross-tab synchronization in the same browser
- Dedicated responsive Watchlist page
- Accessible add/remove controls on media cards and Media Details
- Defensive storage validation and graceful storage-unavailable handling

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

1. Authenticated MongoDB Watchlist persistence
2. Safe guest-to-account Watchlist merging
3. Profile-picture upload and object storage
4. Entertainment preferences and personalised recommendations
5. Notifications and contact/support completion
6. Protected administration features
7. Production email delivery, shared rate limiting, automated tests, and Railway deployment hardening

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
