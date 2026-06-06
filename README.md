# Family Shopping List

A shared shopping list for the whole family. Built as a PWA (installable from the browser), accessible via URL on any device.

## Stack

- **Frontend:** Angular + Ionic + Tailwind CSS, hosted on Vercel
- **Backend:** NestJS + Prisma + PostgreSQL, hosted on Render
- **Auth:** Email magic links (Brevo)
- **i18n:** English, Polish, Ukrainian (auto-detected from device language)
- **Offline:** Service worker caches app shell; member context cached in localStorage

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
- Remote PostgreSQL dev database (see Infrastructure below)

### Install all dependencies

```bash
npm install
```

### Configure backend environment

```bash
cp apps/api/.env.example apps/api/.env
```

Fill in values from your GitHub dev secrets (same values as `DATABASE_URL_DEV`, `JWT_*_DEV`, etc.).

Apply migrations to the dev database:

```bash
cd apps/api
npm run prisma:migrate:dev
```

### Run the backend

```bash
cd apps/api
npm run start:dev
# API available at http://localhost:3000
```

Magic links and invite emails are logged to the API console when `BREVO_API_KEY` is not set.

### Brevo setup (email)

The app uses [Brevo](https://www.brevo.com) (free tier: 300 emails/day) for magic-link login and family invite emails. No custom domain required — verify a sender email you own (e.g. your Gmail).

#### 1. Create a Brevo account

1. Go to [https://www.brevo.com](https://www.brevo.com) and click **Sign up free**.
2. Register with your email (e.g. `you@gmail.com`). No credit card required.
3. Complete email confirmation if Brevo sends one.
4. Log in to the Brevo dashboard.

#### 2. Verify a sender email

Brevo will only send mail from addresses you have verified.

1. In the left sidebar, open **Settings** (gear) → **Senders, domains & dedicated IPs** → **Senders**  
   (or go to [https://app.brevo.com/senders](https://app.brevo.com/senders))
2. Click **Add a sender**.
3. Enter:
   - **From name:** `Family Shopping List` (or any name)
   - **From email:** the Gmail (or other) address you want emails to come from — must be an inbox you can open
4. Click **Save**.
5. Brevo sends a verification email to that address. Open it and click the confirmation link.
6. Wait until the sender status shows **Verified**.

Use this exact email in `EMAIL_FROM` locally and in GitHub Variables.

#### 3. Create an API key

1. In the sidebar, open **Settings** → **SMTP & API** → **API keys & MCP**  
   (or [https://app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api))
2. Click **Generate a new API key**.
3. Name it e.g. `family-shopping-list-local`.
4. Copy the key immediately (shown once). It looks like `xkeysib-...`.
5. For production, create a separate key (e.g. `family-shopping-list-prod`) and store it as the GitHub secret `BREVO_API_KEY`.

#### 4. Configure the API

In `apps/api/.env`:

```env
BREVO_API_KEY=xkeysib-your-key-here
EMAIL_FROM=Family Shopping List <you@gmail.com>
```

`EMAIL_FROM` must use the **same email** you verified in step 2.

Restart `npm run start:dev` after changing `.env`.

#### 5. GitHub (production)

- **Secret:** `BREVO_API_KEY` — your production API key (replace old `RESEND_API_KEY` if present)
- **Variable:** `EMAIL_FROM` — e.g. `Family Shopping List <you@gmail.com>`

#### Troubleshooting

| Issue | Fix |
|-------|-----|
| `401` / invalid API key | Regenerate key; check no extra spaces in `.env` |
| Sender not verified | Finish step 2; `EMAIL_FROM` must match verified sender |
| Email not received | Check spam; confirm recipient under 300/day limit |
| Local dev without Brevo | Leave `BREVO_API_KEY` empty; links print in API terminal |

### Run the frontend

```bash
cd apps/web
npm run start
# App available at http://localhost:4200
```

The frontend in development mode points to `http://localhost:3000` for the API.

## Environment Variables

### Backend (`apps/api/.env`)

See [`apps/api/.env.example`](apps/api/.env.example). Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Remote dev Postgres connection string |
| `JWT_ACCESS_SECRET` | Signs access tokens |
| `JWT_REFRESH_SECRET` | Used for refresh token storage validation |
| `APP_WEB_URL` | Frontend URL for magic links (`http://localhost:4200` locally) |
| `ALLOWED_ORIGIN` | CORS origin (`http://localhost:4200` locally) |
| `BREVO_API_KEY` | Optional locally; omit to log magic links / invite links to console |
| `EMAIL_FROM` | Verified Brevo sender, e.g. `Family Shopping List <you@gmail.com>` |

Production values are synced from GitHub Actions to Render on each deploy.

### Frontend (`apps/web`)

The `API_BASE_URL` is injected at build time via GitHub Actions.  
Locally it defaults to `http://localhost:3000` in `environment.ts`.

## Infrastructure setup

1. Create **two Render PostgreSQL** databases:
   - `fsl-dev` — used locally and in CI tests
   - `fsl-prod` — used in production
2. Create a **Brevo** account (free tier) and verify a sender email — see [Brevo setup](#brevo-setup-email) above
3. Add GitHub secrets and variables (see below)
4. Get `RENDER_API_KEY` and `RENDER_SERVICE_ID` from the Render dashboard

Local development uses the **dev** database via `DATABASE_URL` in `apps/api/.env`.  
Production uses the **prod** database, migrated on deploy via `prisma migrate deploy`.

## GitHub Secrets (required for CI/CD)

Set these in your GitHub repository → Settings → Secrets and variables → Actions:

### Secrets

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel CLI authentication |
| `VERCEL_ORG_ID` | Vercel organisation ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `RENDER_DEPLOY_HOOK_URL` | Render deploy hook (triggers backend deploy) |
| `RENDER_API_KEY` | Render API key (sync env vars from CI) |
| `RENDER_SERVICE_ID` | Render web service ID |
| `API_BASE_URL` | Public Render URL, e.g. `https://family-api.onrender.com` |
| `DATABASE_URL_DEV` | Dev Postgres URL (CI tests; copy to local `.env`) |
| `DATABASE_URL_PROD` | Prod Postgres URL (migrations + Render runtime) |
| `JWT_ACCESS_SECRET_DEV` | Dev JWT access secret |
| `JWT_ACCESS_SECRET_PROD` | Prod JWT access secret |
| `JWT_REFRESH_SECRET_DEV` | Dev JWT refresh secret |
| `JWT_REFRESH_SECRET_PROD` | Prod JWT refresh secret |
| `BREVO_API_KEY` | Brevo API key for magic-link and invite emails |

### Variables

| Variable | Purpose |
|----------|---------|
| `EMAIL_FROM` | Verified sender, e.g. `Family Shopping List <you@gmail.com>` |
| `APP_WEB_URL_PROD` | Production Vercel URL |
| `ALLOWED_ORIGIN_PROD` | Same as production Vercel URL |

## CI/CD

Pushing to `main` triggers GitHub Actions:

1. Lint API and frontend
2. Run tests (API tests use `DATABASE_URL_DEV`)
3. Generate Prisma client and build API
4. Run `prisma migrate deploy` against prod
5. Sync Render env vars from GitHub secrets
6. Deploy backend to Render
7. Build and deploy frontend to Vercel

## Auth flow (current scope)

1. User enters email on `/login` → magic link sent
2. User clicks link → `/auth/verify` → session created
3. New users complete `/onboarding/family` (family name + username)
4. Home shows personalized welcome from `GET /me/context`
5. Same email on another device → login only, same family context
6. Offline: cached username and family name shown when refresh token exists
