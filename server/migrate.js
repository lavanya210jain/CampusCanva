import { pool, rows } from "./db.js";
import { normalizePhone, phoneIsValid } from "../shared/phone.js";

// Idempotent, additive upgrade: never drops tables or resets user memories.
export async function migrate() {
  const db = await pool.getConnection();
  try {
    const [[lock]] = await db.query(
      "SELECT GET_LOCK('campuscanva_upgrade', 20) AS acquired",
    );
    if (!lock.acquired)
      throw new Error("Another database upgrade is running. Retry shortly.");
    const column = async (table, name, definition) => {
      const found = await rows(
        "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",
        [table, name],
        db,
      );
      if (!found.length)
        await db.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    };
    await column(
      "memory_space",
      "visibility",
      "ENUM('Public','Private') NOT NULL DEFAULT 'Public'",
    );
    await column("memory_space", "unlock_notified_at", "DATETIME NULL");
    await column("notification", "space_id", "INT NULL");
    const [constraints] = await db.query(
      "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='notification' AND CONSTRAINT_NAME='fk_notification_space'",
    );
    if (!constraints.length)
      await db.query(
        "ALTER TABLE notification ADD CONSTRAINT fk_notification_space FOREIGN KEY(space_id) REFERENCES memory_space(space_id) ON DELETE CASCADE",
      );
    // Link existing notification targets so deletion/access changes are handled consistently.
    await db.query(
      "UPDATE notification n JOIN memory_space s ON n.target_url=CONCAT('/spaces/',s.space_id) SET n.space_id=s.space_id WHERE n.space_id IS NULL",
    );
    const users = await rows("SELECT user_id,phone FROM users", [], db);
    const invalid = users.filter((u) => u.phone && !phoneIsValid(u.phone));
    if (invalid.length)
      throw new Error(
        `Invalid existing mobile numbers for user IDs ${invalid.map((u) => u.user_id).join(", ")}. Correct or clear those phone fields in MySQL, then rerun db:upgrade. Memories are preserved.`,
      );
    for (const user of users)
      if (user.phone)
        await rows(
          "UPDATE users SET phone=? WHERE user_id=?",
          [normalizePhone(user.phone), user.user_id],
          db,
        );
    const check = await rows(
      "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='users' AND CONSTRAINT_NAME='chk_user_phone'",
      [],
      db,
    );
    if (!check.length)
      await db.query(
        "ALTER TABLE users ADD CONSTRAINT chk_user_phone CHECK (phone IS NULL OR phone='' OR phone REGEXP '^[6-9][0-9]{9}$')",
      );
    // Rename only original untouched demo identities; preserve customized accounts.
    for (const [id, oldName, newName] of [
      [1, "Kavya Gupta", "Demo Student"],
      [5, "Prof. Vivek Mehta", "Demo Faculty"],
      [7, "Aman Verma", "Demo Alumni"],
    ]) {
      await rows(
        "UPDATE users SET full_name=? WHERE user_id=? AND full_name=?",
        [newName, id, oldName],
        db,
      );
    }
    for (const [id, oldEmail, newEmail, name] of [
      [
        1,
        "kavya.cse@nsut.ac.in",
        "student.demo@campuscanva.local",
        "Demo Student",
      ],
      [
        5,
        "vivek.mehta@nsut.ac.in",
        "faculty.demo@campuscanva.local",
        "Demo Faculty",
      ],
      [
        7,
        "aman.alumni@nsut.ac.in",
        "alumni.demo@campuscanva.local",
        "Demo Alumni",
      ],
    ]) {
      await rows(
        "UPDATE users SET email=? WHERE user_id=? AND email=? AND full_name=?",
        [newEmail, id, oldEmail, name],
        db,
      );
    }
  } finally {
    await db
      .query("SELECT RELEASE_LOCK('campuscanva_upgrade')")
      .catch(() => {});
    db.release();
  }
}
if (
  process.argv[1]?.endsWith("/migrate.js") ||
  process.argv[1]?.endsWith("\\migrate.js")
) {
  try {
    await migrate();
    console.log(
      "Database upgraded. Existing spaces, memberships and uploads were preserved.",
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
