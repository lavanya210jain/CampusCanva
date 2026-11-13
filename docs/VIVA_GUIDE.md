# CampusCanva DBMS presentation guide

## Suggested 10-minute demonstration

1. Start MySQL and `npm run dev`. Show the green MySQL status on the login page. Sign in as Kavya (password in README).
2. Open **Database Lab**. Expand executed SQL and explain why `LEFT JOIN` retains locations with no memories. Explain why DISTINCT is necessary when joining both members and media.
3. Create a new space. In Workbench run `SELECT * FROM memory_space ORDER BY space_id DESC;`, then `SELECT * FROM space_member WHERE space_id = <new_id>;`. The creator's Admin row was inserted by a database trigger.
4. Upload a real photo from the laptop. Show `media_item`, `photo`, and `media_tag`. The API performs all inserts in one transaction; an invalid tagged user causes rollback.
5. In Members, add Faculty as Viewer. Switch to Faculty and show that upload is unavailable and the server rejects unauthorized writes. Switch back to Student and change Faculty to Contributor; demonstrate upload.
6. Comment on a memory. Show the composite key `(media_id, comment_no)` and explain the exclusive lock/counter on `media_item`. Deleting a comment does not reuse its number. `tests/integration/database.test.js` includes 12 concurrent comment submissions.
7. Create a capsule set a minute into the future and upload a file. Its media is absent from Explore and inaccessible by direct file/interaction routes until the server's UTC time reaches the unlock date. Refresh after unlock.
8. React/tag/comment as a different user and show real rows in `notification`. Open the recipient's Notifications page.
9. Delete the demonstration space. Show zero dependent media, subtype, membership, tag, reaction and comment rows. Explain `ON DELETE CASCADE`.
10. Run a view, subquery and EXPLAIN from `database/demo_queries.sql`. Finish by showing the automated integration results.

Use a newly created space for deletion; keep original seed data intact. SQL examples use placeholders in this guide; replace them with actual numeric IDs in Workbench.

## ER mapping and cardinalities

| Relationship | Relational mapping |
| --- | --- |
| User creates spaces, 1:N | `memory_space.creator_id` FK |
| Campus spot associated with spaces, 1:N, optional on space | nullable `memory_space.spot_id` FK, SET NULL on spot deletion |
| Users join spaces, M:N | `space_member(space_id,user_id)` composite PK; role belongs to the relationship |
| Space contains media, 1:N | `media_item.space_id` FK |
| User uploads media, 1:N | `media_item.uploader_id` FK |
| Users tagged in media, M:N | `media_tag`, unique `(media_id,tagged_user_id)` |
| Users react to media, M:N with reaction type | `reaction`, unique `(media_id,user_id,reaction_type)` |
| Media owns comments, 1:N identifying relationship | weak entity `comment`, PK `(media_id,comment_no)` |
| User ISA Student/Faculty/Alumni | table-per-subclass: subtype PK is also FK to users |
| Media ISA Photo/Video | table-per-subclass: subtype PK is also FK to media_item |

## Functional dependencies and normalization assumptions

Normalization is evaluated against the application's business rules, not inferred merely because foreign keys exist.

| Relation | Candidate keys / determinant | Dependent attributes |
| --- | --- | --- |
| users | user_id; email | name, phone, user_type, password_hash, avatar, bio, joined_at |
| student | user_id; roll_number | department, batch_year |
| faculty | user_id; employee_no | department, designation |
| alumni | user_id | graduation_year, current_company |
| campus_spot | spot_id; spot_name | description, cover_url |
| memory_space | space_id | creator_id, spot_id, title, description, type, cover, lock date, timestamps |
| space_member | (space_id,user_id) | role_type, joined_at |
| media_item | media_id | space_id, uploader_id, URL, type, caption, uploaded_at, next_comment_no |
| photo / video | media_id | dimensions / duration |
| media_tag | tag_id; (media_id,tagged_user_id) | tagged_at |
| reaction | reaction_id; (media_id,user_id,reaction_type) | created_at |
| comment | (media_id,comment_no) | user_id, text, created_at |
| notification | notification_id | recipient, sender, event type, title, message, target, read state, timestamp |
| app_session | token_hash | user_id, expires_at |

Assume there are no additional dependencies such as `department → designation`, no uniqueness of media URLs, and no rule that a user can choose only one reaction type. Under these assumptions, each nontrivial determinant listed is a candidate key, supporting BCNF for these relations. Dimensions and memberships are atomic; captions are single text values rather than structured lists. `next_comment_no` is internal allocation state, updated transactionally, not a user-facing aggregate.

## Integrity and transaction boundaries

- **Entity integrity:** primary keys are unique and non-null.
- **Referential integrity:** foreign keys prevent orphan rows, and cascades remove dependents.
- **Domain integrity:** enums, positive dimension checks, nonnegative duration, required capsule date, unique email/roll number/employee number.
- **Specialization:** subtype INSERT/UPDATE triggers reject discriminator mismatches. The API enforces exactly one required subtype and inserts it transactionally. Direct SQL does not independently enforce total participation or prevent manual subtype deletion; explain that distinction.
- **Registration:** BEGIN → users insert → subtype insert → COMMIT; duplicate roll/employee number rolls back both.
- **Media creation:** BEGIN → media insert → photo/video insert → tags and notifications → COMMIT. Files are written to disk first and removed if SQL insertion fails. SQL and disk are not a distributed transaction; a process crash can leave an unreferenced file.
- **Comment creation:** lock the parent media row, insert comment, trigger increments the parent's counter, insert notification, commit. MySQL serializes concurrent writers for the same media item while allowing other media to proceed.
- **Membership changes:** lock the parent space row, check acting Admin and creator/last-Admin rules, then change membership and commit.
- **Reaction toggle:** lock parent media, check/remove or insert the unique reaction and notification, commit.

Do not describe the frontend-only practice mode as an RDBMS. Only the default MySQL mode executes these SQL operations.

## Index explanation

`idx_media_space_date(space_id,uploaded_at)` supports selecting a space's media in timestamp order. `idx_member_user(user_id,space_id)` supports My Spaces, since the membership PK starts with space_id. `idx_notification_inbox(user_id,is_read,created_at)` supports recipient/read-state filtering. Existing PK, UNIQUE and FK indexes also matter. Explain EXPLAIN's `key`, `rows` and `Extra`; tiny seed tables may be scanned because that is cheaper than using an index.

## Limits to explain honestly

This is a campus-shared localhost project. Privacy/invitation workflows, pagination at large scale, automatic capsule reminder notifications, incremental migrations and distributed file/SQL atomicity are not implemented. Passwords and access rules are enforced on the API; the evaluator login shortcut is an explicitly enabled local feature. Original seed media require internet; locally uploaded files do not.
