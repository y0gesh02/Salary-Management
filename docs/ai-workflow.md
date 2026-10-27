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
