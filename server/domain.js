import { rows, pool } from "./db.js";
export function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
export const publicUserColumns =
  "user_id, full_name, email, phone, user_type, avatar_url, bio, joined_at";
export async function userProfile(userId, db = pool) {
  const [user] = await rows(
    `SELECT ${publicUserColumns} FROM users WHERE user_id=?`,
    [userId],
    db,
  );
  if (!user) fail(404, "User not found");
  const subtype = user.user_type.toLowerCase(); // enum from the database, never request input
  const [details] = await rows(
    `SELECT * FROM ${subtype} WHERE user_id=?`,
    [userId],
    db,
  );
  return { ...user, [subtype]: details };
}
export const accessibleSQL =
  "(s.is_time_locked=0 OR s.unlock_date<=UTC_TIMESTAMP())";
export async function spaceAccess(spaceId, userId, roles = null, db = pool) {
  const [s] = await rows(
    "SELECT s.*, (SELECT role_type FROM space_member WHERE space_id=s.space_id AND user_id=?) AS user_role FROM memory_space s WHERE s.space_id=?",
    [userId, spaceId],
    db,
  );
  if (!s) fail(404, "Space not found");
  if (roles && !roles.includes(s.user_role))
    fail(403, "Your space role does not allow this action");
  return s;
}
export async function mediaAccess(mediaId, userId, db = pool) {
  const [m] = await rows(
    `SELECT m.*,s.creator_id FROM media_item m JOIN memory_space s ON s.space_id=m.space_id WHERE m.media_id=? AND ${accessibleSQL}`,
    [mediaId],
    db,
  );
  if (!m) fail(404, "Memory not found or capsule is still locked");
  return m;
}
export async function notify(
  db,
  userId,
  senderId,
  type,
  title,
  message,
  targetUrl,
) {
  if (userId === senderId) return;
  await rows(
    "INSERT INTO notification(user_id,sender_id,type,title,message,target_url) VALUES(?,?,?,?,?,?)",
    [userId, senderId, type, title, message, targetUrl],
    db,
  );
}
export async function insertMedia(db, spaceId, userId, data) {
  await spaceAccess(spaceId, userId, ["Admin", "Contributor"], db);
  const result = await rows(
    "INSERT INTO media_item(space_id,uploader_id,media_url,media_type,caption) VALUES(?,?,?,?,?)",
    [spaceId, userId, data.media_url, data.media_type, data.caption],
    db,
  );
  const mediaId = result.insertId;
  if (data.media_type === "PHOTO")
    await rows(
      "INSERT INTO photo(media_id,width,height) VALUES(?,?,?)",
      [
        mediaId,
        data.photo_meta?.width || null,
        data.photo_meta?.height || null,
      ],
      db,
    );
  else
    await rows(
      "INSERT INTO video(media_id,duration_seconds) VALUES(?,?)",
      [mediaId, data.video_meta?.duration_seconds ?? null],
      db,
    );
  for (const uid of new Set(data.tagged_user_ids)) {
    await rows(
      "INSERT INTO media_tag(media_id,tagged_user_id) VALUES(?,?)",
      [mediaId, uid],
      db,
    );
    await notify(
      db,
      uid,
      userId,
      "tag",
      "You were tagged",
      "You were tagged in a campus memory.",
      `/spaces/${spaceId}`,
    );
  }
  return (
    await rows("SELECT * FROM media_item WHERE media_id=?", [mediaId], db)
  )[0];
}
