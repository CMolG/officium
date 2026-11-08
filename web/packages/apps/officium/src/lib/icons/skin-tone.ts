/** The skin tones a viewer can choose, in the order of the data (1 light to 5 dark). Kept apart from the emoji data so the dialog can read the remembered tone without loading it. */
export const SKIN_TONES = ["default", "light", "medium-light", "medium", "medium-dark", "dark"] as const;
export type SkinTone = (typeof SKIN_TONES)[number];

export const isSkinTone = (value: unknown): value is SkinTone => (SKIN_TONES as readonly unknown[]).includes(value);
