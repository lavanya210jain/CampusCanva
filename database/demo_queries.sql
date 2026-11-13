-- Run in MySQL Workbench after npm run db:setup.
USE campuscanva_db;

-- 1. ISA specialization: shared user + student attributes.
SELECT u.user_id,u.full_name,u.email,s.roll_number,s.department,s.batch_year
FROM users u JOIN student s ON s.user_id=u.user_id;

-- 2. Membership M:N with relationship attributes.
SELECT ms.title,u.full_name,sm.role_type,sm.joined_at
FROM space_member sm
JOIN memory_space ms ON ms.space_id=sm.space_id
JOIN users u ON u.user_id=sm.user_id
ORDER BY ms.space_id,u.full_name;

-- 3. Aggregation view; DISTINCT prevents join fanout.
SELECT * FROM vw_space_analytics ORDER BY total_media DESC;

-- 4. View for contributions.
SELECT * FROM vw_user_contributions ORDER BY memories_uploaded DESC;

-- 5. Campus spots, including those without a space.
SELECT cs.spot_name,COUNT(ms.space_id) AS space_count
FROM campus_spot cs LEFT JOIN memory_space ms ON ms.spot_id=cs.spot_id
GROUP BY cs.spot_id,cs.spot_name;

-- 6. Correlated NOT EXISTS: users who have never uploaded.
SELECT u.user_id,u.full_name FROM users u
WHERE NOT EXISTS (SELECT 1 FROM media_item m WHERE m.uploader_id=u.user_id);

-- 7. GROUP BY / HAVING: spaces with at least two contributors or Admins.
SELECT space_id,COUNT(*) AS contributors
FROM space_member WHERE role_type IN ('Admin','Contributor')
GROUP BY space_id HAVING COUNT(*) >= 2;

-- 8. Weak entity identification.
SELECT c.media_id,c.comment_no,u.full_name,c.comment_text
FROM comment c JOIN users u ON u.user_id=c.user_id
ORDER BY c.media_id,c.comment_no;

-- 9. Server-side capsule eligibility.
SELECT space_id,title,unlock_date,
  CASE WHEN is_time_locked=1 AND unlock_date>UTC_TIMESTAMP() THEN 'LOCKED' ELSE 'OPEN' END AS status
FROM memory_space;

-- 10. Schema introspection and indexes.
SHOW CREATE TABLE comment;
SHOW CREATE TABLE memory_space;
SHOW TRIGGERS;
SHOW INDEX FROM media_item;
EXPLAIN SELECT * FROM media_item WHERE space_id=1 ORDER BY uploaded_at DESC;
EXPLAIN SELECT * FROM space_member WHERE user_id=1;

-- 11. Composite unique reaction key; multiple distinct types per user are allowed.
SELECT media_id,user_id,reaction_type,COUNT(*) AS count_per_key
FROM reaction GROUP BY media_id,user_id,reaction_type;

-- 12. Persistent notifications.
SELECT notification_id,user_id,sender_id,type,title,is_read,created_at
FROM notification ORDER BY notification_id DESC LIMIT 20;
