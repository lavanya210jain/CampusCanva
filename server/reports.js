import { rows } from "./db.js";
// A fixed query catalogue: the browser cannot submit arbitrary SQL.
export const reportQueries = [
  {
    title: "Space analytics · multi-table joins and aggregation",
    sql: "SELECT * FROM vw_space_analytics ORDER BY total_media DESC, space_id LIMIT 30",
  },
  {
    title: "User contributions · SQL view",
    sql: "SELECT * FROM vw_user_contributions ORDER BY memories_uploaded DESC, user_id LIMIT 20",
  },
  {
    title: "Campus spots · LEFT JOIN includes empty locations",
    sql: `SELECT cs.spot_name, COUNT(DISTINCT s.space_id) AS spaces, COUNT(DISTINCT m.media_id) AS memories
FROM campus_spot cs
LEFT JOIN memory_space s ON s.spot_id=cs.spot_id
LEFT JOIN media_item m ON m.space_id=s.space_id
GROUP BY cs.spot_id, cs.spot_name
ORDER BY memories DESC`,
  },
  {
    title: "Contributors with above-average uploads · HAVING and subquery",
    sql: `SELECT u.user_id, u.full_name, COUNT(m.media_id) AS uploads
FROM users u LEFT JOIN media_item m ON m.uploader_id=u.user_id
GROUP BY u.user_id, u.full_name
HAVING COUNT(m.media_id) > (
  SELECT AVG(uploads) FROM (
    SELECT u2.user_id, COUNT(m2.media_id) AS uploads
    FROM users u2 LEFT JOIN media_item m2 ON m2.uploader_id=u2.user_id
    GROUP BY u2.user_id
  ) AS user_uploads
)
ORDER BY uploads DESC`,
  },
];
export async function reports() {
  return Promise.all(
    reportQueries.map(async (r) => ({ ...r, rows: await rows(r.sql) })),
  );
}
