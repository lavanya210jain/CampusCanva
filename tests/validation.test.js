import test from "node:test";
import assert from "node:assert/strict";
import { registration, space, media } from "../server/validation.js";
const student = {
  full_name: "Test Student",
  email: "STUDENT@example.edu",
  password: "LongPassword123!",
  user_type: "STUDENT",
  student: { roll_number: "A100", department: "CSE", batch_year: 2025 },
};
test("registration normalizes email and requires exactly the matching subtype", () => {
  assert.equal(registration.parse(student).email, "student@example.edu");
  assert.equal(
    registration.safeParse({ ...student, student: undefined }).success,
    false,
  );
  assert.equal(
    registration.safeParse({
      ...student,
      alumni: { graduation_year: 2024, current_company: "Example" },
    }).success,
    false,
  );
  assert.equal(
    registration.safeParse({ ...student, password: "short" }).success,
    false,
  );
});
test("capsules require a real, unambiguous unlock timestamp", () => {
  const data = {
    title: "Batch memories",
    space_type: "Batch",
    is_time_locked: true,
  };
  assert.equal(space.safeParse(data).success, false);
  assert.equal(
    space.safeParse({ ...data, unlock_date: "not-a-date" }).success,
    false,
  );
  assert.equal(
    space.safeParse({ ...data, unlock_date: "2030-01-01T12:00:00Z" }).success,
    true,
  );
});
test("URL imports reject executable schemes and invalid foreign keys", () => {
  assert.equal(
    media.safeParse({ media_url: "javascript:alert(1)", media_type: "PHOTO" })
      .success,
    false,
  );
  assert.equal(
    media.safeParse({
      media_url: "https://example.edu/image.jpg",
      media_type: "PHOTO",
      tagged_user_ids: [-1],
    }).success,
    false,
  );
});
