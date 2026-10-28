# AI Workflow Log

How AI tools were used to build this project: what was asked, what was accepted, and what was
changed or rejected by me. Tool: Claude Code (agentic coding assistant in VS Code).

## Working agreement
- AI proposes; I decide. Every design choice is reviewed before code is written.
- AI never commits. I review the diff and make every commit myself.
- Tests come first (TDD); AI-generated code is accepted only when the tests and my review pass.

---

## 1. Understanding the problem
**Prompt (summary):** Shared the assessment brief and asked for a step-by-step plan,
without starting any work.

**AI output:** A phased plan (clarify → requirements → design → setup → TDD build → deploy →
docs). It pointed out that the brief lists **no features**: deciding what the HR Manager needs
is the product-thinking part of the exercise.

**My decision:** Accepted the phased plan. Clarify before building.

## 2. Clarifying questions
**AI proposed questions** on currency, authentication, salary history, deductions, hosting,
deadline and repository. I answered:

| Topic | Answer |
|-------|--------|
| Currency | Store in local currency with an ISO 4217 code; no conversion; group statistics by currency |
| Auth | Simple login for one HR Manager |
| Salary history | Track changes over time with amount, currency, period and effective date; preserve history; make "current salary" explicit and tested; no approval workflow |
| Deductions / net pay | Out of scope |
| Hosting | Any free host |
| Deadline | None |

