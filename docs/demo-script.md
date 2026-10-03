# Haven demo script

One concrete situation, end to end: **a resident is insulted about their accent on a tram in
Stare Miasto**. The report is routed, triaged and handled, and the resident is matched with nearby
help.

## Before you start

```bash
pnpm db:up && pnpm db:migrate && pnpm db:seed && pnpm dev   # or: pnpm demo:up
```

- Open **http://127.0.0.1:3000** in two browser windows: a normal one for the resident and a
  private one for staff. Sign-in cards on `/login` make switching roles one click.
- Optional: run `pnpm mobile` and open the app in Expo Go to show the resident side on a phone.
- The seed includes showcase cases in every state (see the README), so the staff screens are
  never empty.

All organisations, people and resources are fictional, and no real service is contacted. Locally,
nothing leaves the laptop. The same flow also works on the live web demo,
<https://haven-hackyeah.polandcentral.cloudapp.azure.com/>; for the phone part, use a local API.

## 3-minute version

| Time | Who              | Do                                                                                                                                                                                                       | Say                                                                                                                     |
| ---- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 0:00 | —                | Front page: **Area reports**, then **Start**.                                                                                                                                                            | Harassment on trams goes unreported: "call the police" feels too much, so people say nothing. Haven is the middle path. |
| 0:20 | Resident (guest) | **Report an incident**. Kind: _Verbal harassment_. "A man shouted insults about my accent on tram 8 near Teatr Bagatela." Severity: _Low_. **Continue**.                                                 | No account, no sign-in. The draft autosaves and stays private until filed.                                              |
| 0:50 | Resident         | **Where**: **Pick on map**, drop the pin by Teatr Bagatela, which shows "Pin is in I Stare Miasto". **Continue**, then **File a report**.                                                                | Location is a district, never a public exact spot.                                                                      |
| 1:10 | Resident         | Show the reference, the routing card (Neighborhood Volunteer Network, normal queue, "not AI") and **Help that fits your situation** with "Matched because: Verbal harassment · I Stare Miasto · “tram”". | Deterministic, explainable routing, and help in the resident's language right away.                                     |
| 1:40 | Operator         | Sign in as **Local Operator**. The new case is in **Needs review**; the seeded knife threat sits on top as **Top priority**. Open the tram case, then **Follow AI recommendation** and **Confirm**.      | Every case gets a human. The suggestion is a labelled, rule-based simulation, and following it is audited.              |
| 2:10 | Official         | Sign in as **Volunteer Network Official**. **Claim case**, **Record action** (phone call), **Close case** with a comment.                                                                                | The organisation records what it did outside Haven. A closed case cannot change.                                        |
| 2:35 | Public           | **Area reports**. Filter **Verbal harassment**, then **Vandalism or hate symbols**: the centre, then the eastern estates light up. XVII stays "below privacy threshold".                                 | Counts per district, below 3 suppressed, also per incident type.                                                        |
| 2:50 | —                | —                                                                                                                                                                                                        | Web and Expo app, EN/PL, WCAG 2.1 AA, Docker Compose. Ready to pilot with real organisations.                           |

## 10-minute version, by role

### 1. Resident on the phone (2 min)

1. In Expo Go, **Capture now**, **Record audio**, **Start recording**. Stop after a few seconds
   and choose **Continue to report**. The recording is attached to a new draft.
2. **What happened**: _Verbal harassment_, "Insults about my accent on tram 8 near Teatr
   Bagatela", event time _About an hour ago_, severity _Low_.
3. **Where**: **Use current location**, or **Pick on map** and move the map under the pin to Teatr
   Bagatela. The district is read out as the map settles.
4. **Evidence and review**: check the summary and the "Required to file" list, then **File a
   report**.
5. Show the reference, routing, support matches and **History**. Point out the 112 notice.

### 2. Resident on the web (1.5 min)

1. Sign in as **Local Resident**. **My reports** shows the seeded draft and the landlord case that
   is **awaiting** them: the operator asked for the recording.
2. Open the landlord case, read the message, and add evidence. The case moves back to the
   operator's queue.
3. Show **Escalate this report** with the simulated identity check, and the Polish switch.

### 3. Operator (2.5 min)

1. Sign in as **Local Operator**. **Response queue**: Needs review, Awaiting resident, Handled,
   with counts. The knife threat is **Top priority** and routed to the police coordination unit.
2. Open the new tram report: routing snapshot, revisions, evidence, the **Simulated local
   recommendation** ("transfer to NGO") and support matches.
3. **Follow AI recommendation**, edit the reason, **Confirm**. The decision records "followed".
4. Open the cancelled duplicate under **Handled**: the resident received only the fixed, neutral
   notice; the internal comment stays with staff.
5. **Evidence vault**: filed evidence only, with SHA-256 and authorised playback.

### 4. Official (2 min)

1. Sign in as **Volunteer Network Official**. **Assigned cases** shows only their organisation's
   cases, including the seeded market intimidation case, already claimed with a phone call.
2. Open the tram case: **Claim case**, **Record action** (site visit or referral), then **Close
   case** with a comment. Show that a closed case cannot change.
3. Mention that police and support officials see only their own organisation's cases.

### 5. Admin and public (1.5 min)

1. Sign in as **Local Administrator**. **Audit log**: every filing, decision (with recommendation
   disposition), claim, action and close, append-only. Filter by action.
2. Open **Area reports** signed out. Nine months of fictional history fill the map; I Stare
   Miasto is the darkest, and the cancelled duplicate doesn't count. Filter by **Verbal
   harassment**: the centre and the tram corridors stand out, and III Prądnik Czerwony drops
   below the threshold, because only one of its reports is of that type. Filter by **Vandalism or
   hate symbols**: the eastern estates (Nowa Huta, Mistrzejowice, Bieńczyce) take over. XVII
   Wzgórza Krzesławickie, with two reports, always shows "below privacy threshold".

### 6. Wrap-up (0.5 min)

- What is real and what is simulated: the README table. No institution is contacted.
- The path to a pilot: [pilot estimate](pilot-estimate.md).

## If something goes wrong

- **The phone can't reach the API**: `pnpm mobile` prints the LAN address; put it in
  `apps/mobile/.env` and restart Expo. Phone and laptop must share the network.
- **"Too many sign-in attempts"**: the API allows 20 sign-ins a minute; wait a minute.
- **A clean slate**: `HAVEN_CONFIRM_RESET=yes pnpm db:reset` wipes the database, migrates and
  seeds again.
