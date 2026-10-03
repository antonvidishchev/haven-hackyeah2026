# Haven

Haven is a safe, low-barrier way for residents of Kraków to report social-safety incidents —
mainly anti-immigrant and xenophobic harassment — and get routed to the right kind of human help.
Built for the HackYeah 2026 **Smart City** open task.

> **Prototype.** All organisations, people and resources are fictional, and no real services are
> contacted. In danger, call **112**.

The full implementation plan lives in [`docs/plans/implementation-plan.md`](docs/plans/implementation-plan.md).

## Repository layout

| Path                  | What                                                              |
| --------------------- | ----------------------------------------------------------------- |
| `apps/api`            | NestJS 12 (Fastify) API on port 3001, prefix `/api/v1`, SurrealDB |
| `apps/web`            | Next.js 16 (App Router) web app on port 3000                      |
| `apps/mobile`         | Expo (expo-router) resident app, runs in Expo Go                  |
| `packages/shared`     | zod schemas, enums and pure domain logic shared by every app      |
| `packages/api-client` | Typed fetch client (`createHavenClient`)                          |
| `compose.yaml`        | SurrealDB; plus `migrate`, `api`, `web` under the `full` profile  |

## Prerequisites

- Node.js 24 LTS or newer (`.nvmrc`)
- pnpm 12 (`npm install -g pnpm@12`)
- Docker with Compose v2
- For mobile: the Expo Go app on a phone on the same network as your laptop

## Setup

```bash
cp .env.example .env      # adjust if needed (see below)
pnpm install
pnpm db:up                # start SurrealDB in Docker
pnpm db:migrate           # apply migrations
pnpm db:seed              # load demo fixtures
pnpm dev                  # API on :3001 and web on http://127.0.0.1:3000
```

Open **http://127.0.0.1:3000** (use `127.0.0.1`, not `localhost` — it is the canonical origin
for cookies and CORS).

If port 8000 is already taken, set `SURREAL_HOST_PORT` in `.env` and point `SURREAL_URL` at the
same port.

## Commands

| Command           | What it does                                                                  |
| ----------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`        | Builds the shared packages, then runs them in watch mode with the API and web |
| `pnpm db:up`      | Starts SurrealDB (Docker) and waits until it is healthy                       |
| `pnpm db:down`    | Stops the Compose services (data stays in the `surreal-data` volume)          |
| `pnpm db:migrate` | Applies pending migrations from `apps/api/migrations`                         |
| `pnpm db:seed`    | Loads idempotent demo fixtures                                                |
| `pnpm db:reset`   | Wipes and recreates the database — requires `HAVEN_CONFIRM_RESET=yes`         |
| `pnpm demo:up`    | Builds and runs everything in containers (`docker compose --profile full up`) |
| `pnpm demo:down`  | Stops the containerised demo                                                  |
| `pnpm mobile`     | Starts the Expo dev server; scan the QR code with Expo Go                     |
| `pnpm typecheck`  | Type-checks every workspace                                                   |
| `pnpm lint`       | Lints every workspace                                                         |
| `pnpm test`       | Runs the Vitest unit tests                                                    |
| `pnpm e2e`        | Runs the Playwright smoke suite (starts API and web if they are not running)  |
| `pnpm format`     | Formats the repository with Prettier                                          |

First Playwright run: `pnpm --filter @haven/web exec playwright install chromium`.

## Demo accounts

`pnpm db:seed` creates these **fictional demo fixtures**. Their passwords are public — never put
real data behind them. The sign-in page also offers one-tap cards for each.

| Username             | Password          | Role     | Name                       | Organisation        |
| -------------------- | ----------------- | -------- | -------------------------- | ------------------- |
| `resident`           | `HavenResident1!` | resident | Local Resident             | —                   |
| `resident2`          | `HavenResident2!` | resident | Second Resident            | —                   |
| `operator`           | `HavenOperator1!` | operator | Local Operator             | —                   |
| `admin`              | `HavenAdmin1!`    | admin    | Local Administrator        | —                   |
| `official-police`    | `HavenOfficial1!` | official | Police Liaison Official    | police_municipal    |
| `official-support`   | `HavenOfficial1!` | official | Support Services Official  | professional_paid   |
| `official-volunteer` | `HavenOfficial1!` | official | Volunteer Network Official | community_volunteer |

Visitors don't need an account: opening a reporting page creates a guest session automatically.
Residents land on the home page, operators and admins on the response queue, officials on their
assigned cases. Staff accounts sign in on the web only.

## Mobile

Expo reads its own env file. Create `apps/mobile/.env` with your laptop's LAN address so the
phone can reach the API (the API listens on `0.0.0.0`), then run `pnpm mobile`:

```bash
echo "EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3001/api/v1" > apps/mobile/.env
```

## Environment

See [`.env.example`](.env.example). `JWT_SECRET` there is a demo value; generate your own for
anything beyond local use (`openssl rand -hex 32`).
