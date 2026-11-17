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

## Passwordless quick-access removal — 17 November 2026

Removed evaluator cards from welcome/login, the navbar account switcher and the shared switch-user action. The old /api/auth/demo endpoint now rejects requests even with DEMO_LOGIN=true in an existing environment. Normal login fields start empty. Seeded accounts and saved memories remain intact; sign in with their email and password.

Validation: 5 validation tests, 14 MySQL integration tests and 4 browser workflows passed. Browser assertions cover absent evaluator controls, blank credential fields, absent account switching and rejected passwordless login. Production build passed. No database migration is needed for this removal.

## Visual design and theme update — 17 November 2026

Replaced the static landing feature cards with selectable illustrated previews and real navigation links. Added a forest/cream/terracotta palette, responsive layouts and a stored light/dark preference with system-preference initialization and reduced-motion support. Dark variants cover the main pages, dialogs, inputs, cards, notifications and SQL inspector.

Validation: production build and validation tests passed; all 5 browser workflows passed, including preview selection, system dark initialization, explicit light override, reload/navigation persistence, dark dialogs and mobile overflow. Desktop light/dark landing, dark dashboard and mobile landing screenshots were visually inspected. No database changes are required.

## Inspector opt-in and image defaults — 18 November 2026

Production build and all 5 validation tests passed. All 15 MySQL integration tests passed, including account creation without an avatar and one-time legacy-image cleanup that preserves custom URLs and later user choices. All 7 browser workflows were verified, including hidden/direct-route Database Lab gating, toggling it off while open, mobile navigation, empty profile placeholders and solid themed covers. A transient font/layout measurement was stabilized with a polling assertion; the final focused theme/gating/image checks passed.

Legacy-image migration runs transactionally with a persisted marker under the existing upgrade lock. No uploaded files, user accounts, memberships or memories are deleted.
