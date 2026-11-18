export interface CoverColour { name: string; light: string; dark: string; }
export const coverPalette: readonly CoverColour[];
export function coverForKey(key?: string | number): CoverColour;
