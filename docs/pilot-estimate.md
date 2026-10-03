# Pilot estimate: Haven in Kraków

A rough plan and budget for a 6-month pilot with real organisations. **Every figure is an
assumption** for discussion, not a quote. Prices are indicative net amounts in PLN, as of
October 2026.

## Scope of the pilot

- **Area:** start with 3 districts where trams and night buses cross: I Stare Miasto, II
  Grzegórzki and XIII Podgórze. Go citywide after month 3 if the operators can keep up.
- **Partners:** one NGO already supporting migrants (volunteer network), one professional support
  service, and a named contact in the municipal police for emergencies. The city's social policy
  department hosts the operators.
- **Channels:** the web app and the mobile app (published to the stores, not Expo Go), promoted
  on trams, at stops and through partner NGOs, in Polish, English and Ukrainian.

## What has to change from the prototype

| Area            | Work                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------- |
| Identity        | City SSO for staff with MFA; escalation through a real verification (e.g. mObywatel)      |
| Notifications   | Email or SMS to organisations and opt-in push to residents, instead of in-app only        |
| Evidence        | Malware scanning, encryption at rest, retention and deletion rules, export for the police |
| Data protection | DPIA, processing agreements with each partner, records of processing, a published policy  |
| Hosting         | Managed hosting in the EU with backups, monitoring and an incident procedure              |
| Content         | Ukrainian copy; support resources replaced by the partners' real services                 |
| Accessibility   | An external WCAG 2.1 AA audit, plus tests with screen-reader users and with migrants      |
| Mobile          | Store builds (EAS), offline drafts, push notifications                                    |

## Team

| Role                                | Effort                       |
| ----------------------------------- | ---------------------------- |
| Product owner (city)                | 0.5 FTE, 6 months            |
| Full-stack developers               | 2 FTE for 3 months, then 0.5 |
| Designer / accessibility specialist | 0.5 FTE for 3 months         |
| Operators (triage, 7 days a week)   | 2 FTE during the pilot       |
| Data protection officer             | Advisory, about 10 days      |

## Budget (6 months, indicative)

| Item                                                  |          PLN |
| ----------------------------------------------------- | -----------: |
| Development (about 9 developer-months)                |      220,000 |
| Design and accessibility (1.5 person-months, + audit) |       55,000 |
| Operators (2 FTE × 6 months, incl. training)          |      110,000 |
| Hosting, backups, monitoring, SMS (EU cloud)          |       15,000 |
| App store accounts, legal review, DPIA                |       30,000 |
| Outreach (tram and stop posters, partner materials)   |       25,000 |
| Contingency (10%)                                     |       45,000 |
| **Total**                                             | **≈500,000** |

Partner organisations' time is assumed to be covered by their existing programmes. If it isn't,
add small grants per partner.

## Running cost after the pilot

Hosting stays small: one API, one web app, SurrealDB and object storage for evidence fit on a few
modest instances (a few thousand PLN a month with backups and SMS). The real cost is people: the
operators who triage every report, and the partners who act on them.

## How to measure the pilot

- Reports filed per month, and the share filed as a guest.
- Time from filing to the operator's first decision, by queue priority.
- Share of cases closed by a partner versus cancelled.
- Residents who used a matched support resource (a short, optional follow-up question).
- Accessibility: task completion in moderated tests with screen-reader users.
- Privacy: no district published below the k=3 threshold; no evidence leaves the vault.

## Risks

- **Too few operators:** reports wait, and trust drops. Mitigation: start with three districts and
  publish response times.
- **Misuse** (spam, false reports): the operator cancels, with a neutral notice; rate limits stay.
- **Fear of the police:** routing to the police only for weapon emergencies stays a firm rule, and
  the copy says so.
- **A public map read as "dangerous areas":** keep k=3 suppression, also within each incident
  type, and publish counts, not locations.
