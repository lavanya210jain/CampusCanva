// Indian mobile numbers: accept formatting/+91, store ten national digits.
export const PHONE_MESSAGE =
  "Enter a 10-digit Indian mobile number starting with 6–9 (optional +91).";
export function normalizePhone(value = "") {
  const compact = String(value)
    .trim()
    .replace(/[\s()-]/g, "");
  return compact.startsWith("+91") ? compact.slice(3) : compact;
}
export function phoneIsValid(value = "") {
  const national = normalizePhone(value);
  return national === "" || /^[6-9][0-9]{9}$/.test(national);
}
