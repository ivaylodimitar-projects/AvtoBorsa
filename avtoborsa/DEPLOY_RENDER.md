# Render Frontend Deployment (React/Vite)

## Recommended: Static Site

Render setup for this repo is already defined in `render.yaml`:

- `rootDir`: `avtoborsa`
- `buildCommand`: `npm ci && npm run build`
- `staticPublishPath`: `dist`
- SPA rewrite: `/* -> /index.html` (required for `BrowserRouter`)

## Required env var

Set this in the Render Static Site:

- `VITE_API_BASE_URL=https://<your-backend>.onrender.com`

Example:

`VITE_API_BASE_URL=https://karbg-backend.onrender.com`

## If you configure manually in Render UI

- Service type: `Static Site`
- Root directory: `avtoborsa`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Rewrite rule: `/*` to `/index.html`

## Backend side requirement

In backend Render env, set:

- `FRONTEND_BASE_URL=https://<your-frontend>.onrender.com`

This keeps CORS/CSRF aligned with the frontend domain.
