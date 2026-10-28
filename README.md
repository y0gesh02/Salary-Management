# Incubyte Salary Management

I built this for the HR Manager of Incubyte, a company with 10,000 employees in eight countries.
It lets HR keep employee records, track salary changes over time, and see how people are paid
by country, department and job title.

**Live demo:** https://salary-management-w8l4.onrender.com. I've shared the login details with my submission.
It runs on a free plan that sleeps when nobody uses it, so the first page load can take up to a minute.

## What you can do

- **Find employees.** Search by name or email, filter by country, department or job title, sort
  any column (including salary), and page through the list. The search and filters stay in the
  URL, so you can bookmark or share a view.
- **See an employee's pay.** Each employee has a page with their details, the salary they're paid
  today, and their full salary history. Each entry is marked as past, current or scheduled.
- **Record a salary change.** A raise or a correction is saved as a new entry. Old entries are
  never changed, so the history is always complete. You can also add a change that starts on a
  future date.
- **Add, edit and delete employees.** When you add someone, you enter their starting salary too.
- **See salary insights.** Headcount, lowest, median, average, highest and total pay, grouped by
  country, department or job title, with filters and a chart.
- **Different currencies are never mixed.** Every salary keeps its own currency (INR, USD,
  EUR…), and I never convert between them. Insights are shown per currency. Monthly salaries are
  multiplied by 12 so they can be compared with yearly ones.

## Documents

| Document | What's in it |
|---|---|
| [docs/requirements.md](docs/requirements.md) | The one-page requirements I wrote before starting: what's in, what's out, and the rules |
| [docs/design.md](docs/design.md) | Diagrams, the main design decisions and why I made them, the API, how I tested it, and performance numbers I measured |
| [docs/ai-workflow.md](docs/ai-workflow.md) | How I used AI along the way: what I asked, what went wrong, and what I changed |

## Tech stack

- **Backend:** Ruby 3.4, Rails 8.1 (JSON API), PostgreSQL 17
- **Frontend:** React 19 + TypeScript (Vite), TanStack Query, React Router, shadcn/ui, Tailwind
- **Tests:** RSpec + FactoryBot (backend), Vitest + Testing Library (frontend)

Rails also serves the built React app, so it's a single app to run and deploy.

## Running it on your machine

You need Ruby 3.4.4, Node 22 and PostgreSQL 17.

```bash
bundle install
npm --prefix frontend ci
bin/rails db:prepare          # creates the database and adds 10,000 sample employees (takes a few seconds)
bin/dev                       # starts Rails (port 3000) and the frontend (port 5173)
```

Then open http://localhost:5173 and log in with `hr@incubyte.test` / `incubyte-hr-password`.
This login only works locally; the live site uses its own.

To reload the sample data, run `RESET=1 bin/rails db:seed`. For a smaller set, add `SEED_EMPLOYEES=500`.

## Running the tests

```bash
bin/ci                        # runs everything: code style, security checks, backend and frontend tests, and a production build
bundle exec rspec             # backend tests only
npm --prefix frontend test    # frontend tests only
```

The tests take a few seconds each and give the same result every run. They use fixed dates
instead of today's date, and fixed sample data. GitHub Actions runs `bin/ci` on every push.

## Where things are

```
app/controllers/api/   the API endpoints
app/models/            Employee, SalaryRecord, User, Country
app/queries/           the employee search and the salary statistics
app/services/          adding an employee together with their first salary
lib/seeding/           the sample data generator (10,000 employees)
frontend/src/          the React app
spec/                  backend tests
docs/                  requirements, design and AI notes
```

## What I left out on purpose

Currency conversion, taxes and net pay, hourly pay, approval steps, multiple users and roles,
Excel import/export, things like terminations and transfers, and an audit log. My reasons are in
[requirements.md](docs/requirements.md).
