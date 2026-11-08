/** The axes of `Panel` on both runtimes (the classes stay in each half). */

export type PanelMaterial = "plain" | "glass" | "raised";
export type PanelRadius = "sm" | "md" | "lg" | "xl" | "bento";

export interface PanelAxes {
  material?: PanelMaterial;
  /** `md` is the radius of a content card; `lg`/`xl`, that of a large piece; `bento` the bento cell (20 on a phone, 24 above). */
  radius?: PanelRadius;
  /** Hover lift on the web, press feedback on Android. Only when the panel is actionable. */
  interactive?: boolean;
  className?: string;
}
