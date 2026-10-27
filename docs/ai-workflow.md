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