## 3. Technical decisions
AI gave options with a recommendation for each. My choices:

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Compensation period | Annual + monthly, normalized to annual in insights | Comparable statistics without currency conversion; hourly needs an hours assumption |
| Database | PostgreSQL | Realistic; free persistent hosting (Neon); `DISTINCT ON`, window functions, `percentile_cont` |
| Frontend | React (Vite) served by Rails | One deploy, same-origin session cookie, no CORS / JWT complexity |
| UI library | shadcn/ui + Tailwind (I picked this over the AI's suggestion, Ant Design) | Modern, composable; tables built with TanStack Table and server-side pagination |
| Hosting | Render (web) + Neon (Postgres) | Render's free Postgres expires after 30 days; Neon's does not |

## 4. Requirements document
**Prompt (summary):** Draft the one-page requirements doc from the agreed decisions.

**Output:** [`requirements.md`](requirements.md). It covers the goal, the persona, the questions the
product must answer, the features, the domain rules (money, current salary, normalization),
what is out of scope and why, and the non-functional requirements.

**My review:** _(to fill in after review — what I changed and why)_

## 5. Design document
**Prompt (summary):** Produce the design: architecture, schema, API, the current-salary
strategy, testing and performance.

**Output:** [`design.md`](design.md).

**Key trade-off the AI surfaced:** computing the current salary at read time versus caching a
pointer on the employee. A cached pointer goes stale when a future-dated raise takes effect
without any write, so it would need a scheduled job. **Decision:** compute at read time with
`DISTINCT ON` and a composite index, and pass `as_of` explicitly so tests are deterministic.

**My review:** _(to fill in)_

## 6. Project setup: Rails skeleton
**Prompt (summary):** Set up a Rails 8 app with PostgreSQL and RSpec, in small chunks, with no
commits by the AI.

**What happened:**
- Installing Rails 8.1.4 into the global gem environment failed: an old RubyGems hit `rackup` and
  `prism` dependency conflicts. The AI stopped instead of forcing the install, and switched to an
  isolated RVM gemset (`.ruby-gemset` → `salary-management`) so other projects stay untouched.
- `rails new` was run with Hotwire, the asset pipeline, mailers, Action Cable, Active Storage,
  Kamal and Solid* all skipped. The UI is a separate React build, and only Postgres is used.
- Production reads `DATABASE_URL` (Neon). The `.gitignore` was written by hand (because
  `--skip-git` was used) and excludes `config/master.key`.
- RSpec runs in random order with a reproducible seed. FactoryBot syntax is included.

## 7. Project setup: React frontend and single-deploy serving
**Prompt (summary):** Scaffold React (Vite + TypeScript) with Tailwind and shadcn/ui; make Rails
serve the built app.

**What happened:**
- Vite 8 / React 19 / TypeScript 7 / oxlint scaffold, plus Tailwind v4, shadcn/ui (Radix, Nova
  preset), TanStack Query/Table, React Router and Vitest + Testing Library. Demo files removed.
- TypeScript 7 removed `baseUrl`, so the `@/` alias uses `paths` only.
- `vite build` outputs into Rails' `public/` without wiping Rails' own files there. A `prebuild`
  script removes only the previous build. The build output is gitignored.
- In development, Vite proxies `/api` to Rails. The browser sees a single origin, the same as in
  production, so session cookies behave identically in both.
- The SPA fallback was written test-first: deep links serve `index.html`, while `/api/*` and
  non-HTML requests get a real 404. A clear 503 is returned if the frontend has not been built.
- **AI mistake caught:** the first spec for `/` passed or failed depending on whether
  `public/index.html` had been built, because the static file server answers before routing.
  It was replaced with a routing spec so the suite stays deterministic.
- The shadcn-generated `components/ui/**` is exempted from one fast-refresh lint rule, so
  generated code is not hand-edited.

## 8. Continuous integration
**Prompt (summary):** Add CI that runs every quality gate.

**What happened:**
- Rails 8.1's `bin/ci` (`config/ci.rb`) is the single definition of CI: RuboCop,
  bundler-audit, Brakeman, RSpec, and frontend lint, type check, tests and build. GitHub Actions
  just runs `bin/ci` against a Postgres 17 service, so local runs and CI runs cannot drift apart.
- **Brakeman flagged Ruby 3.2.2 as end-of-life** (support ended 2026-03-31). The warning was
  fixed rather than suppressed: the project moved to Ruby 3.4.4 (supported into 2028) in
  `.ruby-version` and the Dockerfile.
- Fixed a Vite deprecation warning (`__dirname` → `import.meta.dirname`).
- Open observation: Brakeman once took over 2 minutes inside `bin/ci`, but about 4 s on its own.
  I couldn't reproduce it, so I'm watching it.

## 9. Domain core: Employee (TDD)
**Prompt (summary):** Build the `Employee` model test-first, with country reference data.

**What happened:**
- Specs first (red): required fields, email normalized and unique (in the model and in a DB
  unique index), format, country restricted to the supported list, whitespace trimming.
- `Country` is a `Data` value object list (code, name, default currency) rather than a table.
  It is reference data that changes only with a deploy.
- Integrity is also enforced in the database (NOT NULL, unique email, check constraints for
  lower-case email and the country-code format), so bad data can't bypass the model.
- **AI mistake caught in review:** the first draft defined `ALL` inside a `Data.define` block,
  which would have created a top-level `::ALL` constant. Rewritten as
  `class Country < Data.define(...)`, and verified that `::ALL` is not defined.

## 10. Domain core: SalaryRecord and the current-salary rule (TDD)
**Prompt (summary):** Implement the salary history and the "current salary" definition test-first.

**What happened:**
- Specs first (red), with explicit dates and no reliance on the real clock: the latest past record
  wins; a record effective exactly on `as_of` counts; future-dated raises are ignored; a same-date
  tie goes to the most recently created record; one record per employee; none before the first salary.
- Other rules: amount > 0 and stored as `decimal(14,2)` (no float rounding); a supported ISO 4217
  currency; period `annual` or `monthly`; effective date not before the hire date (a product rule
  added while designing the specs); `annual_amount` = monthly × 12.
- **Append-only** in both layers: `readonly?` once persisted (update and destroy raise), no `updated_at`
  column, and history removed only through the DB `ON DELETE CASCADE` when the employee is deleted.
- **One definition of the rule:** `Employee#current_salary` reuses the `SalaryRecord.current_as_of`
  scope (`DISTINCT ON` + composite index), so the directory, insights and the employee page
  cannot disagree.
- **Verifying the tests themselves:** all specs passed on the first run, so I deliberately broke the
  code twice (flipped the tie-break; excluded the `as_of` day). Each mutation was caught by exactly
  the spec written for it. Then I restored the code.

## 11. Authentication (TDD)
**Prompt (summary):** Single HR Manager login with session cookies, secure by default.

**What happened:**
- Specs first: login and logout; case-insensitive email; the same error for a wrong password and an
  unknown email (no account enumeration); rate limiting (10 attempts / 3 min → 429); CSRF rejected
  without a token and accepted with one; every API controller requires login by default.
- `Api::BaseController` requires login on every action. Only `SessionsController` opts out.
  `User.authenticate_by` (timing-safe), `reset_session` on login (prevents session fixation),
  a 12-character minimum password, and a cookie that is HttpOnly, SameSite=Lax, Secure in production
  and expires after 12 hours.
- CSRF: `GET /api/session` returns the token, which the frontend sends as `X-CSRF-Token`. It is
  returned again after login because `reset_session` rotates it.
- Config found while writing specs: the test env used `null_store`, so rate limiting would silently
  never trigger. Switched to `memory_store`, cleared before every example. Production now uses an
  explicit `memory_store`. That is fine for a single free-tier instance, and the trade-off is noted
  in the config.
- Review: removed a dead `current_user` override that the AI had added. Mutation-checked the CSRF
  setting and the login guard, and both were caught.

## 12. Seed script (TDD)
**Prompt (summary):** A seed script for 10,000 realistic employees, deterministic and fast.

**What happened:**
- Split for testability: `Seeding::EmployeeGenerator` (pure Ruby, no DB; same seed and `today` give
  the same rows) and `Seeding::Loader` (bulk `insert_all!` in batches of 1,000 inside transactions).
- Because `insert_all` skips validations and normalization, a spec runs every generated row through
  the real model validations, so the seed can't produce data the app itself would reject.
- The data is realistic on purpose: names by country locale (Faker), a weighted country mix,
  salary bands per country and per job title, yearly April raises, about 20% monthly pay, and about
  5% scheduled future raises. That gives the current-salary rule and the insights real cases.
- **Correctness fix in review:** the loader first paired `RETURNING id` values with input rows by
  position. SQL does not guarantee that order, so ids are now matched by the unique email.
- `db/seeds.rb` can be re-run (it skips existing data unless `RESET=1`). Production requires the
  `HR_EMAIL` and `HR_PASSWORD` environment variables, with no fallback.
- Measured: 10,000 employees and 23,753 records seeded in 2.9 s. The current salary for all
  employees resolves in 7.4 ms (EXPLAIN ANALYZE). Recorded in design.md §9.

## 13. Employee API, read side (TDD)
**Prompt (summary):** Directory (search, filters, sort, pagination), the employee detail with its
salary history, and filter options.

**What happened:**
- `EmployeeSearch` query object: SQL filtering, `ILIKE` search with wildcards escaped, whitelisted
  sort keys (an unknown key, including an injection attempt, falls back to name), page bounds
  clamped, `NULLS LAST` plus `id` for a stable total order, so pages never overlap.
- Sorting by salary uses the *annual* amount. `SalaryRecord::ANNUAL_AMOUNT_SQL` sits next to the
  Ruby `#annual_amount`, and a spec checks that the two agree.
- A fixed three queries per page (count, rows, the page's current salaries), and a spec counts
  them to guard against N+1 regressions. The salary join is added only when sorting by salary.
- Serializers keep JSON out of controllers. Money is sent as decimal strings (no float rounding).
  The history is labelled past / current / scheduled using the same `current_as_of` rule.
- **AI mistake caught:** a spec fixture ("Priya Sharma" vs "Priyanka Rao") depended on Postgres
  collation, which ignores spaces under `en_US`, so the expected order was locale-dependent.
  It was replaced with unambiguous names to keep the suite deterministic across machines.
- Also caught in review before running: a leftover, unused block in the query-count spec.
- Measured on the 10k seed: 2–22 ms per directory request (recorded in design.md §9).

## 14. Employee API, write side (TDD)
**Prompt (summary):** Create (with the first salary), edit, delete, record a salary change, and one
error format.

**What happened:**
- `Employees::Create` saves the profile and the first salary (effective from the hire date) in one
  transaction. It validates both first and returns all errors together. Salary errors are keyed
  `initial_salary.<field>` so the form can place them.
- Edit changes profile fields only. Pay changes always go through
  `POST /api/employees/:id/salary_records`, and a spec checks that salary fields sent to edit are
  ignored. The history stays append-only.
- New product rule found while writing specs: the hire date can't be moved after the first salary
  record, or the pay history would start before the person was hired.
- One error contract: `422 { errors: { field: [messages] } }`, `400` for a missing body, `404` for
  unknown records.
- **Brakeman found a real issue in AI-written code:** `EmployeeSearch` built `ORDER BY` with string
  interpolation. It was safe (whitelisted column, ASC/DESC only), but not provably so. It was
  rewritten with Arel order nodes (`column.desc.nulls_last`), with no interpolation, and it
  produces the same SQL.
- **Root cause of the slow Brakeman runs (open since §8):** the Rails binstub passes
  `--ensure-latest`, which calls rubygems.org, and the local network to it hangs. Added an opt-in
  `BRAKEMAN_OFFLINE=1` for local runs. CI still runs the version check.

## 15. Salary insights API (TDD)
**Prompt (summary):** Statistics that answer "how does the org pay people?".

**What happened:**
- `SalaryStatistics` makes one aggregate query over the current-salary set and returns headcount,
  min, max, average, median (`percentile_cont`) and total annual payroll per **(group, currency)**.
  An Indian employee paid in USD is a separate row, so currencies are never combined.
- The specs use a hand-computed dataset: monthly pay annualized, past and scheduled records ignored,
  the median of an even group, the average exact to the cent, employees with no salary yet excluded,
  and the largest groups first.
- The median is computed in floating point by Postgres and cast back to `numeric` and rounded, so
  the API only ever sends exact decimals.
- Refactors to keep one definition of each rule: `Employee.filtered_by` (shared by the directory
  and insights) and `SalaryRecord.current_with_annual_amount_as_of` (shared by salary sorting and
  statistics).
- **Caught in review:** the controller rescued every `ArgumentError`, which would have turned any
  bug into a 400 that leaks an internal message. It now rescues only `SalaryStatistics::UnknownGrouping`.
- **A wrong benchmark caught:** the first timing (1.3 ms) was a query-cache hit from the warm-up call.
  Re-measured as the median of 10 runs: 11–17 ms. Only the real numbers are recorded in design.md.

## 16. Frontend: API client, login and app shell
**Prompt (summary):** A typed API client, login, protected routes and the layout.

**What happened:**
- `lib/api.ts` encodes the API contract: same-origin cookie, `X-CSRF-Token` on non-GET requests,
  `ApiError` carrying `status` and the 422 `fieldErrors`, empty query params dropped.
- Session via TanStack Query (`useSession`, `useLogin`, `useLogout`). The CSRF token is refreshed
  from every session response, because Rails rotates it on login. Logout drops all cached salary
  data. Any 401 (an expired session) re-checks the session, and `RequireAuth` redirects to login,
  then returns the user to the page they asked for. 4xx errors are not retried.
- **Supply-chain check:** shadcn's init added an unfamiliar dependency, `cn`. I verified it before
  accepting it: the only npm maintainer is `shadcn` (the same account as the `shadcn` CLI), the
  repo is `shadcn-ui/cn`, and it has no install scripts. It replaces `clsx` + `tailwind-merge`.
- **Process slip, owned:** this chunk's code was written before its tests, unlike every backend
  step. To compensate, the tests (13, against a small `fetch` fake that drives the real router and
  guards) were mutation-checked: removing the CSRF header and ignoring 401s each failed the right
  tests. Back to test-first for the next chunks.
- Verified on the real stack (Rails + Vite proxy, curl with a cookie jar): 403 without the CSRF
  token, login with it, the authed directory returns seeded data, 401 without a session, and the
  cookie is `httponly; samesite=lax`.

## 17. Frontend: employee directory (test-first)
**Prompt (summary):** A searchable, filterable, server-sorted, paginated directory with its state in the URL.

**What happened:**
- Tests first (red): salary shown annualized in its own currency (with "paid … / month" for monthly
  pay), "No current salary", links, debounced search in the URL, a filter resetting to page 1, sort
  toggling with `aria-sort`, pagination, state restored from a shared URL, an empty state with Clear filters.
- **Design change:** dropped TanStack Table for a plain shadcn `<Table>`. The server does all the
  sorting and paging, so the library added nothing, and v9 was a new API. design.md was updated.
  Native `<select>` was used for filters: accessible and reliably testable in jsdom.
- **Bugs caught:**
  - My own test asserted the "no match" message *after* clearing the filters, which would be wrong
    UI. Fixed the test, not the UI.
  - A lint warning (`set-state-in-effect`) led to a real bug: syncing the search box from the URL
    trimmed text mid-typing, so "priya⎵" + pause + "sh" became "priyash". Fixed with React's
    "adjust state during render" pattern and a trimmed comparison. A regression test was added and
    mutation-checked.
- `npm audit`: 3 low-severity advisories in `deepmerge`, used by the shadcn CLI's registry code,
  not at app runtime. npm's only fix (`--force`) downgrades shadcn to 1.0.0, so it was accepted
  and noted instead of being applied blindly.

## 18. Frontend: employee page, salary history, record a change, delete (test-first)
**Prompt (summary):** The employee page: profile, current salary, the full history labelled past /
current / scheduled, a "Record salary change" dialog with field-level errors, and delete with confirmation.

**What happened:**
- Tests first (7, all red before any code): profile and current salary in its own currency;
  history newest first with status labels; no salary yet plus the next scheduled one; recording a
  change (pre-filled currency and period, exact request body, CSRF header, page updates from the
  response); 422 errors announced on the right fields (`toHaveAccessibleDescription`); delete only
  after confirmation (Cancel sends nothing); unknown employee.
- **Self-correction in a test:** the 422 test first submitted an empty Amount, but the field is
  `required`, so a browser would never send that request. Changed the test to submit `0` and
  expect the server's "must be greater than 0".
- **Mutation checks:** removed `aria-describedby`, the cache update, the redirect after delete,
  the "pre-fill from the current salary" rule, and closed the dialog before the save finished.
  Each was caught. One survived: showing the *furthest* scheduled raise instead of the nearest
  (`find` vs `findLast`), because the test had only one scheduled record. Added a second one; now caught.
- **Design change:** dropped react-hook-form + zod (never installed). The server's validation is
  the single source of truth and its errors are mapped onto fields. design.md §6 records why.
- Added shadcn `dialog` and `alert-dialog` (Radix: focus trap, Escape, labelled by the title).

## 19. Frontend: add and edit employee forms (test-first)
**Prompt (summary):** Add-employee form including the starting salary, an edit form for the
profile, both showing the API's errors on their fields.

**What happened:**
- Tests first (8, all red): entry points from the directory and the employee page; the exact
  create body (nested `initial_salary`) and the redirect to the new employee; the currency
  following the country until HR picks one; profile *and* `initial_salary.*` errors on the right
  fields; edit pre-filled, sending profile fields only; the model's real hire-date error; unknown employee.
- **Flaky-by-design test caught:** one test picked a country before the options had loaded from
  the API. It passed or failed depending on timing. The fix was in the test, which now waits for
  the option like a user would, and the suite was then run three times in a row to confirm it is stable.
- **Mutation checks (7, all caught):** currency always / never following the country, the wrong
  error key for the salary amount, edit sending salary fields, no redirect after edit, no cache
  write after a change, edit losing the country.
- **Refactors:** a shared `filterOptions` test fixture (three test files used copies), one
  `useApplyChange` for all employee mutations (cache write plus invalidating lists, filters and insights),
  and a shared `EmployeeLoadError`.

## 20. Frontend: salary insights page, and a real login bug found by looking at it
**Prompt (summary):** Insights page: grouping, filters, statistics table and a chart. Load the
dataviz skill before charting.

**What happened:**
- **Chart design from the data, not from a template:** rows are per (group, currency), and
  currencies can't share an axis, so the chart shows one currency at a time and refuses to draw a
  one-bar chart. The dataviz skill's checks shaped the rest: one series → one validated hue, a
  table twin, tooltips on hover *and* focus, no dual axis. Recharts (in the original plan) was
  not needed.
- Tests first (7 + 1 money test). **My own fixture was wrong once:** USD had a single group, so
  the app correctly showed the "nothing to compare" hint and my chart assertion failed. Fixed the fixture.
- **Mutation checks:** 7 breaks. Two survived at first: a stale chosen currency after a filter
  change (new test added) and empty params left in the URL (test extended). One "caught" result was
  a false positive: my mutation broke the syntax, so the file didn't run; I redid it as valid code.
- **Rendered it and looked (headless Chromium via Playwright, real 10k seed):**
  - **Real bug, not visible to any unit test: login failed in a browser in development** with
    "Invalid or missing CSRF token". Diagnosis: traced the requests, then reproduced with curl.
    It worked without an `Origin` header and failed with one. The Rails log confirmed it:
    `HTTP Origin header (http://localhost:5173) didn't match request.base_url (http://localhost:3000)`.
    Vite's shorthand proxy rewrites `Host`, so Rails' origin check failed. Fix: `changeOrigin: false`.
    Verified that login now works and that a foreign-origin POST is still rejected with 403. Production was never
    affected (one origin). **My earlier smoke test missed this because curl sends no Origin header.**
  - Layout issues fixed: tooltip clipped below the last row (now opens above and stays inside
    the plot), axis running to 8M for a 5M maximum (finer "nice" steps), squeezed plot and
    overlapping axis labels on a phone (stacked layout), and the header overflowing on a phone.

## 21. Deployment preparation: Docker image, Render Blueprint, README
**Prompt (summary):** Make the app deployable on Render's free plan and write the README.

**What happened:**
- **Hosting decision changed:** the original plan was Neon, because Render's free Postgres expires
  after about 30 days. The developer chose Render's database for a simpler, single-provider setup. Mitigations:
  the expiry is documented, a new database re-seeds itself on the next boot, and `DATABASE_URL`
  keeps any Postgres usable.
- **Dockerfile gap found:** the Rails-generated Dockerfile had no Node step, so a deployed image
  would have served the "run npm run build" message instead of the app. Added a Node 22 build stage.
- **Verified by running the production image locally** against a fresh Postgres 17 container:
  health check, the SPA at `/` and on deep links, login with env-provided credentials, a wrong
  password rejected, data present, and about 100 MB of RAM.
- **Over-engineering removed:** I first added a `SEED_ON_BOOT` step to the entrypoint, since the free
  plan has no shell. The container log showed the seed running *twice*, because `db:prepare` already
  seeds a database it sets up. Removed my step and relied on the built-in behaviour, then
  re-verified on a fresh database plus a restart.
- **Test-harness mistake, not an app bug:** a production-mode login check returned 403 because
  curl does not store `Secure` cookies received over plain HTTP. I passed the cookie explicitly and the
  login succeeded.


## 23. Insights: headcount chart when grouped by country
**Prompt (summary):** "I see 'Only one group is paid in SGD… nothing to compare' every time. What is this?"

**What happened:**
- The message was working as designed, but the design was poor: the default view groups by country,
  each country has its own currency, so the salary chart almost never had two groups to compare, and
  the landing page opened on an empty-chart message. A real UX gap that my tests encoded as correct.
- Options offered: a headcount-by-country chart, or opening Insights on Department + India.
  The developer chose the headcount chart.
- Test first (red), including a country paid in two currencies, which must be summed. Mutation checks:
  ascending order, no summing, and country still getting the salary chart. All were caught. Screenshots
  were checked on desktop and phone.

## 24. Renamed the organisation from ACME to Incubyte
**Prompt (summary):** "Everywhere you named the project ACME; change it all to Incubyte."

**What happened:** replaced every occurrence (UI title and header, login page, README, requirements,
seed data, dev login, session cookie name, Render blueprint names, and all test fixtures). Fake email
addresses use `incubyte.test` / `incubyte.example` rather than a real domain: those endings are
reserved for examples and tests, so sample data can never reach a real inbox. Local sample data was
re-seeded so the new dev login works. Full CI is green.
