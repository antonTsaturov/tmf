# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Auth: Session expiration every 15 minutes** — Access token lifetime was 15 minutes, but there was no automatic refresh mechanism. Users were forced to re-login every ~15 minutes. Fixed by implementing automatic token refresh.

### Added

- **Backup system** — Production-ready PostgreSQL + S3 backup system:
  - `src/scripts/backup.sh` — Automated backup script with compression, verification, S3 upload, retention policies, and Slack alerts
  - `src/scripts/restore.sh` — Restore script with safety prompts, pre-restore backup option, and ability to restore to a new database
  - `src/scripts/backup.env.example` — Environment template for backup configuration
  - `src/lib/backup/backup.service.ts` — TypeScript backup service for programmatic backup management
  - `POST /api/admin/backup/run` — API endpoint to trigger backup from web interface
  - `GET /api/admin/backup/status` — API endpoint to check backup status
  - `POST /api/admin/backup/cleanup` — API endpoint to delete old backups
- **`useTokenRefresh` hook** (`src/hooks/useTokenRefresh.ts`) — Automatically calls `POST /api/auth/refresh` every 10 minutes to keep the access token alive before it expires (15-minute lifetime). On refresh failure, redirects user to login page.
- **Token refresh tests** (`src/__tests__/token-refresh.test.ts`) — 27 new tests covering session management, JWT flow, login session creation, token refresh behavior, and logout invalidation.
- **`CHANGELOG.md`** — Project changelog file.

### Changed

- **`AuthProvider`** (`src/wrappers/AuthProvider.tsx`) — Integrated `useTokenRefresh` hook. Now automatically refreshes access tokens every 10 minutes for authenticated users.
- **Login endpoint** (`src/app/api/auth/login/route.ts`) — Now creates a session via `createSession()` and includes `sessionId` in the JWT access token payload. Cookie `maxAge` reduced from 24 hours to 15 minutes to match access token lifetime.
- **Refresh endpoint** (`src/app/api/auth/refresh/route.ts`) — Completely rewritten. No longer requires `refreshToken` in request body (it was never stored on the client). Now extracts `sessionId` from the access token cookie (even if expired via `jwt.decode`), verifies the session is still active, and issues a new access token.
- **Logout endpoint** (`src/app/api/auth/logout/route.ts`) — Now handles expired access tokens by decoding them with `jwt.decode` to extract `sessionId` for proper session invalidation.
- **Test setup** (`src/__tests__/setup.ts`) — Session mock rewritten to match the real `createSession({userId, userEmail, refreshTokenHash})` API. Added `updateSessionActivity` mock with proper expiration checks. Exported `mockSessionStorage` for test assertions.

### Removed

- Refresh token body requirement from `POST /api/auth/refresh` — replaced with session-based refresh using cookie-stored access token.

### Security

- **Backup credentials isolation** — Backup S3 credentials separated into dedicated env vars (`BACKUP_S3_*`) to avoid mixing with production storage credentials.
- **Restore safety** — Restore script requires explicit confirmation, offers pre-restore backup, and supports restore-to-new-database mode to prevent accidental data loss.
