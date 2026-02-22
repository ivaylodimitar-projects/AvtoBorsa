# Vercel Frontend Setup (with API proxy to EC2 Nginx)

## 1) Update API domain in `vercel.json`

File: `avtoborsa/vercel.json`

Replace all `https://api.example.com` with your real backend domain, for example:

`https://api.your-domain.com`

## 2) Vercel env vars

Set in Vercel Project -> Settings -> Environment Variables:

- `VITE_API_BASE_URL=https://your-frontend.vercel.app`
- Optional WS direct fallback:
  - `VITE_WS_BASE_URL=wss://api.your-domain.com`

Why `VITE_API_BASE_URL` points to frontend domain:
- frontend requests become same-origin (`/api/...` on Vercel),
- Vercel rewrites forward them to EC2 Nginx backend.

## 3) Build settings

- Framework preset: `Vite`
- Root directory: `avtoborsa`
- Build command: `npm run build`
- Output directory: `dist`

## 4) Re-deploy after env/config changes

Every change in:
- `vercel.json`
- `VITE_*` environment variables

requires a new deploy on Vercel.
