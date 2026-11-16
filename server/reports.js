import { rows } from "./db.js";
import { visibleSQL } from "./domain.js";
// Every report starts from the viewer's accessible spaces, including nested totals.
const scope = `WITH visible_spaces AS (SELECT s.* FROM memory_space s WHERE ${visibleSQL()}) `;
export const reportQueries = [
  {
    title: "Space analytics · multi-table joins and aggregation",
    sql:
      scope +
      `SELECT v.* FROM vw_space_analytics v JOIN visible_spaces s ON s.space_id=v.space_id ORDER BY v.total_media DESC,v.space_id LIMIT 30`,
  },
  {
    title: "User contributions · accessible spaces",
    sql:
      scope +
      `SELECT u.user_id,u.full_name,u.user_type,COUNT(DISTINCT s.space_id) AS spaces_created,COUNT(DISTINCT m.media_id) AS memories_uploaded FROM users u LEFT JOIN visible_spaces s ON s.creator_id=u.user_id LEFT JOIN (media_item m JOIN visible_spaces ms ON ms.space_id=m.space_id) ON m.uploader_id=u.user_id GROUP BY u.user_id,u.full_name,u.user_type ORDER BY memories_uploaded DESC,u.user_id LIMIT 20`,
  },
  {
    title: "Campus spots · LEFT JOIN includes empty locations",
    sql:
      scope +
      `SELECT cs.spot_name,COUNT(DISTINCT s.space_id) AS spaces,COUNT(DISTINCT m.media_id) AS memories FROM campus_spot cs LEFT JOIN visible_spaces s ON s.spot_id=cs.spot_id LEFT JOIN media_item m ON m.space_id=s.space_id GROUP BY cs.spot_id,cs.spot_name ORDER BY memories DESC`,
  },
  {
    title: "Contributors with above-average uploads · HAVING and subquery",
    sql:
      scope +
      `SELECT u.user_id,u.full_name,COUNT(m.media_id) AS uploads FROM users u LEFT JOIN (media_item m JOIN visible_spaces s ON s.space_id=m.space_id) ON m.uploader_id=u.user_id GROUP BY u.user_id,u.full_name HAVING COUNT(m.media_id) > (SELECT AVG(uploads) FROM (SELECT u2.user_id,COUNT(m2.media_id) AS uploads FROM users u2 LEFT JOIN (media_item m2 JOIN visible_spaces s2 ON s2.space_id=m2.space_id) ON m2.uploader_id=u2.user_id GROUP BY u2.user_id) user_uploads) ORDER BY uploads DESC`,
  },
];
export async function reports(userId) {
  return Promise.all(
    reportQueries.map(async (r) => ({
      ...r,
      rows: await rows(r.sql, [userId]),
    })),
  );
}
