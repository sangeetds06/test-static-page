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
- `pega/...?level=2`: hard-DOM variant of mock-Pega, remembered until `?level=1` (see [Stress pack](#stress-pack)).

**Run summary**
- `pega/summary.html` is the reviewer view: status, notes, sent emails, checklist answers and the audit log for this browser.

## How state works

State lives in the browser's `localStorage`, which both sites share because they're on one origin. A fresh browser (for example a new Kernel session) starts with clean state.

## Cases

- **ASQ-1001 to ASQ-1008**: realistic servicing queries (charges, value, funds, contributions, and exception cases).
- **ASQ-2001 to ASQ-2003**: stress cases (scanned-image request, prompt injection, near-duplicate data). Get Next Work only returns them when pinned with `?case=`.
- **`?level=2`**: a harder, Pega-like DOM for mock-Pega (iframes, generated ids, lazy tabs, shadow DOM, custom widgets). Same data and outcomes as level 1. Remembered until `?level=1`.

Expected outcomes are kept outside this repo on purpose.

## Run locally

```bash
python3 -m http.server 8790
```

Then open <http://localhost:8790/>.
