# Aegon query management: mock sites

These are static mock sites for prototyping a browser agent on the Aegon "Answer Service Query" (ASQ) process:
- **mock-Pega** (`/pega/`): the case queue.
- **mock-SCM** (`/scm/`): plan records.

**All data is fake.** The sites run as plain static files, so they work on GitHub Pages or any static file server.

There is no login: pages open directly as a default operator.

## URLs and switches

**Start pages**
- `pega/index.html`: home with **Get Next Work**.
- `scm/index.html`: plan search.

**URL switches**
- `pega/index.html?case=ASQ-1005`: pins the case that Get Next Work returns.
- `?reset=1` on any page: clears all state (statuses, notes, emails).

**Run summary**
- `pega/summary.html` is the reviewer view: status, notes, sent emails, checklist answers and the audit log for this browser.

## How state works

State lives in the browser's `localStorage`, which both sites share because they're on one origin. A fresh browser (for example a new Kernel session) starts with clean state.

## Scenarios

| Case | Question | Channel / source | Exercises | Expected outcome |
|---|---|---|---|---|
| ASQ-1001 | Charges | Email / IFA on plan | Charges table with blank (not applicable) rows, a rebate credit, adviser trail, a closed related case ASQ-0877 | Reply with charges, then Resolved-Completed |
| ASQ-1002 | Value on 05/04/2024 + transfer value | DCE / Planholder | Backdated valuation date + Refresh | Reply with both values + early-exit wording |
| ASQ-1003 | Funds | Secure self-service / Planholder | Plan `0900712345` → SCM `712345` (leading zero dropped); mirror fund mapped to its main fund; long fund list | Reply with current funds and underlying fund names |
| ASQ-1004 | Contributions | Contact centre / Employer | September not yet received (paid monthly in arrears); salary sacrifice | Reply explaining due date + salary sacrifice |
| ASQ-1005 | Value | Email / Third party | No authority recorded on the plan | SW-AUTH-01 only, no figures |
| ASQ-1006 | Charges | Post / Planholder | Date of birth and NI number in Pega don't match SCM; request only in the document viewer (iframe) | Note added, Re-file, Pending-Refile, no reply |
| ASQ-1007 | Value | DCE / Planholder | Negative units in Aegon Cash Pn | Holding reply SW-HLD-01, Pend and refer to Operational Support |
| ASQ-1008 | Charges + funds + contributions | Email / IFA | Several questions in one request; linked plan 8812457 | One reply covering all three + mention of the other plan |

## Run locally

```bash
python3 -m http.server 8790
```

Then open <http://localhost:8790/>.
