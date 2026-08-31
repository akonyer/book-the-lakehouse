# Portable runtime test-quality review

## Requirement evidence

- Demo mode: `migration startup script > preserves database-free demo mode`
  and the existing data-source demo tests.
- MySQL adapter: all three tests under `MySQL database client`.
- Baseline schema and constraints: `creates the complete schema with
  foreign-key and date-range constraints`.
- Configuration upsert and repeatable migration: `reapplies migrations and
  upserts mounted people configuration`.
- Insert and update overlap guards: `rejects globally overlapping stays and
  allows the following adjacent stay` and `rejects an update that would overlap
  another stay`.
- Concurrency: `serializes simultaneous overlapping booking writes` proves one
  of two conflicting writes commits and the other receives the named database
  error.
- Trusted proxy: all six parameterized and focused tests under `PIN gate`.
- Runtime and architecture: the workflow starts the built non-root image against
  MySQL, checks database health and absence of the PIN page, then publishes and
  inspects amd64 and arm64 manifests.

## Quality review

Pseudo-mutation review found the security default, exact proxy opt-in, missing
database URL, pool reuse, migration idempotence, foreign key, date range,
insert/update overlap, adjacent boundary and concurrent-write outcomes directly
observable. The adjacent-write assertion was strengthened from driver-response
presence to an exact two-row database state.

Assertion review found no assertion-free or trivial-only generated test. The
suite uses exact equality/deep structure, exception subsets with database error
codes, negative mock-call verification, persisted-state checks and concurrency
outcomes. The real database suite is deliberately conditional locally and is
mandatory in CI through `TEST_DATABASE_URL`.

The required static source-pairing analyzer was attempted, but its bundled
script expects a removed `tree-sitter-language-pack` API; the current package
and an older compatible candidate could not run on the system Python. Source
pairing was therefore not used as completion evidence.
