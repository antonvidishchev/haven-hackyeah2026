# Haven — implementation plan

## Context

**Haven** is a safe, low-barrier way for residents of Kraków to report social-safety incidents, mainly anti-immigrant and xenophobic harassment. These incidents usually go unreported, because today the only options are "call the police" (slow, risky, fear of retaliation) or "say nothing". Haven is the middle path:

- A resident can report anonymously, without signing in.
- They can attach photos, audio or video.
- A deterministic **Smart Router** sends the report to the right kind of human help: a community volunteer, a professional support service, or (only for an emergency involving a weapon) a police coordination unit.
- An operator triages every filed report: promote it to a responder organisation, cancel it, or ask the resident for more information.
- An official from the receiving organisation claims the case, records what they did outside Haven, and closes it.
- The public sees only privacy-protected counts per district (**Area reports**, k=3 suppression). It is never a safety score.
- A **support matchmaking** module links each report to fictional local help resources that fit it.

This answers the HackYeah 2026 "HubMi.pl" partner task (Małopolska Social Innovation Hub). Matchmaking is that task's mandatory module. Judges weigh accessibility (WCAG 2.1 AA), intuitiveness for any age, how fast the admin side hears about a new item, and how the reply gets back to the author.

The repository `haven-hackyeah2026` is empty apart from a README. Everything is built from scratch here.

## Decisions (agreed with the user)

| Topic | Decision |
|---|---|
| Clients | Next.js web app (resident, staff, public) and an Expo resident app (Expo Go compatible, no custom native modules) |
| Backend | Standalone NestJS (Fastify adapter) API with SurrealDB as the only database. No external identity provider, no PostgreSQL |
| Auth | Login page with hardcoded users. API issues a signed JWT (HS256, `jose`). Web keeps it in an HttpOnly cookie; mobile sends it as a Bearer token from SecureStore |
| Guests | Anonymous guest mode stays. A guest token identifies the owner. There is **no** transfer of guest reports to an account |
| Authorization | Role-based guards only (resident / operator / official / admin). Officials are scoped to their organisation. No purpose grants, no re-authentication |
| Login UX | Username/password form plus one-click demo-user cards |
| Evidence | Simple multipart upload (type and size limits, SHA-256) to a local disk volume. Playback through an authorised media route. No chunking, worker, retention or legal holds |
| AI advisory | Deterministic rule-based recommendation fixture, with a "Follow recommendation" shortcut |
| Staff features | Operator queue and decisions, evidence vault, official cases, append-only audit events, admin audit-log page |
| Admin | Operator powers plus a read-only audit log |
| Officials | One official per destination organisation (3) |
| Residents | Two resident accounts, to demo owner isolation |
| Resident extras | Report revisions and history, escalation (simulated verification), System/Light/Dark theme. No staff "resident view" switch |
| Language | English (default) and Polish, with a language switch |
| Contract | Shared zod schemas and types in `packages/shared`, plus a hand-written typed fetch client in `packages/api-client`. No code generation |
| Matchmaking | Seeded catalogue of fictional support resources, matched by keyword and tag scoring through SurrealDB full-text search, with an explainable "matched because…" |
| Report categories | Expanded harassment set (listed below) |
| Mobile map | `react-native-maps` (works in Expo Go) |
| Dev loop | Hybrid: Compose runs SurrealDB; `pnpm dev` runs API and web with hot reload; a Compose `full` profile runs everything for the demo |
| Deploy | Local Docker Compose only |
| Versions | Latest stable of each tool at implementation time; Node current LTS; pnpm workspaces |
| Testing | Vitest unit tests, plus one Playwright smoke spec that grows each phase, plus an acceptance checklist per phase |

## Domain reference (applies across all phases)

### Hardcoded users (seeded into SurrealDB, passwords hashed with scrypt)

All passwords are demo fixtures; the README must say so.

| Username | Password | Role | Organisation | Display name |
|---|---|---|---|---|
| `resident` | `HavenResident1!` | resident | — | Local Resident |
| `resident2` | `HavenResident2!` | resident | — | Second Resident |
| `operator` | `HavenOperator1!` | operator | — | Local Operator |
| `admin` | `HavenAdmin1!` | admin | — | Local Administrator |
| `official-police` | `HavenOfficial1!` | official | `police_municipal` | Police Liaison Official |
| `official-support` | `HavenOfficial1!` | official | `professional_paid` | Support Services Official |
| `official-volunteer` | `HavenOfficial1!` | official | `community_volunteer` | Volunteer Network Official |

### Destination organisations (all fictional)

| id | Display name |
|---|---|
| `police_municipal` | District Police Coordination Unit (fictional) |
| `professional_paid` | Kraków Community Support Services (fictional) |
| `community_volunteer` | Neighborhood Volunteer Network (fictional) |

### Report fields

| Field | Values and rules |
|---|---|
| `category` | `unclassified` (default) · `verbal_harassment` · `physical_intimidation` · `threat` · `discrimination` · `online_harassment` · `vandalism_hate_symbols` · `other` |
| `severity` | `low` · `medium` · `high` · `emergency` |
| `weaponOrImmediateThreat` | boolean. Invariant: `(severity === "emergency") === weaponOrImmediateThreat`. Choosing emergency ticks it; ticking it sets emergency |
| `isRepeatIncident` | boolean |
| `eventTime` | ISO datetime, optional |
| `description` | ≤ 10,000 characters. Optional if evidence is attached |
| Location | `location {lat,lng} \| null`, `locationLabel` (place description, e.g. "between Długa and Basztowa"), `zoneId` (district I–XVIII). A pin inside Kraków sets the district and locks the picker; a pin outside unlocks it; removing the pin keeps the district |

**Drafts** need nothing.

