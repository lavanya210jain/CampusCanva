import { rows, transaction } from "./db.js";
// A row lock and persisted marker make notifications safe across retries/restarts.
export async function processCapsuleUnlocks() {
  return transaction(async (db) => {
    const spaces = await rows(
      "SELECT space_id,creator_id,title FROM memory_space WHERE is_time_locked=1 AND unlock_date<=UTC_TIMESTAMP() AND unlock_notified_at IS NULL FOR UPDATE",
      [],
      db,
    );
    for (const s of spaces) {
      await rows(
        `INSERT INTO notification(user_id,sender_id,type,title,message,target_url,space_id)
        SELECT user_id,?,'capsule','Time capsule unlocked',?, ?, ?
        FROM space_member WHERE space_id=?`,
        [
          s.creator_id,
          `“${s.title}” is now open. View your memories.`,
          `/spaces/${s.space_id}`,
          s.space_id,
          s.space_id,
        ],
        db,
      );
      await rows(
        "UPDATE memory_space SET unlock_notified_at=UTC_TIMESTAMP() WHERE space_id=?",
        [s.space_id],
        db,
      );
    }
    return spaces.length;
  });
}
