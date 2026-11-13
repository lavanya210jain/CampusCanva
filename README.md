# CampusCanva — A Living Digital Archive of Campus Life

Semester 3 DBMS project · NSUT Delhi. React + TypeScript + Express + **MySQL**.

Students, faculty and alumni create collaborative memory spaces, upload photos/videos, tag people, react, comment and seal time capsules. The default application reads and writes MySQL through the API. Browser localStorage is used only in the explicitly selected practice fallback.

## Run on your laptop

Install **Node.js 22.12+** (Node 24 LTS recommended), npm, and **MySQL 8.0.16+** (8.4 recommended). MySQL Workbench is optional and useful during the viva. Keep MySQL running.

1. Extract/clone this project and open a terminal in the project folder.
2. Install packages:

   ```sh
   npm ci
   ```

3. Copy `.env.example` to `.env`. On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   On macOS/Linux:

   ```sh
   cp .env.example .env
   ```

4. Edit `.env` with your MySQL port, username and password. A typical local installation uses `DB_PORT=3306`, `DB_USER=root`; set `DB_PASSWORD` to your own MySQL password. Never commit `.env`.
5. Initialize the database once:

   ```sh
   npm run db:setup
   ```

6. Start both the API and UI:

   ```sh
   npm run dev
   ```

7. Open **http://localhost:5173**. The API runs at http://localhost:5000. The UI proxies `/api` requests to the API.

If using XAMPP, start its MySQL service and use its configured port/credentials. The code was tested on MySQL 8.4; MariaDB/XAMPP compatibility is intended but has not been separately verified.

### Optional Docker database

If Docker Desktop is already installed, instead of installing MySQL directly:

```sh
docker compose up -d
```

Wait for the database to become healthy (`docker compose ps`), then set `DB_PORT=3307` and `DB_PASSWORD=campuscanva-local` in `.env`. Follow steps 5–7 above. The Compose volume retains the database when the container stops. `docker compose down` stops it; do not use `down -v` unless you want to erase its data.

## Accounts for the presentation

All seeded accounts use password **`CampusCanva123!`**.

| Persona | Email | ID |
| --- | --- | --- |
| Student | kavya.cse@nsut.ac.in | 1 |
| Faculty | vivek.mehta@nsut.ac.in | 5 |
| Alumni | aman.alumni@nsut.ac.in | 7 |

With `DEMO_LOGIN=true`, evaluator buttons can sign in as only these three seeded personas. This is an explicit localhost presentation shortcut. Set `DEMO_LOGIN=false` to require passwords for everyone. Regular login always verifies a bcrypt password hash. Sessions are stored in MySQL; APIs derive the acting user from the session, not a submitted user ID. The SQL Inspector toggle only controls educational UI and never switches the database.

## What to show the teacher

See [docs/VIVA_GUIDE.md](docs/VIVA_GUIDE.md) for a 10-minute demonstration, normalization assumptions, relationship mapping, transactions and concurrency. [database/demo_queries.sql](database/demo_queries.sql) contains read-only SQL examples for Workbench.

- **Dashboard:** live SQL counts and memory feeds.
- **Database Lab:** live joins, aggregation, views and a HAVING/subquery report, with executed SQL.
- **Space creation:** `trg_after_insert_space` creates the Admin membership automatically.
- **Members:** Admins add/remove people and change roles. Viewers cannot upload. The creator must remain an Admin.
- **Upload:** files up to 20 MB, file signature validation, local disk storage and relational media metadata. JPEG, PNG, WebP, GIF, MP4 and WebM are supported. Public URL import remains available.
- **Comments:** weak entity with PK `(media_id, comment_no)`, concurrency-safe partial-key allocation and cascade deletion.
- **Notifications:** tags, reactions, comments and membership changes create database rows.
- **Time capsule:** server time gates content in feeds, direct lookup, interaction APIs, SQL Inspector and protected file URLs. Contributors can deposit files while locked. Time locks are immutable after creation.
- **SQL Inspector:** displays real records retrieved from MySQL, with no password hashes.

All spaces are shared with authenticated campus users in this version. Membership controls contribution and administration; private spaces and invitation approval are not implemented. Commenting/reacting is open to signed-in campus users on unlocked media.

## Database design

