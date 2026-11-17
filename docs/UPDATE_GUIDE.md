# Updating your existing laptop project safely

This update adds public/private spaces, automatic capsule-unlock notifications, local profile photo uploads, generic demo identities and mobile-number validation.

## If you previously downloaded a ZIP (Windows)

1. Stop the old website with **Ctrl+C** in its PowerShell window.
2. Keep your old project folder as a backup.
3. Download the latest ZIP from your private repository: **Code → Download ZIP**. Extract it into a separate new folder.
4. Copy your existing **`.env` file** from the old project into the new project. This keeps the same MySQL credentials and database name.
5. Copy the old **`server/uploads` folder** into the new project's `server` folder, keeping its name `uploads`. It includes uploaded memories and any local avatars. If `UPLOAD_DIR` in your `.env` is a custom absolute folder, preserve that folder too.
6. Open PowerShell in the new folder containing `package.json` and run:

   ```powershell
   npm.cmd ci
   npm.cmd run db:upgrade
   npm.cmd run dev
   ```

7. Open http://localhost:5173 and reload the browser. Sign out/in if your old demo name is still cached.

**Use `db:upgrade` for this update. Do not use `db:reset`: reset erases the current application records.** Existing database records stay in MySQL; copying the uploads folder preserves their files. Existing spaces initially remain Public.

The API also runs the idempotent upgrade on startup. Fresh installations can still use `db:setup` once.

## Demo identities

Only unchanged original sample identities are renamed; personalized account names are preserved. The three sample accounts are now:

| Account | Email | Password |
| --- | --- | --- |
| Demo Student | student.demo@campuscanva.local | CampusCanva123! |
| Demo Faculty | faculty.demo@campuscanva.local | CampusCanva123! |
| Demo Alumni | alumni.demo@campuscanva.local | CampusCanva123! |

Quick evaluator buttons and account switching have been removed; all accounts sign in with email and password. An old `DEMO_LOGIN` setting has no effect. Custom accounts keep their own credentials. The registration form uses generic examples and correctly shows the eight-character password minimum.

## Public/private spaces

- Choose visibility in **New Space → Who can see this space?**
- An Admin can change an existing space under **About Space & Spot → Edit space details → Who can see this space? → Save changes**.
- Public means visible to all signed-in campus users; it does not publish a site on the internet.
- Private means only space members can access it. The creator is automatically an Admin. Add collaborators through the Members tab.
- Viewer members can view; Contributor/Admin members can upload. Non-members cannot find a private space, join it themselves, access its memories/files, inspect its tuples or obtain its counts through reports.
- Private-space tagging is limited to its members. Making a space Public intentionally reveals it to signed-in users. Content that was already viewed while Public cannot be recalled from another person's device.
- Existing space memberships are preserved. Removing a member revokes future private-space access. Reload an already open feed to update its displayed space list.
- The protection is implemented on the API, not only by hiding cards. Direct SQL access by a MySQL administrator remains privileged.

## Capsule unlock alerts

The running API checks for due capsules every five seconds; notification retrieval also catches up due capsules. Each member, including the creator, receives one notification for that capsule. Non-member public viewers do not receive these member alerts. The unread bell and Notifications page poll every five seconds, so alerts appear without a manual browser refresh.

A database timestamp marks a capsule as notified inside a transaction with a row lock, preventing duplicates during concurrent checks or restarts. If the PC/API is off at the unlock time, alerts are created when the API next runs. Old, already unlocked capsules may generate their first alert once after upgrading. Notifications are in-app, not emails or operating-system push notifications.

## Local profile pictures

Open **My Profile → Edit Profile → choose a profile photo from this laptop**. Choose JPEG, PNG, WebP or GIF up to **5 MB**, then **Save Changes**. A selected file takes priority over the web URL. Image signatures are checked by the API. Files are stored under `server/uploads/avatars` and the database stores the image URL.

## Phone fields

Phone numbers are optional. When provided they must be **10-digit Indian mobile numbers starting with 6, 7, 8 or 9**. An optional `+91` prefix and formatting spaces, hyphens or parentheses are accepted, then normalized to ten digits.

The rule applies in registration and profile editing, is checked again on the API, and is backed by a MySQL CHECK constraint. Existing valid formatted numbers are normalized during upgrade. If an old invalid number exists, the upgrade identifies its user ID and asks you to correct or clear that field in MySQL before retrying; it does not silently delete your data.

## Database changes to explain in your viva

- `memory_space.visibility`: Public/Private enum, default Public.
- `memory_space.unlock_notified_at`: persisted notification checkpoint.
- `notification.space_id`: foreign key to its related space, cascades on space deletion; used for visibility filtering.
- `users.chk_user_phone`: CHECK for optional ten-digit mobile numbers.
- Privacy is enforced with membership-aware SELECT predicates plus role checks. Reports use a scoped CTE so private content does not enter nested totals.
- Capsule notification inserts and the checkpoint update commit together under a row lock.

The MySQL mode provides these features. The optional browser-storage practice mode is for UI rehearsal; private-space creation and local avatar uploads require MySQL.

## Forest / cream visual update and dark mode

The landing page now has illustrated, clickable previews for spaces, capsules and sharing controls. These are labeled examples; their buttons lead to the real application or registration. The UI uses forest green, warm cream and terracotta throughout.

Use the moon/sun button in the welcome header, authentication pages or app navbar to switch themes. The initial theme follows the device's colour preference until you choose one. A choice is saved in the browser and survives navigation and reloads. This changes appearance only; it does not change data mode, permissions or database content. Reduced-motion preferences disable decorative motion.

Apply this update using the ZIP/copy steps above, preserving `.env` and `server/uploads`. If the earlier database update is already installed, this visual update needs no additional database migration.

## SQL Inspector visibility and empty-photo defaults

SQL Inspector now starts off. Database Lab appears in the desktop/mobile navigation only after you enable the SQL Inspector button. Turning it off redirects an open Lab page to Dashboard, hides the link and closes the inspector drawer. Directly opening `/database-lab` while it is off also returns to Dashboard. This is a display mode, not an additional user role or restriction on privileged direct MySQL access.

New accounts have no assigned profile photograph. A neutral empty-avatar symbol is used until a user supplies a photo. New spaces start with no cover URL and display a solid forest-green cover matching the light/dark theme. Optional custom cover URLs still work. Missing or broken images never trigger a random stock-photo fallback.

The upgrade clears recognized automatically assigned stock profile images and old default covers once. It preserves uploaded files and custom URLs. The `app_migration` bookkeeping table records the cleanup so subsequent restarts do not repeat it or undo later image choices. There are now 16 tables in the schema: the existing 15 plus this small bookkeeping table.

After updating project files and preserving `.env` and `server/uploads`, run:

```powershell
npm.cmd run db:upgrade
npm.cmd run dev
```

The API also applies the upgrade automatically on startup. Do not run `db:reset`; it would replace your saved data with the original sample dataset.
