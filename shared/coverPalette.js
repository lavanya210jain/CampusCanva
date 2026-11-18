// Muted colours from the warm campus palette. A space keeps its colour across views/reloads.
export const coverPalette = [
  { name: "forest", light: "#3f6f52", dark: "#244633" },
  { name: "terracotta", light: "#b56d50", dark: "#754731" },
  { name: "ochre", light: "#a2833f", dark: "#655327" },
  { name: "sage", light: "#779779", dark: "#435d45" },
  { name: "olive", light: "#858b4d", dark: "#51562d" },
  { name: "rosewood", light: "#9d6660", dark: "#633f3d" },
];
export function coverForKey(key) {
  if (typeof key === "number" && Number.isSafeInteger(key) && key > 0) {
    return coverPalette[(key - 1) % coverPalette.length];
  }
  let hash = 0;
  for (const character of String(key ?? ""))
    hash = (Math.imul(hash, 31) + character.codePointAt(0)) >>> 0;
  return coverPalette[hash % coverPalette.length];
}
