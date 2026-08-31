# Portable MySQL runtime test plan

1. Add focused adapter tests for missing URLs, URL forwarding, pooling, and
   cache reuse using a mocked `mysql2/promise` implementation.
2. Preserve and run the existing demo data-source tests.
3. Add a MySQL integration test that applies committed migrations to a clean
   database, exercises foreign keys, invalid date ranges, globally overlapping
   bookings, and adjacent stays, and is enabled by a dedicated test connection
   variable.
4. Add a CI MySQL service so the integration test is exercised on every pull
   request.
5. Build the standalone image and inspect its declared non-root user and
   multi-platform publishing configuration.
6. Run the focused Vitest suite, lint, production build, container build, and
   the repository-wide validation commands.
7. Test the opt-in trusted-proxy gate, production container startup, clean
   production dependency audit, and published amd64/arm64 manifest.
