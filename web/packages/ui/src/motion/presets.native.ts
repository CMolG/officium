import { Easing, Keyframe, LinearTransition, SharedTransition } from "react-native-reanimated";

import {
  LAYOUT_DURATION,
  LAYOUT_EASING,
  layerSpec,
  pressSpec,
  type LayerDirection,
  type LayerKind,
  type PressRegister,
} from "./presets.shared";

/*
 * The web's motion jobs for Reanimated 4 (JAVA-1486, JAVA-106, ADR 0015 B4), built from
 * `presets.shared.ts`, which `presets.test.ts` pins against `tokens.css`.
 *
 * - Enter and exit (`jd-fade`, `jd-pop`, `jd-sheet`, `jd-slide-*`): `layerMotion`, for `entering` /
 *   `exiting`. `travel` is how far the layer sits from its resting place along its axis: the
 *   window's height for a sheet, its width for a slide, because a layer leaves by its own edge.
 * - Layout (a sibling moved, a row added): `layoutMotion`, for `layout`.
 * - Shared element (one thing becoming another across screens): `sharedMotion`, for
 *   `sharedTransitionStyle` next to a `sharedTransitionTag`.
 * - Press (`active:` on the web): `pressMotion`, the style to merge while a `Pressable` is pressed.
 */

export function layerMotion(kind: LayerKind, direction: LayerDirection, reduced: boolean, travel: number) {
  const { from, to, duration, easing } = layerSpec(kind, direction, reduced);
  const frame = (f: typeof from) => ({
    opacity: f.opacity,
    transform: [{ translateX: f.translateX * travel }, { translateY: f.translateY * travel }, { scale: f.scale }],
  });
  const [a, b, c, d] = easing;
  return new Keyframe({
    0: frame(from),
    100: { ...frame(to), easing: Easing.bezier(a, b, c, d) },
  }).duration(duration);
}

const [la, lb, lc, ld] = LAYOUT_EASING;

/** A reflow takes the entrance's timing. Under reduced motion it snaps, as the web's blanket rule zeroes every transition: a reflow is pure movement, with no fade to keep. */
export function layoutMotion(reduced: boolean) {
  return LinearTransition.duration(reduced ? 0 : LAYOUT_DURATION).easing(Easing.bezier(la, lb, lc, ld));
}

export function sharedMotion(reduced: boolean) {
  return SharedTransition.duration(reduced ? 0 : LAYOUT_DURATION).easing(Easing.bezier(la, lb, lc, ld));
}

/** The pressed state of a control: merge it into a `Pressable`'s style while `pressed`. */
export function pressMotion(register: PressRegister, pressed: boolean, reduced: boolean) {
  const { pressed: down } = pressSpec(register, reduced);
  return pressed ? { opacity: down.opacity, transform: [{ scale: down.scale }] } : { opacity: 1, transform: [{ scale: 1 }] };
}
