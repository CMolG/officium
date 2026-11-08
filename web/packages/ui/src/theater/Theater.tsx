"use client";

/*
 * Theater
 * -------
 * How a page shows an app working (Lib-Theater, "Quiet Bento"): a small Javadaba desktop (the
 * product's colors as circles blurred behind frosted glass), one window on it, and the real app
 * playing in the window on its own, in a loop. It is never a video, so redesigning an app
 * redesigns its scenes. Each scene is a miniapp resolved by route from a registry (or passed
 * directly), and the content is real and usable: whoever watches gains confidence in the product.
 *
 * Its own styles (prefix `theater__`, `--theater-*` variables) are injected with the component.
 * The contract miniapps must meet is `doc://projects/ui/theater-miniapp-contract`.
 *
 * Layout of this folder: `parts/` is one component per file (Root and its Desk, Window, Stage,
 * the bar's Play/Pause, Scenes, Caption, Loops and Open, the Chips, the Status pill, and what the
 * Stage is made of), `hooks/` is the Root's controller split by responsibility (state, clock,
 * holds, playback, autoplay timer, environment listeners). This file composes them and is the
 * folder's public surface.
 *
 * Minimal usage
 * -------------
 *   <Theater
 *     scenes={[
 *       { id: "leads", route: "/crm/leads", title: "Leads", caption: "Quick add",
 *         cursor: { target: theaterTarget("new-lead"), click: true, act: true } },
 *     ]}
 *     registry={{ "/crm/leads": LeadsPage }}
 *     viewport={[{ width: 1280, height: 800 }, { width: 360, height: 640 }]}
 *     desk={["#5868D3", "#6A82C4", "#7699A5"]}
 *     product={{ name: "Officium", icon: <img src={seal} alt="" width={16} height={16} /> }}
 *     cta={{ href: "/app", label: "Open Officium" }}
 *     onEvent={(e) => analytics.track("theater", e)}
 *   />
 *
 * Free composition (same mechanics, different layout)
 * -----------------------------------------------------
 *   <Theater.Root scenes={scenes} registry={registry} desk={desk}>
 *     <Theater.Window>
 *       <Theater.Stage viewport={{ width: 1280, height: 800 }} />
 *     </Theater.Window>
 *     <Theater.Bar parts={{ ...parts }} />
 *   </Theater.Root>
 *
 * Behaviour, written on purpose
 * ------------------------------
 * - In a product, a Theater is the desk and the window: no chips, no badges, no caption bar, no
 *   controls. Each is a switch in `parts` and every one is off by default.
 * - Plays on its own when it comes into view and loops for good (user decision, 2026-09-15); the
 *   end connects to the start, so the app always looks at work, and there is no closing screen
 *   (Lib-Theater, wave 7). A ceiling is optional: `maxLoops={n}` (or `loop={false}`) holds the last
 *   frame after n laps, and Play on the bar starts it again.
 * - The show goes on: hovering, focusing or pressing into the stage does not stop it. The person's
 *   pointer and the ghost cursor share the window (`pauseOnHover`, `pauseOnInteract` opt back in).
 * - Links stay inside: a link in the scene never navigates; the window says so for four seconds
 *   and offers the app. Modals open inside: the scene's layer is where dialogs portal to, so the
 *   scrim covers the window only and the page around it never dims.
 * - One switch stops it: "Pause animations" (`useAnimations`, `AnimationsSwitch`) holds the frame it
 *   is on. With reduced motion the site starts paused; pressing Play overrides the system. Off screen
 *   or in a background tab it stops and picks up when it is back.
 * - The caption of each scene is read to screen readers, never shown, unless `parts.captionBar`.
 * - A scene lasts as long as ITS sequence lasts (`scene.duration`, declared by whoever writes it
 *   with the same constant that drives its choreography). Theater never cuts a sequence halfway
 *   through (user decision, 2026-09-22).
 * - The scenes timeline says which one is showing and jumps to one; the playing segment fills as the
 *   scene plays and is full when the scene ends. With a single scene it is not painted.
 * - There is never an empty frame. Between scenes the new one fades in OVER the previous one; when
 *   the sequence returns to the SAME scene it receives a new `pass` and restarts its own script
 *   (or keeps going, if its choreography is already a loop; the miniapp contract, section 3).
 * - A scene's clock starts when there is something to see: while Suspense shows the fallback,
 *   playback is held. Loading shows bones after 300 ms, inside the window.
 * - States, all inside the window: playing, touched, a link, a modal, reduced motion, loading, did
 *   not load (retry, or the app) and scene not registered (next scene; reported through `onEvent`).
 * - Text lives in `labels`, all replaceable. Events in `onEvent` to measure instead of opine.
 */

import type { TheaterParts, TheaterProps } from "./types";
import { TheaterBar, barIsOn } from "./parts/TheaterBar";
import { TheaterCaption } from "./parts/TheaterCaption";
import { TheaterChips } from "./parts/TheaterChips";
import { TheaterLoops } from "./parts/TheaterLoops";
import { TheaterOpen } from "./parts/TheaterOpen";
import { TheaterPlayPause } from "./parts/TheaterPlayPause";
import { TheaterRoot } from "./parts/TheaterRoot";
import { TheaterScenes } from "./parts/TheaterScenes";
import { TheaterStage } from "./parts/TheaterStage";
import { TheaterStatus } from "./parts/TheaterStatus";
import { TheaterWindow } from "./parts/TheaterWindow";

/** Every part is off until a page asks for it: a Theater works on its own. */
const PARTS_OFF: TheaterParts = {
  productChip: false,
  liveBadge: false,
  captionBar: false,
  scenes: false,
  loops: false,
  playPause: false,
  openApp: false,
  statusPill: false,
};

function TheaterComposed({
  titleBar,
  viewport,
  minScale,
  interactive,
  cursor,
  fallback,
  parts: partsProp,
  resumeOnLeave,
  ...root
}: TheaterProps) {
  const parts = { ...PARTS_OFF, ...partsProp };

  return (
    <TheaterRoot
      {...root}
      resumeOnLeave={resumeOnLeave ?? !parts.playPause}
    >
      <TheaterChips productChip={parts.productChip} liveBadge={parts.liveBadge} />
      <TheaterWindow titleBar={titleBar}>
        {parts.statusPill ? <TheaterStatus /> : null}
        <TheaterStage
          viewport={viewport}
          minScale={minScale}
          interactive={interactive}
          cursor={cursor}
          fallback={fallback}
        />
      </TheaterWindow>
      {barIsOn(parts) ? <TheaterBar parts={parts} /> : <TheaterCaption />}
    </TheaterRoot>
  );
}

export const Theater = Object.assign(TheaterComposed, {
  Root: TheaterRoot,
  Window: TheaterWindow,
  Stage: TheaterStage,
  Status: TheaterStatus,
  Chips: TheaterChips,
  Bar: TheaterBar,
  PlayPause: TheaterPlayPause,
  Scenes: TheaterScenes,
  Loops: TheaterLoops,
  Open: TheaterOpen,
  Caption: TheaterCaption,
});

// The package's public surface: what the single-file Theater exported, no more. The helpers the
// parts share (`cx`, `clamp`, `now`, the icons, the hooks) are internal and stay out of
// `@javadaba/ui`'s barrel.
export * from "./types";
export {
  ACCENT_DESK,
  DEFAULT_LABELS,
  THEATER_LABELS_EN,
  lazyRegistry,
  theaterTarget,
} from "./constants";
export { useTheater, useTheaterScene } from "./hooks/useTheater";