`database/schema.sql` defines 15 tables, two views, foreign keys, composite/unique keys, CHECK constraints, and triggers. `server/setup.ts` creates the schema and loads the realistic TypeScript seed dataset into SQL inside a transaction. Passwords are hashed during seeding.

Key tables: `users`; user subtypes `student`, `alumni`, `faculty`; `campus_spot`; `memory_space`; `space_member`; `media_item`; media subtypes `photo`, `video`; `media_tag`; `reaction`; weak entity `comment`; `notification`; `app_session`.

- User and media subtypes must match the parent's discriminator; direct mismatched subtype inserts/updates are rejected by triggers. The API creates the parent and required subtype in one transaction. Direct SQL users must also follow that transaction convention: SQL does not enforce total participation by itself.
- Foreign keys cascade dependent rows. A deleted campus spot sets its spaces' spot reference to NULL.
- Comment allocation locks/increments a counter on the parent media row. Concurrent comments get different partial keys; deleting a comment does not recycle its number.
- An analytics view uses `COUNT(DISTINCT ...)` to prevent join fanout from inflating totals.
- Database times are UTC; the browser renders them in the laptop's local timezone.
- Files live in `server/uploads`; MySQL stores URLs and metadata, not file BLOBs. Back up both the database and the uploads folder.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | API + Vite development UI |
| `npm run db:setup` | Create and seed a fresh database; refuses to overwrite existing tables |
| `npm run db:reset` | **Erase the configured database tables and reseed**; explicit development/demo reset |
| `npm run build` | Strict TypeScript check and production frontend build |
| `npm start` | Serve the API and built frontend at http://localhost:5000 |
| `npm run lint` | Oxlint checks |
| `npm test` | Request-validation tests, no database needed |
| `npm run test:integration` | Real MySQL integration tests; requires isolated database ending in `_test` |

Setup/reset uses DDL and is not an incremental migration system. Existing installations should back up first. Resetting SQL does not delete existing upload files; remove unwanted files manually after backing up. Never run reset before a presentation unless you deliberately want a clean dataset.

### Integration test database

Create a separate `.env.test` by copying `.env`, changing `DB_NAME=campuscanva_test`, and optionally setting `UPLOAD_DIR=server/test-uploads`. Then:

```sh
npm run db:test:setup
npm run test:integration
```

The test command loads `.env.test` when present. Alternatively set those environment variables in your shell (as CI does). Tests refuse to run against a database whose name does not end in `_test`. They cover password checks, sessions, registration rollback, role checks, sealed capsules, concurrent comments, cascades, notifications, uploads and direct database constraints.

### Frontend-only practice mode

For UI practice without MySQL, set `VITE_DATA_MODE=mock` in `.env`, then run `npm run dev:client`. This explicitly uses the old browser-local simulation with demonstration-only authentication. It is not the MySQL project demonstration. Return to `VITE_DATA_MODE=mysql` and restart Vite for the viva. The landing/login connection status indicates the selected mode.

### Browser integration check

With MySQL/API/UI already running and seeded accounts available:

```sh
npx playwright install chromium
npm run test:browser
```

The browser test creates and removes its own demonstration space. It verifies login, SQL persistence after reload, file upload/deletion, report rendering and mobile overflow. Run it before your presentation, not during one. `TEST_BASE_URL` can target another local UI address; `CHROMIUM_PATH` can select an existing Chromium executable.

## Troubleshooting

- **Access denied / ECONNREFUSED:** check MySQL is running and `.env` credentials/port are correct. The backend fails clearly rather than silently falling back to browser storage.
- **Existing database:** `db:setup` intentionally preserves it. Use a different `DB_NAME`, or back up and deliberately run `db:reset`.
- **Port 5173 already used:** stop the other Vite process. If you change ports, update `APP_ORIGINS` in `.env`.
- **Photos fail without internet:** original seed photos are remote sample URLs. Upload your own local images before the presentation; those files work without internet. The database/API/UI themselves run locally.
- **Authentication expired:** log in again. Logging out revokes the MySQL session.
- **Browser cache after switching modes:** restart Vite and reload the page. Mock and MySQL datasets are independent.

The project remains a localhost academic application. Hosting, private spaces, invitations, moderation, archive export and scheduled capsule reminder notifications are future work.
