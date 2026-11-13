import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
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
  process.env.DEMO_LOGIN = "true";
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}/api`;
  await login(student, "kavya.cse@nsut.ac.in");
  await login(faculty, "vivek.mehta@nsut.ac.in");
  await login(alumni, "aman.alumni@nsut.ac.in");
});
after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test("password verification, session identity and password redaction", async () => {
  const r = await call({}, "/auth/login", "POST", {
    email: "kavya.cse@nsut.ac.in",
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
  await login(logoutClient, "kavya.cse@nsut.ac.in");
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
      "INSERT INTO users(full_name,email,user_type,password_hash) VALUES('Duplicate','kavya.cse@nsut.ac.in','STUDENT','x')",
    ),
    (e) => e.code === "ER_DUP_ENTRY",
  );
});
