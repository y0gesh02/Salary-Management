# ACME Salary Management

Salary management for the HR Manager of ACME, a 10,000-person organisation that pays people in
eight countries. HR can keep employee records, record pay changes over time, and see how
the organisation pays people by country, department and job title.

**Live demo:** _(URL added after deploy)_. The login is shared with the submission.
The free hosting sleeps when idle, so the first request can take up to a minute.

## What it does

- **Employee directory:** search by name or email, filter by country, department and job title,
  sort any column (including current annual salary), and page through results. The view lives in
  the URL, so it can be bookmarked and shared.
- **Employee page:** profile, the salary in effect today, and the full pay history, with each
  record labelled past, current or scheduled.
- **Pay changes are appended, never edited:** a raise, a correction or a future-dated change
  is a new record, so the history stays complete.
- **Add, edit and delete employees.** A new employee is saved together with their starting salary.
- **Salary insights:** headcount, min, median, average, max and total payroll per country,
  department or job title, with filters, plus a chart of the salary spread.
- **Money is never converted.** Every amount carries its ISO 4217 currency code, and statistics
  are kept per currency. Monthly pay is annualised (×12) for comparisons.

## Documentation

| Document | Contents |
|---|---|
| [docs/requirements.md](docs/requirements.md) | The one-page requirements, written before building: scope, domain rules, out of scope |
| [docs/design.md](docs/design.md) | Architecture and ER diagrams, the "current salary" decision and its trade-offs, API, frontend, testing strategy, **measured performance** |
| [docs/ai-workflow.md](docs/ai-workflow.md) | How AI was used, step by step: prompts, what it got wrong, what was changed and why |

## Tech stack

Ruby 3.4, Rails 8.1 (JSON API), PostgreSQL 17. React 19 with TypeScript (Vite), TanStack Query,
React Router, shadcn/ui and Tailwind. RSpec and FactoryBot for the backend, Vitest and Testing
Library for the frontend. Rails serves the built React app, so there is one deploy and one
origin, and session cookies need no CORS.

## Running it locally

Prerequisites: Ruby 3.4.4, Node 22, PostgreSQL 17 running locally.

```bash
bundle install
npm --prefix frontend ci
bin/rails db:prepare          # creates the database and seeds 10,000 employees (about 3 s)
bin/dev                       # Rails on :3000, Vite on :5173
```

Open http://localhost:5173 and log in as `hr@acme.test` / `acme-hr-password` (development only;
production takes the login from environment variables).

Re-seed with `RESET=1 bin/rails db:seed`. For a smaller dataset, use `SEED_EMPLOYEES=500`.

## Tests

```bash
bin/ci                        # everything CI runs: RuboCop, bundler-audit, Brakeman, RSpec,
                              # frontend lint, type check, tests and production build
bundle exec rspec             # backend only
npm --prefix frontend test    # frontend only
```

The tests are fast (about 4 s for the backend, 4 s for the frontend) and deterministic: fixed
dates instead of the real clock, a seeded generator and no network. GitHub Actions runs `bin/ci` on every push.

## Deploying (Render, free plan)

`render.yaml` describes a free Postgres 17 database and a free Docker web service.

1. In Render: **New → Blueprint**, then pick this repository.
2. Fill in the values it asks for:
   - `RAILS_MASTER_KEY`: the contents of `config/master.key`
   - `HR_EMAIL` and `HR_PASSWORD`: the HR Manager login (password of at least 12 characters)
3. Deploy. The Dockerfile builds the React app and then the Rails image. On first boot,
   `db:prepare` loads the schema into the empty database and runs the seed (HR login and
   10,000 employees). Later deploys only run new migrations.

Notes:
- Render's free web service sleeps after about 15 minutes idle.
- Render's free Postgres expires after about 30 days. To reset, create a new database: the next
  boot seeds it again.
- Any Postgres works. Set `DATABASE_URL` (for example Neon) instead of using the blueprint's database.

## Project layout

```
app/controllers/api/   JSON API (thin controllers, secure by default)
app/models/            Employee, SalaryRecord (append-only), User, Country
app/queries/           EmployeeSearch (directory), SalaryStatistics (insights): read-side SQL
app/services/          Employees::Create (employee + first salary in one transaction)
lib/seeding/           deterministic 10,000-employee generator and bulk loader
frontend/src/          React app: employees/, insights/, auth/, lib/ (API client, money formatting)
spec/                  RSpec: models, queries, services, requests, seeding
docs/                  requirements, design, AI workflow
```

## Deliberately out of scope

These are listed with reasons in [requirements.md](docs/requirements.md): currency conversion,
deductions, taxes and net pay, hourly pay, approval workflows, multiple users and roles,
Excel import/export, employee lifecycle (terminations, transfers), and an audit log.