**Filing** needs all of:
- a district;
- a pin or a place description;
- a description or at least one evidence file.

The UI shows a live "Required to file" checklist. The server is the authority.

Severity, weapon and repeat are **locked after filing**. Evidence cannot be deleted after filing.

**Reference format:** `HV-YYYY-NNNNNN`, allocated atomically at filing.

### Smart Router (pure function in shared, deterministic, "not AI")

Rules are evaluated in order; the first match wins.

| Rule | Condition | Responder | Confirmation | Auto-dispatch | Queue |
|---|---|---|---|---|---|
| `router-rule-1` | low | community_volunteer | no | no | normal |
| `router-rule-2` | medium, has evidence | professional_paid | no | no | normal |
| `router-rule-3` | medium, no evidence | professional_paid | **required** | no | normal |
| `router-rule-4` | high | professional_paid | no | no | fast_laned |
| `router-rule-5` | emergency (and therefore weapon) | police_municipal | no | **yes (simulated)** | jumps_queue |

**Modifier:** a medium repeat incident gets queue `expedited`.

**Ruleset metadata:** `ruleset_version = "router-rules-v1"`, `ruleset_digest = sha256(JSON(rules))`.

**UI labels:**
- `jumps_queue` is shown as "Top priority".
- The result always carries "Prototype simulation — no services are contacted".
- Emergency results add "Residents in danger should call 112."

### Advisory recommendation fixture (`AI_RECOMMENDATION_MODE=local|disabled`, default `local`)

Computed once, at filing, from metadata only (never media).

| Order | Condition | Action |
|---|---|---|
| 1 | Description mentions evidence (EN `evidence`, `video`, `photo`, `recording`; PL `dowód`, `nagranie`, `zdjęcie`, `film`) | `request_more_evidence` |
| 2 | Category is in {verbal_harassment, physical_intimidation, discrimination, online_harassment} and severity is low or medium | `transfer_to_ngo` |
| 3 | Otherwise | `none` (status `abstained`) |

- The record is immutable: action, status, confidence 0.5, rationale, `simulated-local-v1`, input and output hashes.
- The UI label is "Simulated local recommendation".
- It never suggests cancellation or police.
- Residents never see it.

### Case triage

| Event | Case state | Triage view |
|---|---|---|
| Filing | `open` | Needs review |
| Operator replies with `request_information` | — | Awaiting resident |
| Resident then edits the report or adds evidence | — | Needs review |
| Operator sends `comment` | unchanged | unchanged |
| Operator **promotes** to an organisation (with a reason) | — | Handled (organisation changes, assignment reset) |
| Operator **cancels** (reason `spam` · `duplicate` · `not_actionable` · `other`, plus a required internal comment) | `cancelled` (terminal) | Handled |

On cancellation the resident receives a fixed neutral closure notice, and the report leaves the Area reports counts.

**Follow AI recommendation** opens a confirm dialog with an editable prefill:
- `request_more_evidence` becomes a request-information reply.
- `transfer_to_ngo` becomes a promotion to an organisation the operator chooses.

Each decision stores a recommendation disposition of `followed`, `rejected` or `different`. Manual decisions made while a recommendation is present are stored as `different`.

**Officials** see open cases for their own organisation:
- **Claim:** assigns the case to themselves; state becomes `in_review`.
- **Record external action:** `phone_call` · `site_visit` · `referral` · `meeting` · `other`, plus a note.
- **Close:** a comment is required; the case becomes `closed` (terminal) and cannot be reopened.
- Cancelled cases are read-only.

**Concurrency:** every case mutation carries `expectedVersion`. A mismatch returns 409 `stale_version` or `case_closed`. The UI offers "Reload case" and "Back to queue".

### Area reports

- All 18 Kraków districts (I Stare Miasto … XVIII Nowa Huta) are shown. Counts below 3 are shown as "below privacy threshold".
- Only filed, non-cancelled reports are counted. Drafts and exact coordinates never reach the public.
- Polygons come from the public `andilabs/krakow-dzielnice-geojson` dataset (`cartodb_id` 1–18 maps to districts I–XVIII). It is vendored into `packages/shared/src/data/krakow-districts.json`.
- Point-in-polygon uses ray casting with hole support (`findDistrict`). Map centre is 50.0617, 19.9373.

### Tone and copy rules (trauma-informed)

- Never force police contact or identity.
- Drafts are a "Private draft" until "File a report".
- Use neutral labels ("Unclassified", "Area reports", "Top priority").
- Every simulated element is labelled honestly: "(fictional)", "Prototype simulation — no services are contacted", "Simulated identity verification (demo stand-in)".
- "The public map is not a safety score."
- Residents see a message's kind, body and time only, never the author, organisation or AI rationale.
- All seed data is fictional.

## Architecture

```
haven-hackyeah2026/
  apps/api        NestJS + Fastify, port 3001, prefix /api/v1
  apps/web        Next.js (App Router), port 3000
  apps/mobile     Expo (expo-router), resident app
  packages/shared zod schemas, enums, router, recommendation, districts+GeoJSON,
                  geometry, hotspot aggregation, filing rules, nav access, i18n enum labels
  packages/api-client  typed fetch client (createHavenClient({baseUrl, getToken}))
  compose.yaml    surrealdb (+ api, web under profile "full"), volumes surreal-data, evidence-data
```

### API

- Validation: zod `schema.parse` in controllers, via a small `ZodPipe`.
- Data access: the `surrealdb` JS SDK through a `SurrealService`, with repositories per module.
- Migrations: versioned `NNNN_name.surql` files, each applied in a transaction and recorded in a `schema_migration` table with a checksum. `pnpm db:migrate` and `pnpm db:seed` run them.
- Modules: `auth`, `reports`, `evidence`, `routing`, `cases` (operator and official), `hotspots`, `audit`, `matchmaking`, `health`.

