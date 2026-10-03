# Haven

**A safe middle path for reporting harassment and discrimination in Kraków.**
Built from scratch for the HackYeah 2026 **Smart City** open task.

**Live demo:** <https://haven-hackyeah.polandcentral.cloudapp.azure.com/>. You can report without an
account. To try the staff roles, use the one-tap demo cards on **Sign in**.

> **Prototype.** All organisations, people and resources are fictional, and no real services are
> contacted. In danger, call **112**.

## The problem

A person harassed on a tram, at a stop or in their neighbourhood often feels they have two
options: "call the police" (slow, intimidating, fear of retaliation) or "say nothing". Most say
nothing.

- A [nationwide study of women in Poland](https://czasopisma.inp.pan.pl/index.php/bk/article/view/5715)
  found that one in ten had experienced stalking and one in eight sexual harassment at work. Only
  15% reported the incidents to the police.
- [Police figures cited in the press](https://notesfrompoland.com/2026/07/17/reported-hate-crimes-against-ukrainians-in-poland-up-30-this-year/)
  show roughly 30% more hate-crime reports involving Ukrainians in the first half of 2026 than a
  year earlier.

These figures measure different harms, not a single Kraków trend. The common thread is a city
problem: when speaking up feels risky or complicated, residents miss out on support, and the
city's services can't see where help is needed.

## What Haven does

Haven gives residents a low-barrier way to tell someone, and makes sure a human answers.

- **Report in a few minutes.** Residents can report as a guest or with an account, in English
  or Polish, on the web or in the Expo mobile app. A report covers verbal harassment,
  intimidation, threats, discrimination, or hate symbols and vandalism: incidents that happen
  somewhere in the city. It can include photos, video, audio and a place on the map. Drafts stay private and autosave until the
  resident chooses to file.
- **Get routed to the right kind of help.** A deterministic **Smart Router** (published rules,
  not AI) proposes a responder and a priority:
  - a volunteer network for low-severity cases
  - a professional support service for medium and high severity
  - a police coordination unit only for emergencies with a weapon, at **Top priority**
- **See help that fits now.** Each report is matched to local support services (legal aid,
  counselling, NGOs, helplines), each with a plain "matched because…".
- **A human reviews every report.** **Operators** work a prioritised queue. They send a case to
  an organisation, ask the resident for more, or close it with a neutral notice. A labelled,
  simulated advisory recommendation can be followed in one click, and whether it was followed is
  audited.
- **Partners act on it.** **Officials** of the receiving organisation claim the case, record
  what they did (a call, a visit, a referral) and close it. **Admins** read an append-only audit
  log.
- **The city sees demand, not people.** **Area reports**, the front page, show how many reports
  were filed in each of Kraków's 18 districts, filterable by incident type. Districts with fewer
  than 3 reports show no number, and exact locations are never shown.

### One report's journey

1. On tram 8 near Teatr Bagatela, a man shouts insults at a resident about their accent. Without
   signing up, the resident opens Haven on their phone, describes what happened, marks the stop
   and files. They get a reference, `HV-2026-…`.
2. The Smart Router matches rule 1 (low severity) and proposes the volunteer network. The
   resident immediately sees matched local help.
3. The operator sees the case in _Needs review_, checks the details and the advisory
   recommendation, and sends it to the volunteer network.
4. A volunteer official claims the case, records a phone call with the resident and closes it
   with an outcome.
5. The report is now one more count for I Stare Miasto on Area reports, shown only once the
   district has at least 3 reports.

See the [demo script](docs/demo-script.md) to walk through it yourself.

### Trust and privacy by design

- **Explainable:** every routing decision stores its rule, the ruleset version and a SHA-256
  digest of the rules.
- **Evidence:** fingerprinted with SHA-256, streamed only to authorised staff, and listed in a
  read-only evidence vault.
- **Accountable:** every staff decision goes into an append-only audit log, and concurrent edits
  are rejected rather than overwritten.
- **Minimal exposure:** guests need no name or contact details. Area reports use k=3
  suppression and never label a place as unsafe.
- **Accessible:** targets WCAG 2.1 AA, with axe checks on every role's pages, EN/PL, light and
  dark themes, and 44 px touch targets.

### What's next

- An AI-assisted guide that helps a stressed resident capture the details and evidence that
  matter.
- AI-supported triage that recommends a priority and next step for the operator to confirm.
- A governed Evidence Vault (retention, legal holds, export) hardened to stand as evidence in
  court.
- Real integrations with official organisations, NGOs and volunteer groups, plus Ukrainian copy.
- A 6-month pilot in three districts (I Stare Miasto, II Grzegórzki, XIII Podgórze) for about
  500,000 PLN. See the [pilot estimate](docs/pilot-estimate.md).

More: [pitch deck](docs/pitch/haven-pitch.pdf) · [submission package](docs/submission.md)

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
Residents land on Area reports (the reporting start page is `/start`), operators and admins on the response queue, officials on their
assigned cases. Staff accounts sign in on the web only.

## Demo data

Besides the accounts, `pnpm db:seed` creates (once; re-running leaves them as the demo left them):

- three filed reports in III Prądnik Czerwony, which the e2e suite counts on;
- about 320 closed history reports from January to September 2026, spread over the districts
  with a different pattern per incident type (verbal harassment in the centre, discrimination
  where students rent, hate symbols on the eastern estates), so each Area reports filter shows its
  own map. Their cases are in the operator's Handled tab and the officials' finished cases;
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
| Abuse from a neighbour (VI)        | Needs review                                              | resident2 |

The 25 support resources are fictional too.

## Real vs simulated

| Area                    | Real in the prototype                                                       | Simulated or out of scope                                |
| ----------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| Reporting               | Guest and account drafts, autosave, revisions, history, filing references   | Offline drafts                                           |
| Evidence                | Upload with type and size limits, SHA-256, authorised playback              | Malware scanning, retention, legal holds, export         |
| Routing                 | Deterministic, versioned Smart Router with a digest of the rules            | Dispatch: no institution, email or SMS is ever contacted |
| Advisory recommendation | Rule-based fixture, stored immutably, with dispositions in the audit trail  | Any real AI or LLM call                                  |
| Escalation              | Recorded on the report and in the queue                                     | Identity verification (a demo checkbox)                  |
| Staff workflows         | Operator, official and admin flows with optimistic concurrency and audit    | Real organisations; all are fictional                    |
| Area reports            | Counts per Kraków district and incident type with k=3 suppression           | —                                                        |
| Matchmaking             | Keyword and tag scoring with SurrealDB full-text search, "matched because…" | The resources themselves                                 |
| Location                | Kraków district boundaries, map pin, device location (mobile)               | Third-party geocoding                                    |
| Mobile                  | Expo Go app: report, evidence, in-app audio and video capture, My reports   | Background recording; staff screens are web-only         |
| Deployment              | Docker Compose (`pnpm demo:up`); one Azure VM with Caddy and HTTPS (web)    | Guest-to-account transfer, grant management              |

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

## Deploying to Azure

A single VM with Docker Compose and automatic HTTPS, for a public web demo: see
[`deploy/azure/README.md`](deploy/azure/README.md). The live demo runs at
<https://haven-hackyeah.polandcentral.cloudapp.azure.com/>. Only the web app is public; the mobile
app needs a local API (see [Mobile](#mobile)).

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

## Credits

Made by Anton Vidishchev for HackYeah 2026. The ring-tailed lemur in the credit bar at the top of
every page is the team's mascot.
