# Family Shopping List

A shared shopping list for the whole family. Built as a PWA (installable from the browser), accessible via URL on any device.

## Stack

- **Frontend:** Angular + Ionic + Tailwind CSS, hosted on Vercel
- **Backend:** NestJS, hosted on Render
- **i18n:** English, Polish, Ukrainian (auto-detected from device language)
- **Offline:** Service worker caches the app shell and last API response

## Project Structure

```
apps/
  web/    # Angular PWA frontend
  api/    # NestJS backend
.github/
  workflows/
    ci-cd.yml   # lint → test → build → deploy on push to main
```

## Local Development

### Prerequisites

- Node.js 22+
- npm 10+

### Install all dependencies

```bash
npm install
```

### Run the backend

```bash
cd apps/api
npm run start:dev
# API available at http://localhost:3000
```

### Run the frontend

```bash
cd apps/web
npm run start
# App available at http://localhost:4200
```

The frontend in development mode points to `http://localhost:3000` for the API.

## Environment Variables

### Backend (`apps/api`)

Copy `.env.example` to `.env` and fill in values:

```
PORT=3000
ALLOWED_ORIGIN=http://localhost:4200
```

In production these are set in the Render dashboard (never committed).

### Frontend (`apps/web`)

The `API_BASE_URL` is injected at build time via the GitHub Actions environment.  
Locally it defaults to `http://localhost:3000` in `environment.ts`.

## GitHub Secrets (required for CI/CD)

Set these in your GitHub repository → Settings → Secrets and variables → Actions:

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel CLI authentication |
| `VERCEL_ORG_ID` | Vercel organisation ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook (triggers backend deploy) |
| `API_BASE_URL` | Public Render URL, e.g. `https://family-api.onrender.com` |

## CI/CD

Pushing to `main` triggers GitHub Actions:
1. Lint API and frontend
2. Run tests
3. Build both apps
4. Deploy frontend to Vercel
5. Deploy backend to Render

