# Portable MySQL runtime research

## Scope

- Replace the Neon-only PostgreSQL adapter with a generic MySQL 8 compatible
  adapter using Drizzle and `mysql2`.
- Preserve the existing database-free demo path.
- Add versioned migrations that enforce the existing foreign keys, indexes,
  valid booking date ranges, and overlapping-booking rejection.
- Add a standalone, non-root, multi-architecture container runtime with a
  health endpoint.
- Keep the fork generic: no Konyer names, domains, credentials, or deployment
  policy.
- Allow an explicitly configured authenticating proxy to replace the shared
  PIN while preserving the PIN gate by default.

## Existing conventions

- Vitest is the test runner and tests sit beside source files.
- `DATABASE_URL` selects persistent mode; an absent value selects demo data.
- Booking dates are ISO `YYYY-MM-DD` strings.
- Server actions enforce identity, ownership, valid date ranges, and booking
  conflicts.
- Drizzle owns schema and migrations.

## Acceptance checklist

- Demo mode still loads without importing or connecting to the database.
- A MySQL connection URL creates a reusable Drizzle/mysql2 pool.
- The baseline migration creates all application tables and constraints.
- The overlap guard rejects intersecting bookings globally, including bookings
  owned by different people, while allowing non-overlapping adjacent stays.
- Startup applies committed migrations before serving requests.
- The runtime image is non-root and can build for arm64 and amd64.
- A health endpoint reports application and database readiness without
  exposing credentials.
- Application configuration contains no portal- or family-specific values.
- Production dependencies have no known npm audit findings.
