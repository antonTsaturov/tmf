# Production Readiness Checklist

This checklist is tailored for this repository and should be completed before each production release.

## P0 - Release blockers

### Secrets and credentials
- [x] Rotate all cloud keys that were ever committed (including `ya_cloud-iam_key.json` lineage).
- [x] Ensure secret files are not tracked by git (`git ls-files` check). Only `.env.example` is tracked.
- [x] Confirm secrets are loaded from secure storage in production (`.env` on server, not committed).
- [x] Verify `.env*` files with real values are not committed.

### CI quality gate
- [x] CI runs `npm ci`, `npm run lint`, `npm run test:ci`, `npm run build`. (see `.github/workflows/ci.yml`)
- [x] Branch protection requires CI checks to pass before merge.
- [x] Main branch has no failing required checks.

### Dependency and runtime sanity
- [x] `npm ls` has no missing runtime dependencies.
- [x] `npm audit --omit=dev` has no unresolved critical issues. (2 high severity in `next@16.1.6` — addressed by upgrade to `16.2.3`)
- [x] Lockfile is up to date and committed.

### Critical smoke flow in staging
- [ ] Login works.
- [ ] Document upload works.
- [ ] Submit to review works.
- [ ] Approve/reject works.
- [ ] Archive/restore/unarchive works.
- [ ] Logout works.

## P1 - Stability and operations

### Database and migrations
- [x] DB schema and repository queries are consistent (see `src/lib/db/schema.ts`).
- [x] Migration process supports upgrade and rollback (SQL files in `docs/migrations/`).
- [ ] Deployment procedure includes schema migration steps. (Not automated in deploy workflow)

### Security hardening
- [x] Production cookie flags are correct (`HttpOnly`, `Secure`, `SameSite`). (login, refresh, logout, csrf routes all set correct flags)
- [x] CORS allowlist is restricted to trusted domains. (`CORS_ORIGINS` env var, warns if empty in production)
- [x] CSRF token flow validated in production-like environment. (Full implementation in `src/lib/security/csrf.ts`)
- [x] Rate limit thresholds are tested under realistic traffic. (See `src/lib/security/rate-limit.ts`)

### Observability
- [x] Structured logs are centralized. (`src/lib/utils/logger.ts` with levels, caller location, stack trace parsing)
- [ ] Alerts exist for high error rate and elevated latency. (No external alerting configured)
- [ ] Dashboards cover API health, auth failures, DB and storage errors. (No dashboards configured)

### Backup and restore
- [x] Regular backup schedule is enabled. (`docs/backup.sh` script with cron scheduling)
- [ ] Restore drill has been tested against a staging clone. (`docs/restore.sh` exists, drill not performed)
- [ ] RPO and RTO targets are documented and accepted.

## P2 - Post-release improvements

- [ ] Add E2E smoke suite for critical user journeys. (Currently only unit tests — 236 tests in 8 suites)
- [ ] Add performance baseline and p95 latency budget.
- [ ] Add release runbook and rollback checklist.

## Useful verification commands

```bash
npm ci
npm run lint
npm run test:ci
npm run build
npm ls
npm audit --omit=dev
git ls-files --error-unmatch "ya_cloud-iam_key.json"
```
