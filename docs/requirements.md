# Salary Management — Requirements (v1)

## Goal
Replace Incubyte's spreadsheet-based salary tracking with a web application that lets the HR Manager
maintain salary data for ~10,000 employees across multiple countries, and answer questions about
how the organization pays people.

## Persona
**HR Manager** — a single, trusted user. Comfortable with spreadsheets, not technical. Needs to
find an employee quickly, record a pay change correctly, and get a trustworthy answer to
"what do we pay for X?" without building a pivot table.

## Questions the product must answer
1. What is the min / max / average / median salary in a given country?
2. What do we pay for a given job title in a given country?
3. How many people and how much annual payroll do we have per country and per department?
4. What is this employee paid today, and how has their pay changed over time?

## Scope & features (v1)
| # | Feature | Notes |
|---|---------|-------|
| 1 | **Login / logout** | One HR Manager account, seeded from environment variables. All other pages and APIs require login. |
| 2 | **Employee directory** | Server-side paginated, searchable (name, email) and filterable (country, department, job title) list showing current salary. |
| 3 | **Add / edit / delete employee** | Profile: full name, email, job title, department, country, hire date. A new employee is created with an initial salary. Delete asks for confirmation. |
| 4 | **Salary history** | Record a salary change as a new record (amount, currency, period, effective date). Past records are never modified. Employee page shows the full history. |
| 5 | **Salary insights** | Per country, per job title within a country, and per department: headcount, min, max, average, median and total annual payroll. |
| 6 | **Seed script** | 10,000 realistic employees with salary histories, generated from a fixed random seed so every run is reproducible. |

## Key domain rules
- **Money**: stored as an exact amount plus an ISO 4217 currency code (USD, INR, GBP…). Never floats.
- **No currency conversion**: statistics are always grouped by currency; amounts in different
  currencies are never added or averaged together. Every amount in the UI shows its currency.
- **Compensation period**: `annual` or `monthly`. Insights normalize to annual (monthly × 12).
- **Current salary**: the salary record with the latest effective date on or before today; if two
  records share that date, the most recently created one wins. Future-dated records (scheduled
  raises) are stored and shown in history but do not count as current until their date arrives.

## Deliberately out of scope (and why)
| Left out | Reason |
|----------|--------|
| Currency conversion | Exchange rates change daily; a fixed rate would make reports quietly wrong. Grouping by currency gives honest answers. |
| Deductions, taxes, net pay | That is payroll processing, a separate domain with per-country rules. The goal is managing and analysing pay. |
| Hourly pay | Converting it to annual needs an hours-per-year assumption that varies by contract. |
| Approval workflows | The single user *is* the approver. Adds states and screens with no value for this persona. |
| Multiple users and roles | One persona is defined. The auth design leaves room to add roles later. |
| Excel import / export | Valuable for migration, but a sizeable feature of its own. The seed script covers data setup for v1. |
| Employee lifecycle (termination, transfers, org chart) | Not needed to answer the pay questions above. |
| Audit log of who changed what | One user, and append-only salary history already preserves the pay trail. |

## Non-functional requirements
- **Performance**: the directory and insights respond in under ~500 ms with 10,000 employees.
  Pagination, filtering and aggregation happen in the database, not in the browser or Ruby.
- **Quality**: core domain rules (current salary, normalization, statistics) covered by fast,
  deterministic unit tests. The app is built test-first and shipped in incremental commits.
- **Deployability**: a single deploy (a Rails app that also serves the React build) on a free host.

## Assumptions and clarifications received
- Salaries stay in local currency; no conversion (confirmed).
- Simple login for one HR Manager (confirmed).
- Salary history is required; no approval workflow (confirmed).
- Deductions and net pay are out of scope (confirmed).
- Free hosting of our choice; no fixed deadline (confirmed).
- *Assumption*: an employee's currency usually matches their country, but it is stored explicitly
  on each salary record rather than derived from the country.
