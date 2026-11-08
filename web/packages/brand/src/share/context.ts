import type { Picture } from "./pictures";

/** What every light layout needs about whose card it is. */
export interface CardContext {
  slug: string;
  name: string;
  ink: string;
  /** The tile as an SVG data URI (the seal or the tool mark). */
  tile: string;
  /** The 1200 x 1200 cut. */
  square: boolean;
}

export interface HomePictures {
  kid?: Picture;
  strip?: Picture;
}
