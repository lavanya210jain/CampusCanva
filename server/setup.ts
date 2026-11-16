import "dotenv/config";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { normalizePhone } from "../shared/phone.js";
import { readFile } from "node:fs/promises";
import { connectionOptions, database, pool } from "./db.js";
import * as seed from "../src/data/seedData.ts";

const db = await mysql.createConnection(connectionOptions);
try {
  await db.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await db.query(`USE \`${database}\``);
  const [tables]: any = await db.query("SHOW TABLES LIKE 'users'");
  if (tables.length && !process.argv.includes("--reset"))
    throw new Error(
      "Database already exists. Setup preserves it. To deliberately erase and reseed, run npm run db:reset.",
    );
  let sql = await readFile(
    new URL("../database/schema.sql", import.meta.url),
    "utf8",
  );
  sql = sql
    .replace(/^CREATE DATABASE.*;$/m, "")
    .replace(/^USE campuscanva_db;$/m, "");
  let delimiter = ";",
    statement = "";
  for (const line of sql.split("\n")) {
    if (line.trim().startsWith("--")) continue;
    const change = line.trim().match(/^DELIMITER\s+(.*)$/i);
    if (change) {
      delimiter = change[1];
      continue;
    }
    statement += line + "\n";
    if (statement.trim().endsWith(delimiter)) {
      await db.query(statement.trim().slice(0, -delimiter.length));
      statement = "";
    }
  }
  const password = await bcrypt.hash("CampusCanva123!", 12);
  const pairs: [string, any[]][] = [
    [
      "users",
      seed.SEED_USERS.map((u) => ({
        ...u,
        phone: normalizePhone(u.phone),
        password_hash: password,
      })),
    ],
    ["student", seed.SEED_STUDENTS],
    ["alumni", seed.SEED_ALUMNI],
    ["faculty", seed.SEED_FACULTY],
    ["campus_spot", seed.SEED_CAMPUS_SPOTS],
    ["memory_space", seed.SEED_MEMORY_SPACES],
    ["space_member", seed.SEED_SPACE_MEMBERS],
    ["media_item", seed.SEED_MEDIA_ITEMS],
    ["photo", seed.SEED_PHOTOS],
    ["video", seed.SEED_VIDEOS],
    ["media_tag", seed.SEED_MEDIA_TAGS],
    ["reaction", seed.SEED_REACTIONS],
    ["comment", seed.SEED_COMMENTS],
    ["notification", seed.SEED_NOTIFICATIONS],
  ];
  await db.beginTransaction();
  try {
    for (const [table, records] of pairs)
      for (const record of records) {
        // The space trigger already created these memberships.
        if (
          table === "space_member" &&
          record.role_type === "Admin" &&
          seed.SEED_MEMORY_SPACES.some(
            (s) =>
              s.space_id === record.space_id && s.creator_id === record.user_id,
          )
        )
          continue;
        const keys = Object.keys(record).filter((k) => record[k] !== undefined);
        await db.execute(
          `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
          keys.map((k) =>
            typeof record[k] === "string" &&
            /(_at|_date)$/.test(k) &&
            record[k].includes("T")
              ? new Date(record[k]).toISOString().slice(0, 19).replace("T", " ")
              : record[k],
          ),
        );
      }
    await db.commit();
  } catch (e) {
    await db.rollback();
    throw e;
  }
  console.log(
    `MySQL schema and seed data ready: ${database}. Seeded account password: CampusCanva123!`,
  );
} finally {
  await db.end();
  await pool.end();
}