### Auth

- `POST /auth/login {username,password}` returns a JWT `{sub, role, org?, name}` (8 h).
- `POST /auth/guest` creates a `principal` of kind guest and returns a guest JWT (30 days).
- `GET /session` returns the current principal.
- An `AuthGuard` reads the Bearer token. `@Roles(...)` and an org-scope check handle officials. Owner checks happen in services.
- Login is rate-limited in memory: 20 attempts per minute per IP.

### Web

- Server components call the API server-side with the token from the `haven-session` cookie (guests use the `haven-guest` cookie).
- Mutations use server actions.
- Browser-side calls go through a whitelisted proxy route `/api/proxy/[...path]` (autosave, evidence upload) that attaches the token.
- `/media/[evidenceId]` streams evidence with range support and `cache-control: private, no-store`.
- Cookies are HttpOnly, SameSite=Lax. Use the canonical origin `http://127.0.0.1:3000`.

### Mobile

- Uses `packages/api-client` with `EXPO_PUBLIC_API_BASE_URL` (the laptop's LAN IP plus `:3001`).
- Stores the token in `expo-secure-store`.
- The API binds `0.0.0.0`.

### i18n

- Web: `next-intl` without locale URL prefixes; the locale is stored in the `haven-locale` cookie. The switch lives in the header and on Settings.
- Mobile: `i18next` + `react-i18next`; the locale is stored in SecureStore. The switch lives in Account.
- Enum labels (categories, severities, districts, destinations, statuses) live in `packages/shared/src/i18n/{en,pl}.ts` so web, mobile and the API use the same wording.

### SurrealDB tables (SCHEMAFULL, record links)

| Table | Contents |
|---|---|
| `principal` | kind guest/resident/operator/admin/official; username (unique, optional); password_hash; display_name; organization_id; created_at |
| `report` | owner → principal; reference (unique, optional until filed); state draft/submitted; current_revision; fields (current values); zone_id; escalated; escalated_at; submitted_at; created/updated_at. Indexes on owner and on (state, zone_id) |
| `report_revision` | report; revision; fields; author; created_at. Unique on (report, revision) |
| `report_reference_counter` | Plus a `fn::next_report_reference` function |
| `evidence` | report; owner; file_name; media_type; byte_size; sha256; storage_path; created_at |
| `routing_decision` | Immutable: report (unique); rule_id; ruleset_version; ruleset_digest; input_snapshot; result |
| `recommendation` | Immutable: report; action; status; confidence; rationale; source; input_hash; output_hash |
| `haven_case` | report (unique); routing_decision; organization_id; state open/in_review/closed/cancelled; triage_status; assigned_official; version; cancel_reason_category; cancel_comment; closure_comment; timestamps |
| `case_message` | case; kind request_information/comment/cancellation_notice; body 1–1000; created_at |
| `case_action` | case; actor; type `operator.promote` / `operator.cancel` / `operator.reply` / `official.claim` / `official.external_action` / `official.close`; payload; recommendation; disposition; prior_version; resulting_version; created_at |
| `audit_event` | Append-only: actor; actor_role; action; subject; occurred_at; meta (no free text) |
| `support_resource` | Matchmaking: see Phase 10 |
| `schema_migration` | Migration history |

## Phases

Each phase ends with:
- green `pnpm typecheck && pnpm lint && pnpm test`;
- an updated Playwright smoke spec;
- its acceptance checklist checked off.

Commit at the end of each phase.

### Phase 0 — Infrastructure and empty project

1. **Workspace:** pnpm workspace (`apps/*`, `packages/*`), root `package.json` scripts, `.nvmrc` (Node LTS), shared `tsconfig.base.json`, ESLint flat config, Prettier, `.editorconfig`, `.env.example`. Extend the existing `.gitignore`.
2. **`packages/shared`:** TypeScript library (ESM) with zod and Vitest. It exports a placeholder `version` and a sample test.
3. **`packages/api-client`:** `createHavenClient` skeleton with an `ApiError` type.
4. **`apps/api`:**
   - NestJS on the Fastify adapter, `api/v1` prefix, helmet, CORS for the web origin, pino logging.
   - zod-validated config: `PORT`, `SURREAL_URL/NS/DB/USER/PASS`, `JWT_SECRET`, `EVIDENCE_DIR`, `EVIDENCE_MAX_BYTES` (100 MiB), `AI_RECOMMENDATION_MODE`, `WEB_ORIGIN`.
   - `SurrealService`, the migration runner and CLI (`db:migrate`, `db:seed`, `db:reset` guarded by a confirm env var).
   - `GET /health/live` and `GET /health/ready` (checks SurrealDB).
   - Migration `0001_init.surql` with `schema_migration` only.
5. **`apps/web`:** `create-next-app` (TypeScript, App Router, Tailwind 4, ESLint), `shadcn init` (Base UI primitives, `base-nova` style, lucide icons), and an empty home page that calls `/health/ready` server-side.
6. **`apps/mobile`:** `create-expo-app` with the expo-router tabs template and TypeScript, running in Expo Go.
7. **`compose.yaml`:**
   - `surrealdb` (latest stable, RocksDB on the `surreal-data` volume, health check via `surreal is-ready`, port 8000).
   - Profile `full`: `migrate` one-shot, `api` (Dockerfile, depends on a healthy DB and the migration having run, `evidence-data` volume), `web` (Next standalone Dockerfile).
8. **Root scripts:** `db:up`, `db:down`, `dev` (API and web in parallel via `pnpm -r --parallel` or `concurrently`), `demo:up` (`docker compose --profile full up --build`), `mobile`.
9. **Tests:** Vitest in shared, API and web; Playwright in `apps/web/e2e` with one smoke test ("home loads, API healthy").
10. **README:** prerequisites, setup and every command.

**Done when:**
- `pnpm install && pnpm db:up && pnpm db:migrate && pnpm dev` serves the web app at :3000 showing "API: healthy".
- `pnpm demo:up` does the same in containers.
- Expo Go opens the blank tabs app.

### Phase 1 — Design system and app shells (web and mobile)

**Web tokens.** Put this verbatim in `apps/web/src/app/globals.css`:
- imports `tailwindcss`, `tw-animate-css` and `shadcn/tailwind.css`;
- `@custom-variant dark (&:is(.dark *))`;
- an `@theme inline` that maps every `--color-*` (including `warning` and `success`).

`--font-sans` is Geist and `--font-mono` is Geist Mono (via `next/font/google`). Radii scale from `--radius: 0.625rem` (sm ×0.6, md ×0.8, lg ×1, xl ×1.4, 2xl ×1.8, 3xl ×2.2, 4xl ×2.6).

```css
:root { /* Calm Haven light — WCAG AA verified pairs */
  --background:#f5f6f1; --foreground:#213c33; --card:#ffffff; --card-foreground:#213c33;
  --popover:#ffffff; --popover-foreground:#213c33; --primary:#285f4e; --primary-foreground:#ffffff;
  --secondary:#e3ece6; --secondary-foreground:#1f4a3d; --muted:#eceee7; --muted-foreground:#56665f;
  --accent:#e3ece6; --accent-foreground:#1f4a3d; --destructive:#b42318; --warning:#8a5300; --success:#285f4e;
  --border:#d9ded5; --input:#7a8880; --ring:#285f4e;
  --chart-1:#a6d4be; --chart-2:#6fa88f; --chart-3:#3f7d67; --chart-4:#285f4e; --chart-5:#173a2f;
  --radius:0.625rem; --sidebar:#edf0e9; --sidebar-foreground:#213c33; --sidebar-primary:#285f4e;
  --sidebar-primary-foreground:#ffffff; --sidebar-accent:#e3ece6; --sidebar-accent-foreground:#1f4a3d;
  --sidebar-border:#d9ded5; --sidebar-ring:#285f4e; color-scheme:light; }
.dark { /* explicit pairs, not an inversion */
  --background:#131e1a; --foreground:#e4ece7; --card:#1b2a25; --card-foreground:#e4ece7;
  --popover:#1b2a25; --popover-foreground:#e4ece7; --primary:#a6d4be; --primary-foreground:#0f221b;
  --secondary:#263a33; --secondary-foreground:#e4ece7; --muted:#22322c; --muted-foreground:#a3b3ab;
  --accent:#263a33; --accent-foreground:#e4ece7; --destructive:#f4867c; --warning:#f2c065; --success:#a6d4be;
  --border:#2f433c; --input:#6b8078; --ring:#a6d4be;
  --chart-1:#2f5446; --chart-2:#3f7d67; --chart-3:#6fa88f; --chart-4:#a6d4be; --chart-5:#d6ede1;
  --sidebar:#18251f; --sidebar-foreground:#e4ece7; --sidebar-primary:#a6d4be; --sidebar-primary-foreground:#0f221b;
  --sidebar-accent:#263a33; --sidebar-accent-foreground:#e4ece7; --sidebar-border:#2f433c; --sidebar-ring:#a6d4be;
  color-scheme:dark; }
```

**Base layer:**
- `border-border`, `outline-ring/50`, body `bg-background text-foreground`.
- Under `prefers-reduced-motion`, force every animation and transition to 0.01ms.

**Component layer** (resident density):

| Class | Styles |
|---|---|
| `.resident-page` | `mx-auto flex max-w-2xl flex-col gap-6 px-5 py-9`; h1 `text-3xl font-semibold tracking-tight`; h2 `text-lg font-semibold` |
| `.resident-card` | `rounded-2xl border bg-card p-5 shadow-xs`; children spaced `mt-3`; p `text-sm leading-relaxed text-muted-foreground` |
| `.resident-button` | `min-h-11 rounded-xl bg-primary px-5 py-3 font-medium`, 3px focus ring; `.secondary` is bordered with a card background |
| Form controls inside `.resident-page` | `mt-2 w-full rounded-lg border-input bg-card p-3 text-base`, 3px ring; checkboxes `size-5 accent-primary` |
| `.resident-reference` | mono, `tabular-nums` |
| `.resident-timeline` | left-border list |
| `.report-stages` | 3-column stepper with a 4px top border, styled for `data-state=done` and `aria-current=step` |

**Staff density:** 8–12px radii, denser tables.

**Design rules:**
- 4px spacing scale.
- Touch targets about 44px.
- Body text 16–17px for residents.
- One emphasised action per form.
- Red only for emergency, error or destructive actions; amber for attention.
- Colour is never the only signal.
- No decorative motion.

**Brand.** Create these under `apps/web/public/brand/`:
- `haven-mark.svg`: viewBox 0 0 64 64, stroke `#285f4e`, width 7, round caps and joins. Paths: `M8 27 L32 9 L56 27`, `M19 18.75 V56`, `M19 42 Q19 33 32.5 33 Q46 33 46 42 V56`.
- Dark, mono and reversed variants of the mark.
- Wordmark: the mark plus "Haven", Geist 40px, weight 600, `#213c33`, letter-spacing −0.5, at x=74 y=46 in a 236×64 viewBox.
- `app/icon.svg`: a `#285f4e` rounded square (rx 14) with the white mark at stroke 8.5, `translate(6 6) scale(.8125)`.
- `components/brand/haven-mark.tsx`: the mark drawn in `currentColor`.
- Mobile icon and splash: background `#285f4e`, splash `#f5f6f1` (dark `#131e1a`).

**shadcn primitives:** button (variants default, outline, secondary, ghost, destructive, link; default height h-11), card, badge, dialog, select, checkbox, label, input, textarea, tabs, table, radio-group.

**Haven components:** `StatusBadge`, `EmptyState`, `Field` (label + hint + error), `ConfirmDialog`, `DisclaimerCard` (112 notice), `SimulationNote`.

**Shells** (`components/navigation/app-shell.tsx`, chosen by role):

*Resident and guest shell:*
- Header (`border-b bg-card`, max-w-5xl) with the logo and a desktop nav (Home `/`, My reports `/my-reports`, Area reports `/area-reports`, Account `/settings`).
- Primary button "+ Report an incident" → `/report/new`.
- Language switch EN/PL, and a Sign in link or the user's name.
- Below `md`, a fixed bottom tab bar (icon over label, min-h-14, safe-area padding, active item `text-primary`), with content padded `calc(4.5rem + safe-area)`.

*Staff shell:*
- From `lg` up, a 16rem sticky sidebar with the logo and descriptor ("Operator workspace", "Case workspace" or "Admin workspace").
- Items: Response queue `/queue` (operator, admin), Evidence vault `/vault` (operator, admin), Assigned cases `/cases` (official), Audit log `/admin/audit` (admin), Area reports, Account.
- Below `lg`, a header with a `<details>` menu drawer.
- No footer.
- `aria-current="page"` on the active link.

**Shared navigation rules:** `packages/shared/src/navigation-access.ts` provides `canAccessPath`, `defaultLandingPath` (operator/admin → `/queue`, official → `/cases`, everyone else → `/`) and `isSafeReturnPath`.

**Theme:**
- `haven-theme` cookie: system, light or dark.
- The server adds `.dark` when needed; for "system", an inline script before first paint follows `matchMedia`.
- A radio group on Settings.

**i18n:** `next-intl` with `messages/en.json` and `messages/pl.json`, the cookie switch, and shared enum labels.

**Static pages** for every route, using real layouts with empty or fixture states:
- `/`: "Start with what you have", primary and secondary actions, a "No account needed" card, the 112 disclaimer card.
- `/login`: placeholder for now.
- `/report/new`, `/my-reports`, `/report/[id]`, `/area-reports`, `/settings`.
- Staff: `/queue`, `/queue/[id]`, `/vault`, `/cases`, `/cases/[id]`, `/admin/audit`.

**Mobile:**
- `src/constants/theme.ts`: `Colors.light` and `Colors.dark` mirror the tokens (text, background, backgroundElement, backgroundSelected, textSecondary, primary, onPrimary, secondary, border, input, destructive, warning, success). Spacing scale 2, 4, 8, 16, 24, 32, 64. System fonts.
- Tabs: Home (house), My reports (doc), Capture (centre, video), Account (person). Use `@expo/vector-icons` or `expo-symbols`; 10px labels.
- UI kit `components/ui.tsx`: `Screen`, `Card` (radius 16, padding 16), `Label` (16px), `Note` (13px, secondary colour), `Action` (filled or outlined, min height 44), `Choice`, `Toggle`.
- `i18next` scaffold. Theme preference (system/light/dark) in Account.

**Done when:**
- Every web route renders in the Calm Haven look at 320, 390, 768 and 1280 px, in light and dark, in EN and PL.
- Keyboard focus is visible everywhere.
- The mobile app shows the 4 themed tabs.
- The Playwright smoke test visits every public route.

### Phase 2 — Authentication: login page, hardcoded users, guests, role guards

**API:**
- Migration `0002_identity.surql` (`principal`) and a seed that creates the 7 users with scrypt hashes.
- `AuthModule`:
  - `POST /auth/login` (rate-limited; generic "Incorrect username or password" error).
  - `POST /auth/guest`.
  - `GET /session`.
  - `POST /auth/logout`, which is a no-op server-side; the client drops the token.
- `AuthGuard` (Bearer JWT, verified with `JWT_SECRET`), `@Public()`, `@Roles()`, and a `CurrentPrincipal` decorator.
- Error messages: "Operator access required", "Official access required", "Backoffice access required".

**Web:**
- `/login` page (resident card style):
  - Username and password fields with "Sign in".
  - Below them, demo-user cards: Resident, Resident 2, Operator, Admin, and the three officials. Each shows its role and organisation, and signs in on click.
  - A notice that the accounts are demo fixtures.
  - The return path comes from `?next=` (only safe relative paths).
- A server action sets the `haven-session` cookie, then redirects to `next` or `defaultLandingPath(role)`.
- Guests: the first resident action (open `/report/new`, `/my-reports`) calls `POST /auth/guest` and sets the `haven-guest` cookie.
- Settings → Account card: "Guest" or the user's name and role, "Sign in" or "Sign out".
- Next middleware/proxy redirects restricted routes (`/queue`, `/vault`, `/cases`, `/admin`) to `/login?next=…` and shows a friendly "access required" page when the role is wrong. The API remains the authority.

**Mobile:**
- `SessionProvider`, holding the token in SecureStore.
- Account tab: login form and demo cards (resident and resident2 only, since mobile is resident-only). Staff logins on mobile are rejected with "Use the web workspace".
- Guest token created on first launch.

**Tests:**
- Unit: password verification, JWT round-trip, the role guard.
- E2E: log in as each role and land on the correct page; wrong password shows an error; a resident opening `/queue` is denied.

### Phase 3 — Resident reporting: drafts, wizard, location, revisions, My reports

**API:**
- Migration `0003_reports.surql`: report, report_revision, reference counter and function.
- `ReportsModule` (owner-only access, from a guest or resident token):
  - `POST /reports`: creates an empty draft.
  - `GET /reports`: own reports, cursor-paginated, newest first.
  - `GET /reports/:id`: report, current fields, revisions and messages.
  - `PUT /reports/:id {expectedRevision, fields}`: appends a revision; a stale revision returns 409.
- Shared:
  - `reportFieldsSchema` with the severity/weapon invariant.
  - `locationFilingGaps`, `canSubmitReport`, `assertEditableChange` (locked fields after filing).
  - `KRAKOW_DISTRICTS`, the GeoJSON, `findDistrict`.
  - `REPORT_STAGES`.
  - `reportTimeline`.

**Web `ReportEditor`** (client component), 3 stages with an `<ol class="report-stages">` stepper of clickable "Step N · title" buttons; focus moves to the stage heading on change:

1. **What happened:**
   - Category select ("Unclassified" means "we'll leave it unclassified").
   - Description textarea (hint: optional if evidence is attached).
   - Incident time (`datetime-local`).
   - Severity select.
   - "Weapon or immediate threat" checkbox, linked to emergency.
   - "Repeat incident" checkbox.
2. **Where:**
   - District select, disabled while a pin sets it.
   - Place description.
   - Buttons: "Pick on map" / "Change pin", "Use current location" (`navigator.geolocation`, never silent), "Remove pin".
   - Live "Required to file" checklist (✓/✗, `aria-live`).
   - Map dialog: full-screen `<dialog>`, react-leaflet with OSM tiles and Kraków district outlines (primary stroke, fill opacity 0.04), a fixed centre pin, "Pin is in {district}", "Use this spot" and "Cancel". Escape cancels and focus returns to the opener.
3. **Evidence & review:**
   - Evidence area (placeholder until Phase 4).
   - Summary `<dl>`.
   - Prototype disclaimer.

**Editor behaviour:**
- Buttons: Back, Continue, Save draft.
- Autosaves 1.5 s after edits through the proxy and shows "Saved at HH:MM".
- A stale save shows a "Reload report" alert.

**Pages:**
- `/my-reports`: report cards (category, "Private draft" or "Filed" badge, reference, description excerpt, date) and a guest notice ("Reports are tied to this browser").
- `/report/[id]`: reference, state, revision number, editor in edit mode, and a "History" timeline.
- Home: a "Continue your draft" card for the latest draft.

**Tests:**
- Unit: filing gaps, the invariant, `findDistrict` (Main Market Square → I, the eastern central square of Nowa Huta → XVIII), locked fields.
- E2E: a guest creates a draft, autosave works, reload persists it; a pin sets the district; `resident2` cannot open `resident`'s report (404).

### Phase 4 — Evidence upload and playback

**API:**
- Migration `0004_evidence.surql`.
- `POST /reports/:id/evidence`: multipart (`@fastify/multipart`), owner only. Accepts `image/*`, `audio/*`, `video/*`, up to `EVIDENCE_MAX_BYTES`. Streams to `${EVIDENCE_DIR}/{evidenceId}` while computing SHA-256, then stores the evidence row. If the report is filed, it also creates a revision note.
- `DELETE /evidence/:id`: owner, drafts only.
- `GET /evidence/:id/media`:
  - Allowed for the owner, operator or admin, and an official whose organisation owns the case.
  - Supports single `Range` requests (206/416), `cache-control: private, no-store`, and the correct content type.
  - Writes the audit event `evidence.view` (logged now, persisted in Phase 9).

**Web:**
- Evidence stage: multi-file input (`image/*,audio/*,video/*`) and a per-file status list (waiting, uploading % via XHR progress through `/api/proxy`, failed with Retry, Remove).
- `EvidenceList`: images (unoptimised `next/image`), `<video controls>`, `<audio controls>`, or a download link, all through `/media/[id]`.
- `VaultDisclosure` card: "Private custody", plus "Pilot: not malware scanned".

**Tests:**
- Unit: type and size validation, hash.
- E2E: upload an image, see a preview, reload, it is still there; another resident gets 404 on the media URL.

### Phase 5 — Filing, Smart Router, case creation, escalation

**API:**
- Migration `0005_routing_cases.surql`: routing_decision, recommendation, haven_case, case_message, case_action.
- `POST /reports/:id/submit {expectedRevision}`, in one SurrealDB transaction:
  1. Validate the filing rules.
  2. Allocate the reference.
  3. Freeze the router inputs.
  4. Run `evaluateRouting`.
  5. Create the routing_decision, the haven_case (`open`, `needs_review`, `organization_id = responder`, version 1) and the recommendation (if mode is `local`).
- `POST /reports/:id/escalation {verificationConfirmed: true}`: sets `escalated` and records a revision note.
- Shared: `router-rules.json`, `evaluateRouting` (all 5 rules plus the expedited modifier), `recommend()`.

**Web:**
- "File a report" button, enabled when the checklist is green.
- After filing, a "Report filed" card with the reference.
- Report detail adds a **Routing (simulated)** card: responder (localised display name), queue label ("Top priority" etc.), "Automatic dispatch (simulated)" when applicable, "Confirmation required" when applicable, and the 112 copy for emergencies.
- Filed reports: severity, weapon and repeat are shown read-only. "Save changes" creates a revision.
- **Escalate** card: "Simulated identity verification (demo stand-in)" checkbox and the destructive button "Escalate this report". Result: "This report has been escalated."
- **Messages from Haven** section (empty for now).

**Tests:**
- Unit: every router rule and the modifier; the recommendation fixture branches.
- E2E:
  - low, verbal → community volunteer, normal;
  - emergency → police, Top priority, auto-dispatch (simulated);
  - filing without a district is blocked;
  - an edit after filing creates revision 2.

### Phase 6 — Area reports (public district map)

**API:** `GET /hotspots` (public) uses shared `aggregateReportsByZone`, which always returns all 18 districts, with `count: null` below k=3. Only filed, non-cancelled reports with a zone are counted.

**Web `/area-reports`:**
- Title "Area reports", with an intro explaining the privacy threshold and "The public map is not a safety score."
- react-leaflet choropleth (dynamic import, `ssr:false`, 480 px high, centre 50.0617/19.9373, zoom 11, scroll zoom off):
  - Suppressed districts: muted fill and border.
  - Counted districts: Calm Haven chart tokens (`--chart-1`…`--chart-5`), scaled by count/max.
  - Tooltips: "{district} — N reports" or "below privacy threshold".
- An accessible list below the map with the same data, so colour is not the only carrier.

**Seed:** 3 filed fictional reports in district III Prądnik Czerwony.

**Tests:**
- Unit: aggregation and suppression.
- E2E: an anonymous visitor sees "Prądnik Czerwony — 3 reports" and other districts suppressed.

### Phase 7 — Operator workspace: queue, case decisions, advisory, resident messages, vault

**API** (`operator` or `admin` role):
- `GET /operator/cases?view=needs_review|awaiting_resident|handled`. Sorted by queue priority (jumps_queue > fast_laned > expedited > normal), then age.
- `GET /operator/cases/:caseId`: report fields, revisions, evidence, routing decision, current organisation, recommendation, messages, decision history.
- `POST /operator/cases/:id/promote {targetOrganization, reason, expectedVersion, recommendation?}`.
- `POST /operator/cases/:id/cancel {reasonCategory, comment, expectedVersion, recommendation?}`. Adds the neutral `cancellation_notice` message.
- `POST /operator/cases/:id/reply {kind, body, expectedVersion, recommendation?}`.
- Resident trigger: saving a report revision or uploading evidence while the case is `awaiting_resident` moves it back to `needs_review` (in the reports and evidence services).
- `GET /operator/evidence`: vault list with report reference, file name, type, size, SHA-256 prefix and date.
- Residents' `GET /reports/:id` returns messages as {kind, body, createdAt} only.

**Web:**
- `/queue`: tabs Needs review, Awaiting resident, Handled (with counts). Rows show reference, category, severity, district, organisation, badges (priority, "AI suggests", state) and age. Empty states.
- `/queue/[caseId]`:
  - Header badges.
  - Report details `<dl>`, revisions, inline evidence.
  - Routing card: original rule and current destination.
  - **AI recommendation (advisory)** panel: "Simulated local recommendation", suggested action, rationale. If none: "No suggestion is available".
  - `DecisionPanel`:
    - **Promote**: destination select and reason.
    - **Reply to resident**: kind and body.
    - **Cancel case**: reason category and comment, via `ConfirmDialog`.
    - **Follow AI recommendation**: confirm dialog with an editable prefill.
  - Messages to the resident.
  - Decision history.
  - 409 handling with "Reload case" and "Back to queue".
- Resident `/report/[id]`: a **Messages from Haven** list, plus an "Edit details or add evidence" call to action when information is requested.
- `/vault`: evidence table with a "View evidence" link and the private-custody disclosure.

**Tests:**
- Unit: triage transitions, disposition rules, version conflicts.
- E2E:
  1. The operator requests information and the case moves to Awaiting resident.
  2. The resident sees the message, edits, and the case is back in Needs review.
  3. The operator promotes to `professional_paid` and the case is Handled.
  4. The operator cancels another case; the resident sees the neutral notice; Area reports drop it.

### Phase 8 — Official case workspace

**API** (`official` role; `organization_id` must equal the principal's org, otherwise 404):
- `GET /official/cases` (own org; open and in_review first; closed and cancelled are shown read-only).
- `GET /official/cases/:id`.
- `POST /official/cases/:id/claim {expectedVersion}`.
- `POST /official/cases/:id/actions {type, note, expectedVersion}`.
- `POST /official/cases/:id/close {comment, expectedVersion}`.
- Officials may view evidence for their org's cases (already covered by the media policy).

**Web:**
- `/cases`: list with "Organization: {name}".
- `/cases/[id]`: report summary, **Linked evidence**, routing, buttons "Claim case", "Record external action" (type and note, then "Record action"), "Recorded external actions", and "Close case" (comment required, confirm dialog).
- Cancelled cases are read-only, with an explanation.

**Tests:**
- E2E: an emergency report appears for `official-police` only. A case promoted to `professional_paid` appears for `official-support`, who claims it, records a `phone_call` and closes it. `official-volunteer` gets 404 on that case.

### Phase 9 — Audit trail and admin audit log

**API:**
- Migration `0006_audit.surql`. Writes are append-only: no update or delete paths.
- An `AuditService.record(actor, action, subject, meta)` is called from every state change:
  - `auth.login` and `auth.login_failed` (username hash only);
  - `report.created`, `report.revised`, `report.submitted`, `report.escalated`;
  - `evidence.uploaded`, `evidence.viewed`;
  - `case.promoted`, `case.cancelled`, `case.replied`, `case.claimed`, `case.action_recorded`, `case.closed`.
- `meta` holds ids, enums and lengths, never free text or message bodies.
- `GET /admin/audit?action=&actor=&cursor=` (admin only).

**Web:** `/admin/audit`, a dense staff table (time, actor, role, action, subject link) with filters and pagination. Admins also see the queue and vault.

**Tests:**
- Unit: meta sanitiser rejects free text.
- E2E: the admin sees a `case.promoted` entry after the Phase 7 flow; the operator is denied `/admin/audit`.

### Phase 10 — Support matchmaking (mandatory brief module)

**Data:** migration `0007_matchmaking.surql`, table `support_resource`:

| Field | Values |
|---|---|
| `slug` | — |
| `name_en`, `name_pl`, `description_en`, `description_pl` | — |
| `kind` | `legal_aid` · `translation` · `psychological_support` · `victim_support` · `ngo` · `helpline` · `community_mediation` · `digital_safety` |
| `categories[]` | report categories |
| `districts[]` | empty means citywide |
| `languages[]` | e.g. pl, en, uk, ru, ar |
| `severities[]` | — |
| `keywords_en`, `keywords_pl` | — |
| `contact` | clearly fictional |
| `available_hours` | — |

**Search:** a SurrealDB full-text search with `DEFINE ANALYZER haven_text TOKENIZERS blank,class FILTERS lowercase,ascii,edgengram(3,12)` and `SEARCH` indexes on the description and keyword fields.

**Seed:** about 25 fictional Kraków resources, each with "(fictional)" in its name.

**Scoring** (pure function in shared plus a repository query):
- +3 for a category match;
- +2 for a district match (citywide +1);
- +1 per matched keyword (via the full-text search score, capped at +3);
- +1 when severity fits.

Results are ranked and capped at 5. Each carries a `reasons[]` list such as `{type:"category"|"district"|"keyword"|"severity", value}`, rendered as "Matched because: Verbal harassment · Stare Miasto · 'tram'". An emergency adds a pinned 112 notice above the results.

**API:** `GET /reports/:id/support-matches` (owner, filed reports) and `GET /operator/cases/:id/support-matches`.

**Web:**
- Resident report detail: a **Help that fits your situation** section. Cards show the name, kind badge, languages, hours and contact, with the "Matched because" line and the footnote "Fictional resources for the prototype".
- Operator case page: the same list in compact form, for context.

**Mobile:** the same section on report detail (built in Phase 11).

**Tests:**
- Unit: scoring and reasons.
- E2E: a filed verbal-harassment report in Stare Miasto mentioning "tram" shows a matching resource, with the reasons, in EN and in PL.

### Phase 11 — Mobile resident app (functional)

Built on Phases 2–10, using `packages/api-client` and the shared schemas, rules, i18n labels and districts.

- **Home:** "Start with what you have", "Report an incident", "Capture now", a latest-draft card, the 112 notice.
- **Report wizard:** 3 stages matching the web, with `components/report-stage-what|where|evidence` and a stage indicator.
  - **Where:** district picker, place description, "Use current location" (`expo-location`, asks first), and a "Pick on map" modal (`react-native-maps`, district `Polygon` outlines from the shared GeoJSON, fixed centre pin, "Pin is in {district}", "Use this spot").
  - **Evidence:** "Choose photos or videos" (`expo-image-picker`), "Take a photo" / "Record video" (`expo-image-picker` camera), "Record audio" (`expo-audio`). Uploads are multipart through the client, with progress.
- **Capture tab:** a full-screen modal recording audio (`expo-audio`), or video (`expo-camera` `CameraView` `recordAsync`, rear camera), in the foreground only.
  - Shows an elapsed timer (announced politely to screen readers), "Stop and save", "Record again" and "Continue to report".
  - Continuing creates a server draft with the recording attached. Capture never files automatically.
  - Permission denial shows "Open device Settings".
- **My reports:** paginated list.
- **Report detail:** status, routing, messages, history, evidence previews (`expo-image`, `expo-video`, `expo-audio`), Help that fits your situation, edit, escalate.
- **Account:** sign in/out, demo cards, language (EN/PL), theme.
- **Config:** `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env`. A `pnpm mobile` script prints the LAN URL hint.

**Done when (manual checklist in Expo Go on a phone):**
- A guest captures audio, continues to the report, files it, and sees the routing.
- After logging in as `resident`, their reports show on mobile and web.
- An operator reply appears on mobile.

### Phase 12 — Demo hardening

**Seed (`pnpm db:seed` is idempotent):**
- The users.
- The 3 Prądnik Czerwony reports.
- About 8 fictional showcase reports across states: draft, needs review, awaiting resident with a message, emergency at Top priority, closed, cancelled as duplicate, and one with a recommendation.
- The support resources.

**Accessibility pass (WCAG 2.1 AA):**
- axe check in Playwright on the main pages.
- Contrast, landmarks, skip link, `aria-current`, live regions, 44px targets, reduced motion.
- PL copy review.

**Docs:**
- `README.md`: overview, architecture diagram, setup, users table, commands, a "Real vs simulated" table.
- `docs/demo-script.md`: a 3-minute and a 10-minute walkthrough by role.
- Cost and resources estimate (required by the brief).

**Final check:** `pnpm demo:up` on a clean machine, then the whole Playwright suite passes.

## Verification (end-to-end)

1. `pnpm install && pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev`, then open `http://127.0.0.1:3000`.
2. `pnpm typecheck && pnpm lint && pnpm test`: unit tests for shared rules, auth, triage and matchmaking.
3. `pnpm --filter web exec playwright install chromium && pnpm test:e2e`. The smoke suite covers:
   - login per role;
   - a guest report with evidence;
   - routing for the low and emergency cases;
   - owner isolation;
   - Area reports suppression;
   - the operator request-info → resident edit → promote loop;
   - an official claim, action and close;
   - cancellation removing the report from hotspots;
   - the admin audit entries;
   - matchmaking reasons;
   - EN/PL switching;
   - axe checks.
4. `pnpm demo:up` (the full Compose profile) runs the same flows against containers.
5. Mobile: `pnpm mobile`, open in Expo Go, then run the Phase 11 checklist.

## Out of scope (state honestly in README and UI)

- Real dispatch or notifications: no institution, email or SMS is contacted.
- Real identity verification (escalation is a demo checkbox).
- Malware scanning; evidence retention, deletion or legal holds; evidence export.
- Grant administration.
- Guest-to-account transfer.
- Native background recording; offline SQLite drafts.
- Cloud deployment.
- Real AI or LLM calls.
- Third-party geocoding.
