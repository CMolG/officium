import { echoAccent } from "@javadaba/brand";

import { EchoIcon, type EchoGlyph, type EchoIconProps } from "./echo-icon";

/*
 * EchoFeature, Library 17 "Echo" (`web.echo_feature(slug, name, size=26)`): a product's feature icon
 * drawn with the product's own echo color, so a product page's feature list, a store listing and an
 * empty state all use one rule instead of a hand-picked color per screen. The color is
 * `echoAccent(slug)`: the first color of the product's seal palette that keeps the ink at 3:1 and
 * still shows on a light ground.
 *
 * A slug with no palette has no echo color to give, and a made-up one would break the rule that the
 * color is the element's own; the plain icon is drawn instead, at the same size.
 */

export interface EchoFeatureProps extends Pick<EchoIconProps, "dark" | "turn" | "className" | "style"> {
  /** The product's registry slug (`officium`, `fabula`, ...). */
  slug: string;
  /** The feature's icon (a `lucide-react` icon). */
  icon: EchoGlyph;
  /** In pixels. Defaults to 26, the size a feature list draws at. */
  size?: number;
}

export function EchoFeature({ slug, icon: Icon, size = 26, ...rest }: EchoFeatureProps) {
  const color = echoAccent(slug);
  if (!color) return <Icon size={size} color="currentColor" aria-hidden="true" />;
  return <EchoIcon icon={Icon} size={size} color={color} {...rest} />;
}
