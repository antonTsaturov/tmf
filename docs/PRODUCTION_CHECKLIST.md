# Production Readiness Checklist

This checklist is tailored for this repository and should be completed before each production release.

## P0 - Release blockers

### Secrets and credentials
- [ ] Rotate all cloud keys that were ever committed (including `ya_cloud-iam_key.json` lineage).
- [ ] Ensure secret files are not tracked by git (`git ls-files` check).
- [ ] Confirm secrets are loaded from secure storage in production.
- [ ] Verify `.env*` files with real values are not committed.

### CI quality gate
- [ ] CI runs `npm ci`, `npm run lint`, `npm run test:ci`, `npm run build`.
- [ ] Branch protection requires CI checks to pass before merge.
- [ ] Main branch has no failing required checks.

### Dependency and runtime sanity
- [ ] `npm ls` has no missing runtime dependencies.
- [ ] `npm audit --omit=dev` has no unresolved critical issues.
- [ ] Lockfile is up to date and committed.

### Critical smoke flow in staging
- [ ] Login works.
- [ ] Document upload works.
- [ ] Submit to review works.
- [ ] Approve/reject works.
- [ ] Archive/restore/unarchive works.
- [ ] Logout works.

## P1 - Stability and operations

### Database and migrations
- [ ] DB schema and repository queries are consistent.
- [ ] Migration process supports upgrade and rollback.
- [ ] Deployment procedure includes schema migration steps.

### Security hardening
- [ ] Production cookie flags are correct (`HttpOnly`, `Secure`, `SameSite`).
- [ ] CORS allowlist is restricted to trusted domains.
- [ ] CSRF token flow validated in production-like environment.
- [ ] Rate limit thresholds are tested under realistic traffic.

### Observability
- [ ] Structured logs are centralized.
- [ ] Alerts exist for high error rate and elevated latency.
- [ ] Dashboards cover API health, auth failures, DB and storage errors.

### Backup and restore
- [ ] Regular backup schedule is enabled.
- [ ] Restore drill has been tested against a staging clone.
- [ ] RPO and RTO targets are documented and accepted.

## P2 - Post-release improvements

- [ ] Add E2E smoke suite for critical user journeys.
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
