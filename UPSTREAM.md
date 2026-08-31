# Maintaining this fork

This repository remains a general-purpose fork of the upstream booking
calendar. Deployment-specific infrastructure and private household data belong
in the deployment repository, not here.

## Remote layout

- `origin` is this fork.
- `upstream` is the canonical project.

Refresh and review upstream changes without rewriting local history:

```bash
git fetch origin upstream
git switch master
git pull --ff-only origin master
git switch -c upstream-sync-YYYY-MM-DD
git merge --no-ff upstream/master
npm ci
npm test -- --run
npm run lint
npm run build
```

Resolve conflicts in favor of upstream product behavior while preserving the
portable runtime seams below. Merge the sync through a pull request.

## Deliberate deviations

- Persistent mode uses standard MySQL 8 through `mysql2` and Drizzle. Demo mode
  remains database-free.
- Production startup applies committed migrations; it never performs schema
  push or generation against a live database.
- The standalone OCI image runs as an unprivileged user and supports amd64 and
  arm64.
- Optional people configuration is mounted as JSON and upserted after
  migrations. Private names and other deployment data never enter this repo.
- An explicit trusted-proxy mode lets deployments replace the shared PIN with
  upstream authentication while keeping the default PIN gate intact.
- GitHub Actions test the real MySQL migration and publish only immutable
  commit-tagged GHCR images.

Changes that improve those generic capabilities should remain suitable for an
upstream pull request. Hostnames, infrastructure providers, cluster manifests,
credentials, household names, access codes, prices, payment instructions and
addresses are intentionally out of scope.
