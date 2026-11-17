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

## Seeded Accounts for demo

All seeded accounts use password **`CampusCanva123!`**.

| Persona | Email | ID |
| --- | --- | --- |
| Student | student.demo@campuscanva.local | 1 |
| Faculty | faculty.demo@campuscanva.local | 5 |
| Alumni | alumni.demo@campuscanva.local | 7 |

All accounts require email and password. Quick evaluator login and persona switching have been removed. Legacy DEMO_LOGIN settings have no effect. Sessions are stored in MySQL; APIs derive the acting user from the session. SQL Inspector starts off; enable it to reveal Database Lab. Disabling it hides the page and redirects to Dashboard.

## Database design

`database/schema.sql` defines 16 tables (15 existing application tables plus `app_migration` upgrade bookkeeping), two views, foreign keys, composite/unique keys, CHECK constraints, and triggers. `server/setup.ts` creates the schema and loads the realistic TypeScript seed dataset into SQL inside a transaction. Passwords are hashed during seeding.

Key tables: `users`; user subtypes `student`, `alumni`, `faculty`; `campus_spot`; `memory_space`; `space_member`; `media_item`; media subtypes `photo`, `video`; `media_tag`; `reaction`; weak entity `comment`; `notification`; `app_session`.

- User and media subtypes must match the parent's discriminator; direct mismatched subtype inserts/updates are rejected by triggers. The API creates the parent and required subtype in one transaction. Direct SQL users must also follow that transaction convention: SQL does not enforce total participation by itself.
- Foreign keys cascade dependent rows. A deleted campus spot sets its spaces' spot reference to NULL.
- Comment allocation locks/increments a counter on the parent media row. Concurrent comments get different partial keys; deleting a comment does not recycle its number.
- An analytics view uses `COUNT(DISTINCT ...)` to prevent join fanout from inflating totals.
- Database times are UTC; the browser renders them in the laptop's local timezone.
- Files live in `server/uploads`; MySQL stores URLs and metadata, not file BLOBs. Back up both the database and the uploads folder.
