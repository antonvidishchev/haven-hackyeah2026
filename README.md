# Haven

Haven is a safe, low-barrier way for residents of Kraków to report social-safety incidents —
mainly anti-immigrant and xenophobic harassment — and get routed to the right kind of human help.
Built for the HackYeah 2026 **Smart City** open task.

> **Prototype.** All organisations, people and resources are fictional, and no real services are
> contacted. In danger, call **112**.

Harassment on trams, at stops and in neighbourhoods mostly goes unreported, because the only
options feel like "call the police" or "say nothing". Haven is the middle path:

- **Residents** report in under a minute, without an account if they like, in English or Polish,
  on the web or in the Expo app. They can add photos, video or audio and follow replies.
- A deterministic **Smart Router** (explainable rules, not AI) sends each filed report to the
  right kind of human help: a volunteer network, a professional support service, or, only for an
  emergency with a weapon, a police coordination unit.
- **Operators** triage every case: send it to an organisation, ask the resident for more, or
  cancel it with a neutral notice. A simulated advisory suggestion can be followed in one click.
- **Officials** claim cases for their organisation, record what they did outside Haven and close
  them. **Admins** read an append-only audit log.
- **Support matchmaking** links each report to fictional local help, with "matched because…".
- **Area reports** show privacy-protected counts per district (fewer than 3 reports are
  suppressed). It is never a safety score.

More: [demo script](docs/demo-script.md) · [pilot estimate](docs/pilot-estimate.md) ·
[submission package](docs/submission.md)

## Architecture

```text
 Resident (web, Expo Go)        Operator / Official / Admin (web)        Public (web)
            │                                  │                              │
            ▼                                  ▼                              ▼
   ┌──────────────────┐  HttpOnly cookie  ┌──────────────────────────────────────────┐
   │ Expo app         │                   │ Next.js 16 web (App Router, next-intl)   │
   │ expo-router      │                   │ server components + server actions       │
   └────────┬─────────┘                   └──────────────────┬───────────────────────┘
            │ Bearer JWT (SecureStore)                       │ Bearer JWT
            ▼                                                ▼
   ┌─────────────────────────────────────────────────────────────────────────────────┐
   │ NestJS 12 API (Fastify)  /api/v1                                                │
   │ auth + role guards · reports + revisions · evidence (multipart, SHA-256)        │
   │ Smart Router + case creation · operator / official workflows · audit · matching │
   └───────────────┬──────────────────────────────────────────────┬──────────────────┘
                   │ SurrealDB SDK                                │ local disk
                   ▼                                              ▼
          ┌─────────────────┐                            ┌─────────────────┐
          │ SurrealDB 3     │                            │ evidence volume │
          └─────────────────┘                            └─────────────────┘

 packages/shared: zod schemas, enums, Smart Router, case rules, k-anonymity, matchmaking, i18n labels
 packages/api-client: typed fetch client used by web and mobile
```

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
| `pnpm mobile`     | Prints the LAN API address, then starts Expo; scan the QR code with Expo Go   |
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

## Demo data

Besides the accounts, `pnpm db:seed` creates (once; re-running leaves them as the demo left them):

- three filed reports in III Prądnik Czerwony, so Area reports has a district above the privacy
  threshold;
- eight showcase reports, one per state the demo walks through:

| Report (district)                  | State                                                     | Owner     |
| ---------------------------------- | --------------------------------------------------------- | --------- |
| Shouting on a tram (I)             | Draft                                                     | resident  |
| Insults on tram 8 (I)              | Needs review, recommendation "transfer to NGO"            | fictional |
| Landlord refused a viewing (II)    | Awaiting resident, with a request for the recording       | resident  |
| Knife threat at a bus stop (IV)    | Needs review, **Top priority**, police coordination unit  | fictional |
| Intimidation near the market (V)   | Sent to volunteers, claimed, phone call recorded          | fictional |
| Hate symbols by the river (VIII)   | Closed by the volunteer official                          | fictional |
| Duplicate of the tram 8 report (I) | Cancelled as a duplicate, resident got the neutral notice | fictional |
| Abusive comments online (VI)       | Needs review                                              | resident2 |

The 25 support resources are fictional too.

## Real vs simulated

| Area                    | Real in the prototype                                                       | Simulated or out of scope                                  |
| ----------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Reporting               | Guest and account drafts, autosave, revisions, history, filing references   | Offline drafts                                             |
| Evidence                | Upload with type and size limits, SHA-256, authorised playback              | Malware scanning, retention, legal holds, export           |
| Routing                 | Deterministic, versioned Smart Router with a digest of the rules            | Dispatch: no institution, email or SMS is ever contacted   |
| Advisory recommendation | Rule-based fixture, stored immutably, with dispositions in the audit trail  | Any real AI or LLM call                                    |
| Escalation              | Recorded on the report and in the queue                                     | Identity verification (a demo checkbox)                    |
| Staff workflows         | Operator, official and admin flows with optimistic concurrency and audit    | Real organisations; all are fictional                      |
| Area reports            | Counts per Kraków district with k=3 suppression                             | —                                                          |
| Matchmaking             | Keyword and tag scoring with SurrealDB full-text search, "matched because…" | The resources themselves                                   |
| Location                | Kraków district boundaries, map pin, device location (mobile)               | Third-party geocoding                                      |
| Mobile                  | Expo Go app: report, evidence, in-app audio and video capture, My reports   | Background recording; staff screens are web-only           |
| Deployment              | Docker Compose (`pnpm demo:up`)                                             | Cloud hosting, guest-to-account transfer, grant management |

## Accessibility

The design targets WCAG 2.1 AA: verified colour contrast in light and dark themes, landmarks and
a skip link, `aria-current` navigation, polite live regions for autosave and uploads, 44 px
resident touch targets, reduced motion, and full EN/PL copy. `e2e/a11y.spec.ts` runs axe (WCAG
2.1 A/AA rules) on the public, resident, operator, official and admin pages.

## Mobile

Expo reads its own env file. Copy [`apps/mobile/.env.example`](apps/mobile/.env.example) to
`apps/mobile/.env` and set your laptop's LAN address so the phone can reach the API (the API
listens on `0.0.0.0`). `pnpm mobile` prints the address to use, then starts Expo:

```bash
cp apps/mobile/.env.example apps/mobile/.env   # then edit the address
pnpm mobile
```

The app covers the resident side: report (what, where with a map pin or current location,
evidence), file, follow messages and support matches, escalate, and capture audio or video in the
app. Staff use the web app.

## Environment

See [`.env.example`](.env.example). `JWT_SECRET` there is a demo value; generate your own for
anything beyond local use (`openssl rand -hex 32`).

## Third-party data and services

- **Kraków district boundaries** (`packages/shared/src/data/krakow-districts.ts`) are converted
  from [andilabs/krakow-dzielnice-geojson](https://github.com/andilabs/krakow-dzielnice-geojson),
  with coordinates rounded to 5 decimals. The repository publishes no licence; its README invites
  reuse ("Use it and build great apps for locals!").
- **Maps** use [Leaflet](https://leafletjs.com/) (BSD-2-Clause) through
  [React Leaflet](https://react-leaflet.js.org/) (Hippocratic License 2.1), with tiles from
  [OpenStreetMap](https://www.openstreetmap.org/copyright) (© OpenStreetMap contributors, ODbL),
  used under the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) for
  this low-traffic prototype.
- **Accessibility checks** use [axe-core](https://github.com/dequelabs/axe-core) (MPL-2.0)
  through `@axe-core/playwright`.

The full list of tools, libraries and the AI disclosure is in
[`docs/submission.md`](docs/submission.md).
