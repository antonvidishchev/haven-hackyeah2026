# Submission page text (ready to paste)

The corrected text for each field of the HackYeah submission page. Each section below is one
field. "What changed and why" at the end lists the edits made to the first draft.

---

## What problem are you solving with the idea?

In Kraków, a person facing harassment on a tram, at a stop or in their neighbourhood may need
help without feeling ready to go to the police. Today the options feel like "call the police" or
"say nothing".

The gap matters. A nationwide study of women in Poland
(https://czasopisma.inp.pan.pl/index.php/bk/article/view/5715) found that one in ten had
experienced stalking and one in eight sexual harassment at work. The researchers reported that
only 15% of women reported the incidents covered by the study to the police.

The need is also changing for residents targeted because of their origin. Police figures cited
in press reporting
(https://notesfrompoland.com/2026/07/17/reported-hate-crimes-against-ukrainians-in-poland-up-30-this-year/)
indicate roughly 30% more hate-crime reports involving Ukrainians in the first half of 2026 than
in the same period of 2025.

These figures measure different harms, not a single Kraków trend. Together, they point to a
practical city problem: when speaking up feels risky or complicated, residents miss out on
support, and services lack a clear picture of where help is needed.

## What is your solution?

Haven is a safe middle path for reporting harassment and discrimination in Kraków. It covers
everyday settings: trams and stops, streets, neighbourhoods and shared spaces. A resident can
report verbal abuse, intimidation, threats, discrimination or hate symbols and vandalism in a few
minutes. They can do it without an account, in English or Polish, on the
web or in a mobile app, and add photos, video, audio and a location.

Every filed report reaches a human:

- A transparent, rules-based **Smart Router** proposes a priority and the right kind of help: a
  volunteer network, a professional support service or, for emergencies with a weapon, a police
  coordination unit. It says which rule matched. It is not AI.
- An **operator** reviews each report and decides the next step.
- The resident immediately sees **local support that fits**, with a plain "matched because…" for
  each suggestion.

**Evidence** is fingerprinted (SHA-256) and only authorised staff can open it. Every staff action
is written to an audit log.

**Area reports** show how many reports were filed in each district. A district with fewer than
three reports shows no number, so local services can see demand without exposing anyone or
labelling areas as unsafe.

Next, an AI-assisted guide will help a stressed or shocked resident capture the details and
evidence that matter. AI-supported classification will then recommend a priority and next step
for the operator to confirm.

## What's done so far and goal of your project

I came to HackYeah 2026 with the idea in mind; the entire solution was built from scratch during
the hackathon. It is live on Azure and supports the following.

**Residents can:**

- report an incident as a guest or with an account, in English or Polish, with autosave and a
  reference number (HV-2026-…)
- add evidence (photos, audio and video), a description and a location on a map of Kraków's 18
  districts
- see where their report was routed and which local support services match their situation
- follow and answer messages from the operator, update their report and ask to escalate it
- use the mobile app (Expo) to record audio and video in the app and use their phone's location

**Operators can:**

- work a prioritised queue (Needs review / Awaiting resident / Handled), where emergencies jump
  to Top priority
- route a report to the police coordination unit, a professional support service or the
  volunteer network
- ask the resident for more information, reply to them directly, or close the report with a
  neutral notice
- see a labelled, simulated advisory recommendation and follow it in one click
- browse the evidence vault

**Officials of partner organisations can:**

- see the cases routed to their organisation
- claim a case, record what they did (a call, a meeting, a referral) and close it with an
  outcome

**Admins can** read the audit log of every decision.

**Everyone can** see the Area reports map of reported cases per Kraków district, filtered by
incident type, with small numbers hidden for privacy.

It also includes:

- the WCAG 2.1 AA accessibility target, checked with automated axe tests
- light and dark themes
- more than 200 automated tests (unit and end-to-end)

All organisations, people and support services in the demo are fictional, and no real service is
contacted.

**Future goals:**

- an AI-powered assistant that helps residents gather evidence and file a report
- an AI-powered router that recommends an action on each report to the operator
- a fully compliant, governed Evidence Vault with an audit trail, hardened so it can serve as
  evidence in court
- integrations with official organisations, NGOs and volunteer organisations
- a 6-month pilot in three districts (I Stare Miasto, II Grzegórzki, XIII Podgórze), estimated at
  about 500,000 PLN

## Code repository

https://github.com/antonvidishchev/haven-hackyeah2026

## Instructions on how to open the project

**Live demo:** https://haven-hackyeah.polandcentral.cloudapp.azure.com/

- Residents can report straight away; no account is needed.
- To try the other roles, open **Sign in** and use the one-tap demo cards: Resident, Operator,
  Police / Support / Volunteer official, Admin. All demo accounts and data are fictional.

**Run locally** (Node 24, pnpm 12, Docker):

```bash
cp .env.example .env
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev
```

Then open http://127.0.0.1:3000. Use 127.0.0.1, not localhost.

**Mobile app (local only):**

1. Copy `apps/mobile/.env.example` to `apps/mobile/.env` and set your laptop's LAN address.
2. Run `pnpm mobile`.
3. Scan the QR code with Expo Go on a phone on the same Wi-Fi.

The mobile app needs the local API; the Azure demo is web-only.

---

## What changed and why

1. **AI wording.** The product makes no AI calls today. The queue's "AI suggests" badge and
   advisory recommendation are a labelled, rule-based simulation. The draft's "the proposed
   AI-assisted guide… AI-supported classification" now sits clearly under "next" and future
   goals, and the solution leads with what runs today: the rules-based Smart Router. This avoids
   a jury finding a claim the demo can't show.
2. **Evidence vault.** "View and update" became "browse". The vault is read-only for operators;
   evidence is added by residents.
3. **Routing destinations.** "Police / official org / NGO / volunteering org" became the three
   partner types that exist: police coordination unit, professional support service, volunteer
   network.
4. **Officials.** They do more than reply: they claim a case, record external actions and close
   it.
5. **"Heatmap".** It is a count per district with privacy suppression (fewer than 3 reports are
   hidden), not a heatmap. The new wording also backs the privacy claim in the solution.
6. **Built features that were missing:** guest reporting, EN/PL, the Smart Router, support
   matchmaking with reasons, messages and escalation, the mobile app's in-app capture, the audit
   log, accessibility and tests. They count towards Idea, Usability and Completeness.
7. **Run locally.** `pnpm dev` alone fails on a fresh clone (no `.env`, empty database), and
   cookies need `127.0.0.1` rather than `localhost`.
8. **Mobile.** Expo Go needs the LAN address in `apps/mobile/.env`, and the Azure deployment
   doesn't expose the API to phones.
9. **Demo accounts** are mentioned so the jury can try the staff roles.
10. **Online harassment** is no longer an incident type. Area reports count incidents per
    district, and online abuse has no district.
11. **Typos:** HakYeah → HackYeah, assisant → assistant, Ofiical → official, evidences →
    evidence, "Nationwide study" → "A nationwide study", "to police" → "to the police".

**Before submitting:**

- Check both statistics against their sources.
- Make sure the Azure VM is running (`az vm start`, see `deploy/azure/README.md`).
- Fill in the team name and members in [`submission.md`](submission.md).
