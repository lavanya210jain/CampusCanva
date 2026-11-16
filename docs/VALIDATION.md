# Validation record

Validated on 13 November 2026 with Node 24, MySQL 8.4 (Docker), and Chromium.

- `npm run build`: passed with strict TypeScript checking.
- `npm test`: 3 validation tests passed.
- `npm run test:integration`: 8 MySQL integration tests passed against an isolated `campuscanva_test` database.
- `npm run test:browser`: 1 complete browser workflow passed: login, create space, reload persistence, real file upload, deletion, SQL reports and mobile overflow checks at 390px.
- `npm run lint`: completed without errors; pre-existing frontend cleanup and React effect warnings remain.
- `git diff --check`: passed.

MySQL setup and seeding were executed against a real server, not a database mock. The integration suite includes concurrent comment insertion, transaction rollback, cascade deletion and direct integrity-constraint rejection. XAMPP/MariaDB and Windows were not separately executed here; the README includes laptop setup instructions.

The frontend-only practice fallback remains available but is not the database demonstration. See README and VIVA_GUIDE for implemented scope and limits.

## Privacy, profile and notification update — 16 November 2026

- Strict TypeScript / production build passed.
- 5 request-validation tests passed, including phone normalization and space visibility.
- 13 MySQL integration tests passed, including privacy across feeds/files/reports/inspectors, membership revocation, duplicate-safe capsule alerts, local avatars, direct phone CHECK enforcement and repeated non-destructive upgrades.
- Fresh setup succeeded against MySQL 8.4; the integration suite passed against both an upgraded existing test database and a fresh database.
- 3 browser workflows passed, including a private-space/public-space switch, local profile photo persistence, registration/profile phone validation and an unlock alert appearing without manual refresh.
- Lint completed with no errors; existing frontend cleanup warnings remain.

See UPDATE_GUIDE.md for Windows ZIP updates that retain .env, uploaded files and the existing MySQL database.
