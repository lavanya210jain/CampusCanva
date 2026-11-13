import { z } from "zod";
export const id = z.coerce.number().int().positive();
const text = (max) => z.string().trim().min(1).max(max);
const url = z
  .string()
  .max(2048)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Use an http(s) URL");
export const profile = z.object({
  full_name: text(100),
  bio: z.string().trim().max(2000).optional(),
  phone: z.string().trim().max(20).optional(),
  avatar_url: url.optional(),
});
export const registration = profile
  .extend({
    email: z
      .string()
      .trim()
      .email()
      .max(255)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(8).max(128),
    user_type: z.enum(["STUDENT", "ALUMNI", "FACULTY"]),
    student: z
      .object({
        roll_number: text(30),
        department: text(100),
        batch_year: z.coerce.number().int().min(2000).max(2100),
      })
      .optional(),
    faculty: z
      .object({
        employee_no: text(30),
        department: text(100),
        designation: text(100),
      })
      .optional(),
    alumni: z
      .object({
        graduation_year: z.coerce.number().int().min(1950).max(2100),
        current_company: text(150),
      })
      .optional(),
  })
  .superRefine((v, ctx) => {
    const key = v.user_type.toLowerCase();
    if (
      !v[key] ||
      ["student", "faculty", "alumni"].some((k) => k !== key && v[k])
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Supply exactly the subtype matching user_type",
      });
    }
  });
export const space = z
  .object({
    title: text(150),
    description: z.string().trim().max(5000).default(""),
    space_type: z.enum(["Event", "Batch", "Club", "Trip", "General"]),
    spot_id: id.nullable().default(null),
    cover_url: url.default(""),
    is_time_locked: z.boolean().default(false),
    unlock_date: z.string().datetime({ offset: true }).nullable().default(null),
  })
  .refine(
    (v) => !v.is_time_locked || !!v.unlock_date,
    "A capsule needs an unlock date",
  );
export const media = z.object({
  media_url: url.refine((v) => !!v, "Media URL required"),
  media_type: z.enum(["PHOTO", "VIDEO"]),
  caption: z.string().trim().max(3000).default(""),
  tagged_user_ids: z.array(id).max(50).default([]),
  photo_meta: z
    .object({ width: id.optional(), height: id.optional() })
    .optional(),
  video_meta: z
    .object({
      duration_seconds: z.number().nonnegative().max(86400).optional(),
    })
    .optional(),
});
export const comment = z.object({ text: text(3000) });
export const reaction = z.object({
  type: z.enum(["Like", "Heart", "Nostalgic", "Laugh"]),
});
export const member = z.object({
  user_id: id,
  role: z.enum(["Admin", "Contributor", "Viewer"]),
});
export function sqlDate(value) {
  return value
    ? new Date(value).toISOString().slice(0, 19).replace("T", " ")
    : null;
}
