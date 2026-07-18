# FilmGeezer Web

FilmGeezer Web is a full-stack movie, TV-series, Anime, and K-Drama discovery application built as a practical software-engineering learning project.

## Technology stack

### Frontend
- React
- TypeScript
- Tailwind CSS
- Vite
- React Router

### Backend
- Node.js
- Express
- TypeScript

### Data
- TMDB API
- MongoDB planned for provider links, users, watchlists, and admin features

## Current features

- Curated Home, Movies, TV Series, Anime, and K-Drama pages
- Responsive cinematic page banners
- Category-specific search and filtering
- Movie and TV details pages
- Mock external/provider links
- Request cancellation, retry, error, loading, and empty states
- Responsive desktop and mobile navigation

## Planned features

- Rich media-details redesign
- Embedded trailers
- TV season and episode guide
- MongoDB provider-link management
- Authentication and profiles
- Persistent watchlists
- Admin panel

## Local development

Create environment files based on:

- `client/.env.example`
- `server/.env.example`

Install and start the frontend:

```bash
cd client
npm install
npm run dev