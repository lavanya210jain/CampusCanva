import express from "express";
import { processCapsuleUnlocks } from "./capsules.js";
import { reports } from "./reports.js";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { ZodError } from "zod";
import { rows, transaction } from "./db.js";
import { createSession, removeSession, requireAuth } from "./auth.js";
import {
  publicUserColumns,
  userProfile,
  spaceAccess,
  mediaAccess,
  accessibleSQL,
  visibleSQL,
  notify,
  insertMedia,
  fail,
} from "./domain.js";
import * as v from "./validation.js";

export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  // All UI requests use the Vite same-origin proxy. Reject cross-origin mutations.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("origin")) {
    const allowed = (
      process.env.APP_ORIGINS ||
      "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000,http://127.0.0.1:5000"
    ).split(",");
    if (!allowed.includes(req.get("origin")))
      return res.status(403).json({ message: "Origin not allowed" });
  }
  next();
});
app.get("/api/health", async (req, res) => {
  try {
    await rows("SELECT 1");
    res.json({
      status: "ok",
      database: "mysql",
    });
  } catch {
    res.status(503).json({
      message: "MySQL is unavailable. Check .env and run npm run db:setup.",
    });
  }
});
app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const password = String(req.body.password || "");
  if (password.length > 128) fail(400, "Password too long");
  const [user] = await rows(
    "SELECT user_id,password_hash FROM users WHERE email=?",
    [email],
  );
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    fail(401, "Invalid email or password");
  await removeSession(req, res);
  await createSession(res, user.user_id);
  res.json(await userProfile(user.user_id));
});
app.post("/api/auth/register", async (req, res) => {
  const data = v.registration.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await transaction(async (db) => {
    const result = await rows(
      "INSERT INTO users(full_name,email,phone,user_type,password_hash,avatar_url,bio) VALUES(?,?,?,?,?,?,?)",
      [
        data.full_name,
        data.email,
        data.phone || null,
        data.user_type,
        passwordHash,
        data.avatar_url || "",
        data.bio || "",
      ],
      db,
    );
    const uid = result.insertId;
    if (data.student)
      await rows(
        "INSERT INTO student(user_id,roll_number,department,batch_year) VALUES(?,?,?,?)",
        [
          uid,
          data.student.roll_number,
          data.student.department,
          data.student.batch_year,
        ],
        db,
      );
    if (data.alumni)
      await rows(
        "INSERT INTO alumni(user_id,graduation_year,current_company) VALUES(?,?,?)",
        [uid, data.alumni.graduation_year, data.alumni.current_company],
        db,
      );
    if (data.faculty)
      await rows(
        "INSERT INTO faculty(user_id,employee_no,department,designation) VALUES(?,?,?,?)",
        [
          uid,
          data.faculty.employee_no,
          data.faculty.department,
          data.faculty.designation,
        ],
        db,
      );
    return userProfile(uid, db);
  });
  await removeSession(req, res);
  await createSession(res, user.user_id);
  res.status(201).json(user);
});
// Reject old clients explicitly, even if a previous .env still enables DEMO_LOGIN.
app.post('/api/auth/demo', (req,res)=>res.status(404).json({message:'Quick login has been removed. Sign in with email and password.'}));
app.post("/api/auth/logout", async (req, res) => {
  await removeSession(req, res);
  res.json({ ok: true });
});
app.use("/api", requireAuth);
app.get("/api/auth/me", async (req, res) =>
  res.json(await userProfile(req.userId)),
);
app.get("/api/users", async (req, res) =>
  res.json(
    await rows(`SELECT ${publicUserColumns} FROM users ORDER BY full_name`),
  ),
);
app.get("/api/users/:id", async (req, res) =>
  res.json(await userProfile(v.id.parse(req.params.id))),
);
app.patch("/api/users/:id", async (req, res) => {
  const uid = v.id.parse(req.params.id);
  if (uid !== req.userId) fail(403, "You can only edit your profile");
  const data = v.profile.partial().parse(req.body);
  const fields = Object.keys(data);
  if (!fields.length) fail(400, "No profile changes provided");
  await rows(
    `UPDATE users SET ${fields.map((k) => `${k}=?`).join(",")} WHERE user_id=?`,
    [...Object.values(data), uid],
  );
  res.json(await userProfile(uid));
});
app.get("/api/users/:id/spaces", async (req, res) =>
  res.json(
    await rows(
      `SELECT s.*,m.role_type AS user_role FROM memory_space s JOIN space_member m ON m.space_id=s.space_id WHERE m.user_id=? AND ${visibleSQL()} ORDER BY s.created_at DESC`,
      [v.id.parse(req.params.id), req.userId],
    ),
  ),
);
app.get("/api/spots", async (req, res) =>
  res.json(await rows("SELECT * FROM campus_spot ORDER BY spot_name")),
);
app.get("/api/spots/:id", async (req, res) =>
  res.json(
    (
      await rows("SELECT * FROM campus_spot WHERE spot_id=?", [
        v.id.parse(req.params.id),
      ])
    )[0] || null,
  ),
);
app.get("/api/spaces", async (req, res) =>
  res.json(
    await rows(
      `SELECT s.* FROM memory_space s WHERE ${visibleSQL()} ORDER BY created_at DESC,space_id DESC`,
      [req.userId],
    ),
  ),
);
app.get("/api/spaces/:id", async (req, res) =>
  res.json(await spaceAccess(v.id.parse(req.params.id), req.userId)),
);
app.post("/api/spaces", async (req, res) => {
  const data = v.space.parse(req.body);
  if (data.is_time_locked && new Date(data.unlock_date) <= new Date())
    fail(400, "Choose a future capsule unlock date");
  const result = await rows(
    "INSERT INTO memory_space(creator_id,spot_id,title,description,space_type,cover_url,is_time_locked,unlock_date,visibility) VALUES(?,?,?,?,?,?,?,?,?)",
    [
      req.userId,
      data.spot_id,
      data.title,
      data.description,
      data.space_type,
      data.cover_url,
      data.is_time_locked,
      v.sqlDate(data.unlock_date),
      data.visibility,
    ],
  );
  // trg_after_insert_space inserts the Admin membership in this same SQL statement.
  res.status(201).json(await spaceAccess(result.insertId, req.userId));
});
app.patch("/api/spaces/:id", async (req, res) => {
  const sid = v.id.parse(req.params.id);
  const s = await spaceAccess(sid, req.userId, ["Admin"]);
  // Time-lock policy is immutable after creation: editing it must not expose a sealed capsule.
  const data = v.space.parse({
    ...s,
    ...req.body,
    is_time_locked: !!s.is_time_locked,
    unlock_date: s.unlock_date
      ? new Date(s.unlock_date.replace(" ", "T") + "Z").toISOString()
      : null,
  });
  await rows(
    "UPDATE memory_space SET title=?,description=?,space_type=?,spot_id=?,cover_url=?,visibility=? WHERE space_id=?",
    [
      data.title,
      data.description,
      data.space_type,
      data.spot_id,
      data.cover_url,
      data.visibility,
      sid,
    ],
  );
  res.json(await spaceAccess(sid, req.userId));
});
app.delete("/api/spaces/:id", async (req, res) => {
  const sid = v.id.parse(req.params.id);
  await spaceAccess(sid, req.userId, ["Admin"]);
  const files = await rows(
    "SELECT media_url FROM media_item WHERE space_id=? AND media_url LIKE '/api/files/%'",
    [sid],
  );
  await rows("DELETE FROM memory_space WHERE space_id=?", [sid]);
  await Promise.all(
    files.map((m) =>
      unlink(path.join(uploadDir, path.basename(m.media_url))).catch(() => {}),
    ),
  );
  res.json({ ok: true });
});
app.get("/api/spaces/:id/members", async (req, res) => {
  const sid = v.id.parse(req.params.id);
  await spaceAccess(sid, req.userId);
  const members = await rows("SELECT * FROM space_member WHERE space_id=?", [
    sid,
  ]);
  res.json(
    await Promise.all(
      members.map(async (m) => ({ ...m, user: await userProfile(m.user_id) })),
    ),
  );
});
app.post("/api/spaces/:id/members", async (req, res) => {
  const sid = v.id.parse(req.params.id),
    data = v.member.parse(req.body);
  await transaction(async (db) => {
    // Serialize role changes and last-admin checks on the parent space.
    await rows(
      "SELECT space_id FROM memory_space WHERE space_id=? FOR UPDATE",
      [sid],
      db,
    );
    const s = await spaceAccess(sid, req.userId, null, db);
    const [existing] = await rows(
      "SELECT * FROM space_member WHERE space_id=? AND user_id=?",
      [sid, data.user_id],
      db,
    );
    if (
      s.user_role !== "Admin" &&
      !(data.user_id === req.userId && !existing && data.role === "Contributor")
    )
      fail(403, "Only an Admin can assign roles");
    if (data.user_id === s.creator_id && data.role !== "Admin")
      fail(400, "The creator must remain an Admin");
    if (existing?.role_type === "Admin" && data.role !== "Admin") {
      const [{ n }] = await rows(
        "SELECT COUNT(*) n FROM space_member WHERE space_id=? AND role_type='Admin'",
        [sid],
        db,
      );
      if (n <= 1) fail(400, "Keep at least one Admin");
    }
    await rows(
      "INSERT INTO space_member(space_id,user_id,role_type) VALUES(?,?,?) ON DUPLICATE KEY UPDATE role_type=VALUES(role_type)",
      [sid, data.user_id, data.role],
      db,
    );
    await notify(
      db,
      data.user_id,
      req.userId,
      "member",
      "Space membership updated",
      `Your role is now ${data.role}.`,
      `/spaces/${sid}`,
    );
  });
  res.json(
    (
      await rows("SELECT * FROM space_member WHERE space_id=? AND user_id=?", [
        sid,
        data.user_id,
      ])
    )[0],
  );
});
app.delete("/api/spaces/:id/members/:uid", async (req, res) => {
  const sid = v.id.parse(req.params.id),
    uid = v.id.parse(req.params.uid);
  await transaction(async (db) => {
    await rows(
      "SELECT space_id FROM memory_space WHERE space_id=? FOR UPDATE",
      [sid],
      db,
    );
    const s = await spaceAccess(sid, req.userId, null, db);
    if (uid !== req.userId && s.user_role !== "Admin")
      fail(403, "Only an Admin can remove other members");
    if (uid === s.creator_id) fail(400, "The creator must remain in the space");
    const [target] = await rows(
      "SELECT role_type FROM space_member WHERE space_id=? AND user_id=?",
      [sid, uid],
      db,
    );
    if (target?.role_type === "Admin") {
      const [{ n }] = await rows(
        "SELECT COUNT(*) n FROM space_member WHERE space_id=? AND role_type='Admin'",
        [sid],
        db,
      );
      if (n <= 1) fail(400, "Keep at least one Admin");
    }
    await rows(
      "DELETE FROM space_member WHERE space_id=? AND user_id=?",
      [sid, uid],
      db,
    );
  });
  res.json({ ok: true });
});
app.get("/api/media", async (req, res) =>
  res.json(
    await rows(
      `SELECT m.*, (SELECT COUNT(*) FROM reaction r WHERE r.media_id=m.media_id) reaction_count FROM media_item m JOIN memory_space s ON s.space_id=m.space_id WHERE ${accessibleSQL} AND ${visibleSQL()} ORDER BY uploaded_at DESC,media_id DESC`,
      [req.userId],
    ),
  ),
);
app.get("/api/spaces/:id/media", async (req, res) => {
  const sid = v.id.parse(req.params.id);
  await spaceAccess(sid, req.userId);
  res.json(
    await rows(
      `SELECT m.* FROM media_item m JOIN memory_space s ON s.space_id=m.space_id WHERE s.space_id=? AND ${accessibleSQL} ORDER BY uploaded_at DESC,media_id DESC`,
      [sid],
    ),
  );
});
app.get("/api/media/:id", async (req, res) =>
  res.json(await mediaAccess(v.id.parse(req.params.id), req.userId)),
);
app.post("/api/spaces/:id/media", async (req, res) => {
  const data = v.media.parse(req.body),
    sid = v.id.parse(req.params.id);
  res
    .status(201)
    .json(await transaction((db) => insertMedia(db, sid, req.userId, data)));
});
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "server/uploads");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 8 },
});
app.post(
  "/api/spaces/:id/upload",
  async (req, res, next) => {
    try {
      await spaceAccess(v.id.parse(req.params.id), req.userId, [
        "Admin",
        "Contributor",
      ]);
      next();
    } catch (e) {
      next(e);
    }
  },
  upload.single("file"),
  async (req, res) => {
    if (!req.file) fail(400, "Choose an image or video");
    const { fileTypeFromBuffer } = await import("file-type");
    const type = await fileTypeFromBuffer(req.file.buffer).catch(() => null);
    if (
      !type ||
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
      ].includes(type.mime)
    )
      fail(400, "Supported files: JPEG, PNG, WebP, GIF, MP4 and WebM");
    const name = `${randomUUID()}.${type.ext}`;
    const rawData = {
      media_url: `/api/files/${name}`,
      media_type: type.mime.startsWith("image/") ? "PHOTO" : "VIDEO",
      caption: String(req.body.caption || ""),
      tagged_user_ids: JSON.parse(req.body.tags || "[]"),
      photo_meta: JSON.parse(req.body.photo_meta || "{}"),
      video_meta: JSON.parse(req.body.video_meta || "{}"),
    };
    // Same validation as URL imports, except the URL is an internally generated protected path.
    const data = {
      ...v.media.parse({
        ...rawData,
        media_url: "https://local.invalid/upload",
      }),
      media_url: rawData.media_url,
    };
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, name), req.file.buffer);
    try {
      res
        .status(201)
        .json(
          await transaction((db) =>
            insertMedia(db, v.id.parse(req.params.id), req.userId, data),
          ),
        );
    } catch (e) {
      await unlink(path.join(uploadDir, name)).catch(() => {});
      throw e;
    }
  },
);
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1 },
});
app.post(
  "/api/profile/avatar",
  avatarUpload.single("file"),
  async (req, res) => {
    if (!req.file) fail(400, "Choose a profile photo");
    const { fileTypeFromBuffer } = await import("file-type");
    const type = await fileTypeFromBuffer(req.file.buffer).catch(() => null);
    if (
      !type ||
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
        type.mime,
      )
    )
      fail(400, "Profile photos must be JPEG, PNG, WebP or GIF");
    const name = `${randomUUID()}.${type.ext}`;
    const updates = v.profile
      .partial()
      .parse(JSON.parse(req.body.profile || "{}"));
    const [old] = await rows("SELECT avatar_url FROM users WHERE user_id=?", [
      req.userId,
    ]);
    const avatarPath = `/api/avatars/${name}`;
    await mkdir(path.join(uploadDir, "avatars"), { recursive: true });
    await writeFile(path.join(uploadDir, "avatars", name), req.file.buffer);
    try {
      const data = { ...updates, avatar_url: avatarPath };
      await rows(
        `UPDATE users SET ${Object.keys(data)
          .map((k) => `${k}=?`)
          .join(",")} WHERE user_id=?`,
        [...Object.values(data), req.userId],
      );
    } catch (error) {
      await unlink(path.join(uploadDir, "avatars", name)).catch(() => {});
      throw error;
    }
    if (old.avatar_url?.startsWith("/api/avatars/"))
      await unlink(
        path.join(uploadDir, "avatars", path.basename(old.avatar_url)),
      ).catch(() => {});
    res.json(await userProfile(req.userId));
  },
);
app.get("/api/avatars/:name", async (req, res) => {
  if (!/^[0-9a-f-]+\.(jpg|png|webp|gif)$/.test(req.params.name))
    fail(404, "Photo not found");
  if (
    !(
      await rows("SELECT 1 FROM users WHERE avatar_url=?", [
        `/api/avatars/${req.params.name}`,
      ])
    ).length
  )
    fail(404, "Photo not found");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(path.join(uploadDir, "avatars", req.params.name));
});
app.get("/api/files/:name", async (req, res) => {
  if (!/^[0-9a-f-]+\.(jpg|png|webp|gif|mp4|webm)$/.test(req.params.name))
    fail(404, "File not found");
  const [m] = await rows(
    `SELECT m.media_id FROM media_item m JOIN memory_space s ON s.space_id=m.space_id WHERE m.media_url=? AND ${accessibleSQL} AND ${visibleSQL()}`,
    [`/api/files/${req.params.name}`, req.userId],
  );
  if (!m) fail(404, "File not found or capsule is locked");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(path.join(uploadDir, req.params.name));
});
app.delete("/api/media/:id", async (req, res) => {
  const mid = v.id.parse(req.params.id),
    m = await mediaAccess(mid, req.userId);
  const s = await spaceAccess(m.space_id, req.userId);
  if (m.uploader_id !== req.userId && s.user_role !== "Admin")
    fail(403, "Only the uploader or space Admin can delete this memory");
  await rows("DELETE FROM media_item WHERE media_id=?", [mid]);
  if (m.media_url.startsWith("/api/files/"))
    await unlink(path.join(uploadDir, path.basename(m.media_url))).catch(
      () => {},
    );
  res.json({ ok: true });
});
app.get("/api/media/:id/tags", async (req, res) => {
  const mid = v.id.parse(req.params.id);
  await mediaAccess(mid, req.userId);
  const tags = await rows("SELECT * FROM media_tag WHERE media_id=?", [mid]);
  res.json(
    await Promise.all(
      tags.map(async (t) => ({
        ...t,
        user: await userProfile(t.tagged_user_id),
      })),
    ),
  );
});
app.post("/api/media/:id/tags", async (req, res) => {
  const mid = v.id.parse(req.params.id),
    uid = v.id.parse(req.body.userId),
    m = await mediaAccess(mid, req.userId);
  const taggedSpace = await spaceAccess(m.space_id, req.userId, [
    "Admin",
    "Contributor",
  ]);
  if (
    taggedSpace.visibility === "Private" &&
    !(
      await rows("SELECT 1 FROM space_member WHERE space_id=? AND user_id=?", [
        m.space_id,
        uid,
      ])
    ).length
  )
    fail(400, "Add people as members before tagging them in a private space");
  await transaction(async (db) => {
    await rows(
      "INSERT IGNORE INTO media_tag(media_id,tagged_user_id) VALUES(?,?)",
      [mid, uid],
      db,
    );
    await notify(
      db,
      uid,
      req.userId,
      "tag",
      "You were tagged",
      "You were tagged in a campus memory.",
      `/spaces/${m.space_id}`,
    );
  });
  res.json(
    (
      await rows(
        "SELECT * FROM media_tag WHERE media_id=? AND tagged_user_id=?",
        [mid, uid],
      )
    )[0],
  );
});
app.delete("/api/media/:id/tags/:uid", async (req, res) => {
  const mid = v.id.parse(req.params.id),
    uid = v.id.parse(req.params.uid),
    m = await mediaAccess(mid, req.userId);
  const s = await spaceAccess(m.space_id, req.userId);
  if (
    uid !== req.userId &&
    m.uploader_id !== req.userId &&
    s.user_role !== "Admin"
  )
    fail(403, "You can only remove your own tag");
  await rows("DELETE FROM media_tag WHERE media_id=? AND tagged_user_id=?", [
    mid,
    uid,
  ]);
  res.json({ ok: true });
});
app.get("/api/media/:id/reactions", async (req, res) => {
  const mid = v.id.parse(req.params.id);
  await mediaAccess(mid, req.userId);
  res.json(await rows("SELECT * FROM reaction WHERE media_id=?", [mid]));
});
app.post("/api/media/:id/reactions", async (req, res) => {
  const mid = v.id.parse(req.params.id),
    { type } = v.reaction.parse(req.body);
  const result = await transaction(async (db) => {
    const m = await mediaAccess(mid, req.userId, db);
    await rows(
      "SELECT media_id FROM media_item WHERE media_id=? FOR UPDATE",
      [mid],
      db,
    );
    const [existing] = await rows(
      "SELECT * FROM reaction WHERE media_id=? AND user_id=? AND reaction_type=?",
      [mid, req.userId, type],
      db,
    );
    if (existing) {
      await rows(
        "DELETE FROM reaction WHERE reaction_id=?",
        [existing.reaction_id],
        db,
      );
      return { added: false, reaction: null };
    }
    const inserted = await rows(
      "INSERT INTO reaction(media_id,user_id,reaction_type) VALUES(?,?,?)",
      [mid, req.userId, type],
      db,
    );
    await notify(
      db,
      m.uploader_id,
      req.userId,
      "reaction",
      "New reaction",
      `Someone reacted ${type} to your memory.`,
      `/spaces/${m.space_id}`,
    );
    return {
      added: true,
      reaction: (
        await rows(
          "SELECT * FROM reaction WHERE reaction_id=?",
          [inserted.insertId],
          db,
        )
      )[0],
    };
  });
  res.json(result);
});
app.get("/api/media/:id/comments", async (req, res) => {
  const mid = v.id.parse(req.params.id);
  await mediaAccess(mid, req.userId);
  const comments = await rows(
    "SELECT * FROM comment WHERE media_id=? ORDER BY comment_no",
    [mid],
  );
  res.json(
    await Promise.all(
      comments.map(async (c) => ({ ...c, user: await userProfile(c.user_id) })),
    ),
  );
});
app.post("/api/media/:id/comments", async (req, res) => {
  const mid = v.id.parse(req.params.id),
    { text } = v.comment.parse(req.body);
  res.status(201).json(
    await transaction(async (db) => {
      const m = await mediaAccess(mid, req.userId, db);
      // Serialize allocation for this weak-entity owner; the trigger increments next_comment_no.
      await rows(
        "SELECT media_id FROM media_item WHERE media_id=? FOR UPDATE",
        [mid],
        db,
      );
      await rows(
        "INSERT INTO comment(media_id,comment_no,user_id,comment_text) VALUES(?,0,?,?)",
        [mid, req.userId, text],
        db,
      );
      const [c] = await rows(
        "SELECT c.* FROM comment c JOIN media_item m ON m.media_id=c.media_id WHERE c.media_id=? AND c.comment_no=m.next_comment_no-1",
        [mid],
        db,
      );
      await notify(
        db,
        m.uploader_id,
        req.userId,
        "comment",
        "New comment",
        "Someone commented on your memory.",
        `/spaces/${m.space_id}`,
      );
      return { ...c, user: await userProfile(req.userId, db) };
    }),
  );
});
app.delete("/api/media/:id/comments/:no", async (req, res) => {
  const mid = v.id.parse(req.params.id),
    no = v.id.parse(req.params.no),
    m = await mediaAccess(mid, req.userId);
  const [c] = await rows(
    "SELECT * FROM comment WHERE media_id=? AND comment_no=?",
    [mid, no],
  );
  if (!c) fail(404, "Comment not found");
  const s = await spaceAccess(m.space_id, req.userId);
  if (c.user_id !== req.userId && s.user_role !== "Admin")
    fail(403, "Only the author or Admin can delete this comment");
  await rows("DELETE FROM comment WHERE media_id=? AND comment_no=?", [
    mid,
    no,
  ]);
  res.json({ ok: true });
});
app.get("/api/notifications", async (req, res) => {
  await processCapsuleUnlocks();
  res.json(
    await rows(
      `SELECT n.* FROM notification n LEFT JOIN memory_space s ON s.space_id=n.space_id
    WHERE n.user_id=? AND (n.space_id IS NULL OR ${visibleSQL()}) ORDER BY n.created_at DESC,n.notification_id DESC`,
      [req.userId, req.userId],
    ),
  );
});
app.patch("/api/notifications/read-all", async (req, res) => {
  await rows("UPDATE notification SET is_read=1 WHERE user_id=?", [req.userId]);
  res.json({ ok: true });
});
app.patch("/api/notifications/:id/read", async (req, res) => {
  await rows(
    "UPDATE notification SET is_read=1 WHERE notification_id=? AND user_id=?",
    [v.id.parse(req.params.id), req.userId],
  );
  res.json({ ok: true });
});
app.get("/api/reports", async (req, res) =>
  res.json(await reports(req.userId)),
);
app.get("/api/stats", async (req, res) =>
  res.json(
    (
      await rows(
        `SELECT (SELECT COUNT(*) FROM memory_space s WHERE ${visibleSQL()}) totalSpaces,(SELECT COUNT(*) FROM media_item m JOIN memory_space s ON s.space_id=m.space_id WHERE ${accessibleSQL} AND ${visibleSQL()}) totalMedia,(SELECT COUNT(*) FROM users) totalUsers,(SELECT COUNT(*) FROM memory_space s WHERE is_time_locked=1 AND unlock_date>UTC_TIMESTAMP() AND ${visibleSQL()}) upcomingCapsules`,
        [req.userId, req.userId, req.userId],
      )
    )[0],
  ),
);
app.get("/api/inspect/:type/:id", async (req, res) => {
  const identifier = v.id.parse(req.params.id),
    type = req.params.type;
  const config = {
    space: {
      table: "memory_space",
      key: "space_id",
      fk: ["creator_id → users.user_id", "spot_id → campus_spot.spot_id"],
      rel: ["1:N media_item", "M:N users through space_member"],
      sql: "SELECT * FROM vw_space_analytics WHERE space_id = ?",
    },
    media: {
      table: "media_item",
      key: "media_id",
      fk: ["space_id → memory_space.space_id", "uploader_id → users.user_id"],
      rel: ["1:N comment (weak entity)", "ISA photo / video"],
      sql: "SELECT m.*, p.width, p.height, v.duration_seconds FROM media_item m LEFT JOIN photo p ON p.media_id=m.media_id LEFT JOIN video v ON v.media_id=m.media_id WHERE m.media_id = ?",
    },
    user: {
      table: "users",
      key: "user_id",
      fk: [],
      rel: [
        "ISA student / alumni / faculty",
        "1:N memory_space",
        "M:N space_member",
      ],
      sql: `SELECT ${publicUserColumns} FROM users WHERE user_id = ?`,
    },
    comment: {
      table: "comment",
      key: "media_id",
      fk: ["media_id → media_item.media_id", "user_id → users.user_id"],
      rel: ["Weak entity: composite PK (media_id, comment_no)"],
      sql: "SELECT * FROM comment WHERE media_id = ?",
    },
  }[type];
  if (!config) fail(400, "Unknown entity");
  if (type === "space") await spaceAccess(identifier, req.userId);
  if (type === "media" || type === "comment")
    await mediaAccess(identifier, req.userId);
  const data = await rows(config.sql, [identifier]);
  res.json({
    entity: config.table.toUpperCase(),
    primaryKey:
      type === "comment"
        ? "(media_id, comment_no)"
        : `${config.key} = ${identifier}`,
    foreignKeys: config.fk,
    relationships: config.rel,
    sampleSQL: config.sql.replace("?", String(identifier)) + ";",
    attributes: type === "comment" ? { rows: data } : data[0] || {},
  });
});
app.use("/api", (req, res) =>
  res.status(404).json({ message: "API route not found" }),
);
app.use(express.static(path.resolve("dist")));
app.get("/{*path}", (req, res) =>
  res.sendFile(path.resolve("dist/index.html")),
);
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError)
    return res.status(400).json({
      message: error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    });
  if (error.code === "ER_DUP_ENTRY")
    return res.status(409).json({
      message:
        "This email, roll number, employee number or relationship already exists",
    });
  if (error.code === "ER_NO_REFERENCED_ROW_2")
    return res.status(400).json({
      message: "A referenced user, campus spot or space does not exist",
    });
  if (error.code === "LIMIT_FILE_SIZE")
    return res
      .status(400)
      .json({
        message: "File is too large (profile photos: 5 MB; memories: 20 MB)",
      });
  if (error.code?.startsWith("LIMIT_") || error instanceof SyntaxError)
    return res.status(400).json({ message: "Invalid request or upload" });
  if (!error.status || error.status >= 500)
    console.error(error.code || error.message);
  res.status(error.status || 500).json({
    message: error.status
      ? error.message
      : "Database request failed. Check the server terminal and MySQL connection.",
  });
});
