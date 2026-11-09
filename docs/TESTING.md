# Testing evidence and limits

## Automated verification actually performed

- `node --test tests/*.test.mjs`: **19 passed, 0 failed**. Full output: `automated-tests.txt`.
- TypeScript `tsc --noEmit`: passed.
- Vinext production build: passed.
- Local D1 migration: applied successfully.

Tests call the actual API service with an in-memory SQLite adapter using the generated migration. They cover happy path, anonymous rejection, cross-origin rejection, invalid JSON/type/size, GPA/HTML validation, deadline, missing checklist/acknowledgement, owner isolation, bound SQL values, save/application retry uniqueness, cascaded removal, confirmed account deletion, rate limiting, partner response minimization, simulated 503/network/schema failures, server-only bearer handling and submitted-checklist lock.

**Partner success/failure cases inside the automated suite use mocked network responses. They do not prove the real partner endpoint succeeds.** SQLite adapter tests are not deployed D1 HTTP end-to-end tests.

## Browser verification actually performed by AI

| Case | Observed result |
|---|---|
| Open local browser preview | Thai dashboard, 4 fictional scholarships and navigation render |
| Search `AI` | One matching scholarship remains |
| Clear query | Four scholarships return |
| Open ASEAN details | Amount, deadline, minimum GPA and 3 required documents render |
| Navigate from details to profile | Profile form opens |
| Fill fictional example | Fields populate with clearly labelled synthetic data |
| Save without sign-in | Informative sign-in-required message; no false success |
| Open integration tab | Untested state, fixed endpoint description and empty history shown |

Managed preview has no authenticated account. Browser sign-in, real cloud writes, cross-device persistence and full authenticated browser happy path remain to be verified by the team. Backend happy path was tested automatically; do not relabel it as human manual testing.

## Actual live partner check

Endpoint in `live-integration.json` returned **HTTP 401**, with the service explaining that a Bearer authorization token is required. No valid Team 03 token was supplied. This is a recorded unsuccessful integration attempt, not a completed cross-group integration.

## Human manual tests — team must fill after performing

| Test | Expected | Actual | Tester / time |
|---|---|---|---|
| Online sign-in with allowed account | Account recognised | Pending | Pending |
| Save profile, reload page | Saved profile returns | Pending | Pending |
| Save scholarship twice | One saved row | Pending | Pending |
| Complete checklist, submit application | One SCH-… record | Pending | Pending |
| Submit same scholarship again | Same record, no duplicate | Pending | Pending |
| Account B opens its own page | Cannot see A's data | Pending | Pending |
| Team 03 with valid token | Genuine response and timestamp | Pending | Pending |
| Partner unavailable | Honest error, core flow remains usable | Pending | Pending |
| Export own data | JSON matches owned rows | Pending | Pending |
| Delete synthetic account data | Owned rows removed | Pending | Pending |
| Phone viewport and keyboard navigation | Usable layout/focus | Pending | Pending |
| Minor text edit, redeploy | New online text visible | Pending | Pending |

A failure is useful evidence: record it honestly, explain the fix and retest. Do not fill pass for tests not run.
