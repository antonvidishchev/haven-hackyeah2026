# Submission package: HackYeah 2026, Smart City open task

Everything the rules ask for, ready to copy into HackTribe. Fill in the `TODO` items before
submitting (deadline: 11:00 on 4 October 2026, in English or Polish).

## Project title

**Haven: a safe middle path for reporting harassment in Kraków**

## Team

- **Team name:** TODO
- **Members (1–6):** TODO

## Project description

Harassment on Kraków's trams, at its stops and in its neighbourhoods, much of it anti-immigrant
and xenophobic, mostly goes unreported. People feel they can only "call the police" (slow, risky,
fear of retaliation) or "say nothing". So neither residents nor the city's support services can
respond, and nobody sees where help is needed.

Haven is the middle path. A resident reports in under a minute, without an account if they
prefer, in English or Polish, on the web or in a mobile app, and can add photos, video or audio
recorded in the app. A deterministic, explainable **Smart Router** (rules, not AI) sends each
report to the right kind of human help: a volunteer network for lower-severity harassment, a
professional support service, or, only for an emergency with a weapon, a police coordination unit
at Top priority. The resident immediately sees **support that fits**: local resources matched by
category, district, language and keywords, with a plain "matched because…".

Every filed report reaches a human. **Operators** triage a queue: send a case to an organisation,
ask the resident for more (the resident answers in the app), or cancel it with a neutral notice.
A labelled, rule-based advisory suggestion can be followed in one click, and whether it was
followed is audited. **Officials** of the receiving organisation claim the case, record what they
did outside Haven and close it. **Admins** read an append-only audit log. The public sees **Area
reports** first: privacy-protected counts per district, filterable by incident type (fewer than 3
are suppressed).

How it fits Smart City:

- **Communication between residents and institutions:** one calm channel from resident to operator
  to responder, with replies flowing back.
- **Responding to disruptions and emergencies:** deterministic routing, a Top-priority path for
  weapon emergencies, and the 112 notice wherever it matters.
- **Using urban data for decisions:** district counts show where support is needed without
  exposing anyone.
- **Accessibility of services:** no account needed, EN/PL, WCAG 2.1 AA (axe-tested), 44 px touch
  targets, light and dark themes, and help matched to the resident's language.

It is a working prototype: a NestJS API on SurrealDB, a Next.js web app for residents, staff and
the public, an Expo mobile app for residents, shared typed rules, unit and end-to-end tests, and a
one-command Docker Compose demo. All organisations, people and resources are fictional, and no
real service is contacted.

## Presentation (PDF, 10 slides)

The deck is [`pitch/haven-pitch.pdf`](pitch/haven-pitch.pdf), built with Marp from
[`pitch/deck.md`](pitch/deck.md). Screenshots of the live demo are in `pitch/img/`. The slides:

1. Haven, plus the live and repository links
2. The problem
3. Who it serves
4. One report's journey
5. Explainable routing and matching
6. Operators and officials
7. Area reports with privacy
8. Trust, low barrier and accessibility
9. Architecture and what is real
10. What's next and the pilot

To rebuild it:

```bash
npx @marp-team/marp-cli docs/pitch/deck.md --pdf --allow-local-files -o docs/pitch/haven-pitch.pdf
```

The submission page text, ready to paste, is in [`submission-page.md`](submission-page.md).

## AI and third-party resources disclosure

**AI tools.** The code, tests and documentation were written with significant help from Claude
Code (Anthropic's coding agent, Claude Opus models) under the team's direction: the team set the
idea, scope, decisions and plan, and reviewed and tested the output. The product itself makes no
AI or LLM calls: the "recommendation" is a deterministic rule-based fixture, labelled as a
simulation in the UI.

**Frameworks and libraries** (licences as published by each project):

| Component                                                             | Licence                     |
| --------------------------------------------------------------------- | --------------------------- |
| Next.js 16, React 19, next-intl, Tailwind CSS 4, shadcn/ui, Base UI   | MIT                         |
| lucide-react icons                                                    | ISC                         |
| NestJS 12, Fastify 5 (+ cors, helmet, multipart), pino, jose, zod     | MIT                         |
| RxJS                                                                  | Apache-2.0                  |
| SurrealDB JavaScript SDK                                              | Apache-2.0                  |
| SurrealDB server (Docker image)                                       | Business Source License 1.1 |
| Expo SDK 57 and its modules, React Native, react-native-maps, i18next | MIT                         |
| Leaflet                                                               | BSD-2-Clause                |
| React Leaflet                                                         | Hippocratic License 2.1     |
| Vitest                                                                | MIT                         |
| Playwright                                                            | Apache-2.0                  |
| axe-core / @axe-core/playwright                                       | MPL-2.0                     |

**Data and services.**

- Kraków district boundaries converted from
  [andilabs/krakow-dzielnice-geojson](https://github.com/andilabs/krakow-dzielnice-geojson) (no
  published licence; its README invites reuse).
- Map tiles from [OpenStreetMap](https://www.openstreetmap.org/copyright), © OpenStreetMap
  contributors, ODbL, under the tile usage policy. Mobile maps use the platform map provider
  through react-native-maps.
- Every organisation, person, report and support resource in the demo is fictional.

## Timeline statement

The event runs from **11:00 on 3 October to 11:00 on 4 October 2026** (the printed terms say
"11:00 PM"; the organisers corrected this to 11:00 AM). All work on Haven was done during the
event: the first commit is at 12:28 on 3 October. The git history is the record; every commit
carries its author time.

| Commit(s)             | Author time (3 Oct 2026, CEST) | Content                                       |
| --------------------- | ------------------------------ | --------------------------------------------- |
| `ebd31e7` … `a803d35` | 12:28–13:02                    | Initial commit, implementation plan           |
| `2a03239` … `0a95046` | 13:33–16:16                    | Phases 0–10 (scaffold to support matchmaking) |
| `c48f0d5`             | 16:55                          | Phase 11, mobile resident app                 |
| `4d0e2b1`             | 17:08                          | Demo hardening, docs and this package         |

Later commits are listed in `git log`. Nothing was built before the event.
