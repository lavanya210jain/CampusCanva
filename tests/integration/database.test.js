import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { migrate } from "../../server/migrate.js";
import { processCapsuleUnlocks } from "../../server/capsules.js";
import { app } from "../../server/app.js";
import { pool, rows, database } from "../../server/db.js";

let server, base;
const student = {},
  faculty = {},
  alumni = {};
async function call(client, url, method = "GET", data) {
  const headers = {};
  if (client.cookie) headers.Cookie = client.cookie;
  if (data && !(data instanceof FormData))
    headers["Content-Type"] = "application/json";
  const response = await fetch(base + url, {
    method,
    headers,
    body:
      data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
  });
  const cookie = response.headers.getSetCookie().at(-1);
  if (cookie) client.cookie = cookie.split(";")[0];
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}
async function login(client, email) {
  const r = await call(client, "/auth/login", "POST", {
    email,
    password: "CampusCanva123!",
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
}
async function createSpace(extra = {}) {
  const r = await call(student, "/spaces", "POST", {
    title: "Integration space",
    description: "Database test fixture",
    space_type: "General",
    ...extra,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}
async function addMedia(sid, client = student, extra = {}) {
  const r = await call(client, `/spaces/${sid}/media`, "POST", {
    media_url: "https://example.edu/memory.jpg",
    media_type: "PHOTO",
    caption: "Test memory",
    ...extra,
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
}
before(async () => {
  assert.ok(
    database.endsWith("_test"),
    "Use an isolated DB_NAME ending in _test; never run integration tests on your presentation database",
  );
  await migrate();
  process.env.DEMO_LOGIN = "true";
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api`;
  await login(student, "student.demo@campuscanva.local");
  await login(faculty, "faculty.demo@campuscanva.local");
  await login(alumni, "alumni.demo@campuscanva.local");
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("password verification, session identity and password redaction", async () => {
  const r = await call({}, "/auth/login", "POST", {
    email: "student.demo@campuscanva.local",
    password: "wrong-password",
  });
  assert.equal(r.status, 401);
  assert.equal((await call({}, "/spaces")).status, 401);
  const profile = await call(student, "/auth/me");
  assert.equal(profile.body.user_id, 1);
  assert.equal("password_hash" in profile.body, false);
  const users = await call(student, "/users");
  assert.ok(users.body.every((u) => !("password_hash" in u)));
  assert.equal(
    (await call(student, "/auth/demo", "POST", { userId: 2 })).status,
    403,
  );
  const logoutClient = {};
  await login(logoutClient, "student.demo@campuscanva.local");
  await call(logoutClient, "/auth/logout", "POST");
  assert.equal((await call(logoutClient, "/auth/me")).status, 401);
});
test("user + subtype registration commits together and duplicate subtype rolls back", async () => {
  const [existing] = await rows("SELECT roll_number FROM student LIMIT 1");
  const data = {
    full_name: "Rollback student",
    email: "rollback@example.edu",
    password: "LongPassword123!",
    user_type: "STUDENT",
    student: {
      roll_number: existing.roll_number,
      department: "CSE",
      batch_year: 2025,
    },
  };
  assert.equal((await call({}, "/auth/register", "POST", data)).status, 409);
  assert.equal(
    (await rows("SELECT * FROM users WHERE email=?", [data.email])).length,
    0,
  );
  const client = {};
  data.email = `new-${Date.now()}@example.edu`;
  data.student.roll_number = `T${Date.now()}`;
  const r = await call(client, "/auth/register", "POST", data);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal((await call(client, "/auth/me")).body.user_id, r.body.user_id);
  const [stored] = await rows(
    "SELECT password_hash FROM users WHERE user_id=?",
    [r.body.user_id],
  );
  assert.ok(stored.password_hash.startsWith("$2"));
  await rows("DELETE FROM users WHERE user_id=?", [r.body.user_id]);
});
test("creator trigger, viewer restrictions, role changes and caller ID spoofing", async () => {
  const s = await createSpace();
  try {
    const [admin] = await rows(
      "SELECT * FROM space_member WHERE space_id=? AND user_id=1",
      [s.space_id],
    );
    assert.equal(admin.role_type, "Admin");
    assert.equal(
      (
        await call(student, `/spaces/${s.space_id}/members`, "POST", {
          user_id: 5,
          role: "Viewer",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await call(faculty, `/spaces/${s.space_id}/media`, "POST", {
          media_url: "https://example.edu/a.jpg",
          media_type: "PHOTO",
          uploaderId: 1,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(faculty, `/spaces/${s.space_id}/members`, "POST", {
          user_id: 5,
          role: "Admin",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(student, `/spaces/${s.space_id}/members`, "POST", {
          user_id: 1,
          role: "Viewer",
        })
      ).status,
      400,
    );
    assert.equal(
      (await call(faculty, `/spaces/${s.space_id}`, "DELETE")).status,
      403,
    );
    await call(student, `/spaces/${s.space_id}/members`, "POST", {
      user_id: 5,
      role: "Contributor",
    });
    const m = await addMedia(s.space_id, faculty);
    assert.equal(m.uploader_id, 5);
    assert.equal(
      (await call(faculty, "/users/1", "PATCH", { full_name: "Spoofed" }))
        .status,
      403,
    );
  } finally {
    await call(student, `/spaces/${s.space_id}`, "DELETE");
  }
});
test("capsule content is gated in feeds, direct lookups, comments, tags and inspector", async () => {
  const s = await createSpace({
    is_time_locked: true,
    unlock_date: new Date(Date.now() + 3600000).toISOString(),
  });
  try {
    const m = await addMedia(s.space_id);
    assert.equal(
      (await call(student, `/spaces/${s.space_id}/media`)).body.length,
      0,
    );
    assert.ok(
      !(await call(student, "/media")).body.some(
        (x) => x.media_id === m.media_id,
      ),
    );
    for (const route of [
      `/media/${m.media_id}`,
      `/media/${m.media_id}/comments`,
      `/media/${m.media_id}/tags`,
      `/inspect/media/${m.media_id}`,
    ])
      assert.equal((await call(student, route)).status, 404);
    await rows(
      "UPDATE memory_space SET unlock_date=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE space_id=?",
      [s.space_id],
    );
    assert.equal((await call(student, `/media/${m.media_id}`)).status, 200);
  } finally {
    await call(student, `/spaces/${s.space_id}`, "DELETE");
  }
});
test("weak comment keys remain unique under concurrent writes and are not reused", async () => {
  const s = await createSpace();
  try {
    const m = await addMedia(s.space_id);
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        call(faculty, `/media/${m.media_id}/comments`, "POST", {
          text: `Concurrent ${i}`,
        }),
      ),
    );
    for (const r of results)
      assert.equal(r.status, 201, JSON.stringify(r.body));
    const numbers = results.map((r) => r.body.comment_no);
    assert.equal(new Set(numbers).size, 12);
    const max = Math.max(...numbers);
    await call(faculty, `/media/${m.media_id}/comments/${max}`, "DELETE");
    const next = await call(faculty, `/media/${m.media_id}/comments`, "POST", {
      text: "After deletion",
    });
    assert.equal(next.body.comment_no, max + 1);
    assert.equal(
      (
        await call(
          alumni,
          `/media/${m.media_id}/comments/${next.body.comment_no}`,
          "DELETE",
        )
      ).status,
      403,
    );
  } finally {
    await call(student, `/spaces/${s.space_id}`, "DELETE");
  }
});
test("notifications, duplicate reactions, SQL analytics and cascading deletion", async () => {
  const s = await createSpace();
  const m = await addMedia(s.space_id, student, { tagged_user_ids: [5] });
  await call(faculty, `/media/${m.media_id}/comments`, "POST", {
    text: "A memory!",
  });
  const reaction = await call(
    faculty,
    `/media/${m.media_id}/reactions`,
    "POST",
    { type: "Heart" },
  );
  assert.equal(reaction.body.added, true);
  const removed = await call(
    faculty,
    `/media/${m.media_id}/reactions`,
    "POST",
    { type: "Heart" },
  );
  assert.equal(removed.body.added, false);
  await call(faculty, `/media/${m.media_id}/reactions`, "POST", {
    type: "Like",
  });
  const notifs = await call(faculty, "/notifications");
  assert.ok(
    notifs.body.some(
      (n) => n.type === "tag" && n.target_url === `/spaces/${s.space_id}`,
    ),
  );
  const [{ total_media, total_members }] = await rows(
    "SELECT * FROM vw_space_analytics WHERE space_id=?",
    [s.space_id],
  );
  assert.equal(total_media, 1);
  assert.equal(total_members, 1);
  await call(student, `/spaces/${s.space_id}`, "DELETE");
  for (const table of [
    "media_item",
    "photo",
    "media_tag",
    "reaction",
    "comment",
  ])
    assert.equal(
      (await rows(`SELECT * FROM ${table} WHERE media_id=?`, [m.media_id]))
        .length,
      0,
    );
  assert.equal(
    (await rows("SELECT * FROM space_member WHERE space_id=?", [s.space_id]))
      .length,
    0,
  );
});
test("real file uploads are protected, reject invalid bytes and delete with the memory", async () => {
  const s = await createSpace();
  try {
    const bad = new FormData();
    bad.append(
      "file",
      new Blob(["<script>bad</script>"], { type: "image/png" }),
      "fake.png",
    );
    assert.equal(
      (await call(student, `/spaces/${s.space_id}/upload`, "POST", bad)).status,
      400,
    );
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH0cAAAAASUVORK5CYII=",
      "base64",
    );
    const form = new FormData();
    form.append("file", new Blob([png], { type: "image/png" }), "memory.png");
    form.append("caption", "Real file");
    form.append("tags", "[5]");
    const uploaded = await call(
      student,
      `/spaces/${s.space_id}/upload`,
      "POST",
      form,
    );
    assert.equal(uploaded.status, 201, JSON.stringify(uploaded.body));
    const fileUrl = base.replace("/api", "") + uploaded.body.media_url;
    assert.equal((await fetch(fileUrl)).status, 401);
    assert.equal(
      (await fetch(fileUrl, { headers: { Cookie: student.cookie } })).status,
      200,
    );
    assert.equal(
      (await call(student, `/media/${uploaded.body.media_id}`, "DELETE"))
        .status,
      200,
    );
    assert.equal(
      (await fetch(fileUrl, { headers: { Cookie: student.cookie } })).status,
      404,
    );
  } finally {
    await call(student, `/spaces/${s.space_id}`, "DELETE");
  }
});
test("database enforces FK, subtype, unique and CHECK constraints directly", async () => {
  await assert.rejects(
    rows(
      "INSERT INTO student(user_id,roll_number,department,batch_year) VALUES(5,'BAD','CSE',2025)",
    ),
    /subtype/,
  );
  await assert.rejects(
    rows(
      "INSERT INTO space_member(space_id,user_id,role_type) VALUES(999999,1,'Viewer')",
    ),
    (e) => e.code === "ER_NO_REFERENCED_ROW_2",
  );
  await assert.rejects(
    rows(
      "INSERT INTO memory_space(creator_id,title,space_type,is_time_locked) VALUES(1,'Invalid','General',1)",
    ),
    (e) => e.code === "ER_CHECK_CONSTRAINT_VIOLATED",
  );
  await assert.rejects(
    rows(
      "INSERT INTO users(full_name,email,user_type,password_hash) VALUES('Duplicate','student.demo@campuscanva.local','STUDENT','x')",
    ),
    (e) => e.code === "ER_DUP_ENTRY",
  );
});

test("private space access covers lists, files, reports, inspector, tags and membership revocation", async () => {
  const s = await createSpace({
    title: "Private integration vault",
    visibility: "Private",
  });
  try {
    const m = await addMedia(s.space_id);
    for (const url of [
      `/spaces/${s.space_id}`,
      `/spaces/${s.space_id}/members`,
      `/spaces/${s.space_id}/media`,
      `/media/${m.media_id}`,
      `/media/${m.media_id}/comments`,
      `/media/${m.media_id}/tags`,
      `/media/${m.media_id}/reactions`,
      `/inspect/space/${s.space_id}`,
      `/inspect/media/${m.media_id}`,
      `/inspect/comment/${m.media_id}`,
    ]) {
      assert.equal((await call(faculty, url)).status, 404, url);
    }
    assert.ok(
      !(await call(faculty, "/spaces")).body.some(
        (x) => x.space_id === s.space_id,
      ),
    );
    assert.ok(
      !(await call(faculty, "/users/1/spaces")).body.some(
        (x) => x.space_id === s.space_id,
      ),
    );
    assert.ok(
      !(await call(faculty, "/media")).body.some(
        (x) => x.media_id === m.media_id,
      ),
    );
    assert.equal(
      (
        await call(faculty, `/spaces/${s.space_id}/members`, "POST", {
          user_id: 5,
          role: "Contributor",
        })
      ).status,
      404,
    );
    assert.equal(
      (await call(student, `/media/${m.media_id}/tags`, "POST", { userId: 5 }))
        .status,
      400,
    );
    const deniedTag = await call(
      student,
      `/spaces/${s.space_id}/media`,
      "POST",
      {
        media_url: "https://example.edu/a.jpg",
        media_type: "PHOTO",
        tagged_user_ids: [5],
      },
    );
    assert.equal(deniedTag.status, 400);
    const outsiderReports = await call(faculty, "/reports");
    assert.equal(
      outsiderReports.status,
      200,
      JSON.stringify(outsiderReports.body),
    );
    assert.ok(!JSON.stringify(outsiderReports.body).includes(s.title));
    const before = await call(faculty, "/stats");
    assert.equal(before.status, 200);
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH0cAAAAASUVORK5CYII=",
      "base64",
    );
    const form = new FormData();
    form.append("file", new Blob([png], { type: "image/png" }), "private.png");
    const upload = await call(
      student,
      `/spaces/${s.space_id}/upload`,
      "POST",
      form,
    );
    assert.equal(upload.status, 201, JSON.stringify(upload.body));
    const url = base.replace("/api", "") + upload.body.media_url;
    assert.equal(
      (await fetch(url, { headers: { Cookie: faculty.cookie } })).status,
      404,
    );
    await call(student, `/spaces/${s.space_id}/members`, "POST", {
      user_id: 5,
      role: "Viewer",
    });
    assert.equal((await call(faculty, `/spaces/${s.space_id}`)).status, 200);
    assert.equal(
      (await fetch(url, { headers: { Cookie: faculty.cookie } })).status,
      200,
    );
    assert.equal(
      (await call(faculty, "/stats")).body.totalSpaces,
      before.body.totalSpaces + 1,
    );
    await call(student, `/spaces/${s.space_id}/members/5`, "DELETE");
    assert.equal(
      (await fetch(url, { headers: { Cookie: faculty.cookie } })).status,
      404,
    );
    assert.ok(
      !(await call(faculty, "/notifications")).body.some(
        (n) => n.space_id === s.space_id,
      ),
    );
    assert.equal(
      (
        await call(student, `/spaces/${s.space_id}`, "PATCH", {
          visibility: "Public",
        })
      ).status,
      200,
    );
    assert.equal((await call(faculty, `/spaces/${s.space_id}`)).status, 200);
    assert.equal(
      (
        await call(faculty, `/spaces/${s.space_id}`, "PATCH", {
          visibility: "Private",
        })
      ).status,
      403,
    );
    await call(student, `/spaces/${s.space_id}`, "PATCH", {
      visibility: "Private",
    });
    assert.equal((await call(faculty, `/spaces/${s.space_id}`)).status, 404);
  } finally {
    await call(student, `/spaces/${s.space_id}`, "DELETE");
  }
});

test("capsule unlock notifications include creator/members exactly once across concurrent retries", async () => {
  const s = await createSpace({
    visibility: "Private",
    is_time_locked: true,
    unlock_date: new Date(Date.now() + 3600000).toISOString(),
  });
  try {
    await call(student, `/spaces/${s.space_id}/members`, "POST", {
      user_id: 5,
      role: "Viewer",
    });
    assert.equal(
      (
        await rows(
          "SELECT * FROM notification WHERE space_id=? AND type='capsule'",
          [s.space_id],
        )
      ).length,
      0,
    );
    await rows(
      "UPDATE memory_space SET unlock_date=DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 SECOND) WHERE space_id=?",
      [s.space_id],
    );
    await Promise.all([
      processCapsuleUnlocks(),
      processCapsuleUnlocks(),
      processCapsuleUnlocks(),
    ]);
    await processCapsuleUnlocks();
    const notes = await rows(
      "SELECT * FROM notification WHERE space_id=? AND type='capsule'",
      [s.space_id],
    );
    assert.deepEqual(
      notes.map((n) => n.user_id).sort((a, b) => a - b),
      [1, 5],
    );
    assert.ok(
      (await call(student, "/notifications")).body.some(
        (n) => n.type === "capsule" && n.space_id === s.space_id,
      ),
    );
    assert.ok(
      !(await call(alumni, "/notifications")).body.some(
        (n) => n.space_id === s.space_id,
      ),
    );
    await call(student, `/spaces/${s.space_id}/members/5`, "DELETE");
    assert.ok(
      !(await call(faculty, "/notifications")).body.some(
        (n) => n.space_id === s.space_id,
      ),
    );
  } finally {
    await call(student, `/spaces/${s.space_id}`, "DELETE");
  }
});

test("phone updates validate and database rejects invalid direct writes", async () => {
  const old = (await call(student, "/auth/me")).body.phone;
  try {
    assert.equal(
      (await call(student, "/users/1", "PATCH", { phone: "12345" })).status,
      400,
    );
    const good = await call(student, "/users/1", "PATCH", {
      phone: "+91 98765 43210",
    });
    assert.equal(good.status, 200);
    assert.equal(good.body.phone, "9876543210");
    await assert.rejects(
      rows("UPDATE users SET phone='abc' WHERE user_id=1"),
      (e) => e.code === "ER_CHECK_CONSTRAINT_VIOLATED",
    );
  } finally {
    await call(student, "/users/1", "PATCH", { phone: old || "" });
  }
});

test("local profile photos are validated, stored, editable and survive profile refresh", async () => {
  const old = (await call(student, "/auth/me")).body.avatar_url;
  try {
    const bad = new FormData();
    bad.append(
      "file",
      new Blob(["not an image"], { type: "image/png" }),
      "bad.png",
    );
    assert.equal(
      (await call(student, "/profile/avatar", "POST", bad)).status,
      400,
    );
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH0cAAAAASUVORK5CYII=",
      "base64",
    );
    const form = new FormData();
    form.append("file", new Blob([png], { type: "image/png" }), "profile.png");
    form.append("profile", JSON.stringify({ phone: "9876543210" }));
    const result = await call(student, "/profile/avatar", "POST", form);
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.ok(result.body.avatar_url.startsWith("/api/avatars/"));
    assert.equal(
      (await call(student, "/auth/me")).body.avatar_url,
      result.body.avatar_url,
    );
    assert.equal(
      (
        await call(student, "/users/1", "PATCH", {
          avatar_url: result.body.avatar_url,
        })
      ).status,
      200,
    );
    const url = base.replace("/api", "") + result.body.avatar_url;
    assert.equal(
      (await fetch(url, { headers: { Cookie: student.cookie } })).status,
      200,
    );
    assert.equal((await fetch(url)).status, 401);
  } finally {
    await call(student, "/users/1", "PATCH", { avatar_url: old || "" });
  }
});

test("repeated database upgrades preserve existing spaces, memberships and media", async () => {
  const s = await createSpace({ visibility: "Private" });
  try {
    const m = await addMedia(s.space_id);
    await migrate();
    await migrate();
    const current = await call(student, `/spaces/${s.space_id}`);
    assert.equal(current.status, 200);
    assert.equal(current.body.visibility, "Private");
    assert.equal((await call(student, `/media/${m.media_id}`)).status, 200);
    assert.equal(
      (
        await rows(
          "SELECT role_type FROM space_member WHERE space_id=? AND user_id=1",
          [s.space_id],
        )
      )[0].role_type,
      "Admin",
    );
  } finally {
    await call(student, `/spaces/${s.space_id}`, "DELETE");
  }
});
