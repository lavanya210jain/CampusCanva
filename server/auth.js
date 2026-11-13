import { randomBytes, createHash } from "node:crypto";
import { rows } from "./db.js";
export const sessionCookie = "campuscanva_session";
const hash = (token) => createHash("sha256").update(token).digest("hex");
export async function createSession(res, userId) {
  const token = randomBytes(32).toString("hex");
  await rows(
    "INSERT INTO app_session(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 DAY))",
    [hash(token), userId],
  );
  res.cookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 86400000,
    path: "/",
  });
}
export async function removeSession(req, res) {
  const token = req.cookies[sessionCookie];
  if (token)
    await rows("DELETE FROM app_session WHERE token_hash=?", [hash(token)]);
  res.clearCookie(sessionCookie, { path: "/" });
}
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies[sessionCookie];
    if (!token) return res.status(401).json({ message: "Please sign in" });
    const sessions = await rows(
      "SELECT user_id FROM app_session WHERE token_hash=? AND expires_at>UTC_TIMESTAMP()",
      [hash(token)],
    );
    if (!sessions.length)
      return res
        .status(401)
        .json({ message: "Session expired. Please sign in again" });
    req.userId = sessions[0].user_id;
    next();
  } catch (e) {
    next(e);
  }
}
