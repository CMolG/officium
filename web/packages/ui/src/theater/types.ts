import type { CSSProperties, ComponentType, ReactNode } from "react";

/**
 * Any component a scene can mount, with whatever props it declares: `scene.props` is untyped by
 * design, and no other parameter type admits both a component with required props and a class.
 * The only `any` of the Theater.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TheaterComponent = ComponentType<any>;
export type TheaterRegistry = Record<string, TheaterComponent>;
export type TheaterLoader = () => Promise<
  { default: TheaterComponent } | TheaterComponent
>;

/** The scene's ghost cursor. */
export interface TheaterCursor {
  /** Position in % of the viewport (when there is no `target`). */
  x?: number;
  y?: number;
  /** CSS selector inside the scene; the cursor goes to the element's center. Takes priority over x/y. */
  target?: string;
  /** Animates a click on arrival. */
  click?: boolean;
  /** Fires a real click on `target` on arrival (only if still playing). */
  act?: boolean;
  /**
   * Only in a path (`cursor: [...]`): scene ms at which this step starts. It runs on the
   * scene's clock, so it stops with any pause and resumes where it left off.
   */
  at?: number;
}

export interface TheaterViewport {
  width: number;
  height: number;
}

export type ViewportSpec =
  TheaterViewport | TheaterViewport[] | null | undefined;

export interface TheaterScene {
  id: string;
  /** The miniapp's route in the registry, e.g. "/billing/invoices/new". */
  route: string;
  title?: string;
  caption?: ReactNode;
  /**
   * How long the scene's sequence lasts, in ms: one full pass of its choreography (its
   * script, its CSS loop, its cursor path). Theater advances when it ends, never before.
   * If missing, the Root's `duration` is used, which is meant for a still composition.
   */
  duration?: number;
  props?: Record<string, unknown>;
  /** Explicit component; takes priority over the registry. */
  component?: TheaterComponent;
  /** A single target, or a path of steps ordered by `at` for scenes with several actions. */
  cursor?: TheaterCursor | readonly TheaterCursor[] | null;
  /** Real link to the route, for "Open the app". */
  href?: string;
  /** Own loading fallback; must preserve the scene's final geometry. */
  fallback?: ReactNode;
  /**
   * A name for the ghost cursor when it stands for someone, such as an agent: it shows as a chip
   * beside the pointer. Without it the ghost is a bare pointer.
   */
  cursorLabel?: string;
}

export interface TheaterCta {
  label?: string;
  href?: string;
  onClick?: () => void;
}

export interface TheaterLabels {
  region: string;
  scene: (index: number, count: number, title: string) => string;
  scenes: string;
  play: string;
  pause: string;
  prev: string;
  next: string;
  open: string;
  paused: string;
  /** The status pill when the scene holds still (reduced motion, or the person's own setting). */
  still: string;
  /** The status pill's one-time hint, shown until the first press into the window. */
  hint: string;
  /** The badge on the desk: the scene is live, not a recording. */
  live: string;
  loops: string;
  loopsHint: string;
  /** Said inside the window when a link in the scene is pressed; nothing navigates. */
  linkNote: string;
  loading: string;
  emptyTitle: string;
  emptyBody: string;
  missingTitle: string;
  missingBody: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  /** The window controls, drawn but inert: their names for assistive tech are not needed, so none. */
  windowTitleFallback: string;
}

export type TheaterPauseReason =
  | "hover"
  | "interact"
  | "control"
  | "keyboard"
  | "offscreen"
  | "hidden"
  | "ended";

export type TheaterPlayReason =
  "hover" | "interact" | "control" | "keyboard" | "leave";

export type TheaterEvent =
  | { type: "view" }
  | {
      type: "scene";
      index: number;
      scene: TheaterScene;
      reason: "auto" | "user";
    }
  | { type: "pause"; reason: TheaterPauseReason }
  | { type: "play"; reason: TheaterPlayReason }
  | { type: "interact"; index: number; scene: TheaterScene }
  | { type: "open"; href: string; scene: TheaterScene | undefined }
  | { type: "link"; href: string; scene: TheaterScene | undefined }
  | {
      type: "scene_error";
      kind: "missing" | "failed";
      scene: TheaterScene | undefined;
    }
  | { type: "loop_complete"; loops: number };

export interface TheaterRootProps {
  scenes: TheaterScene[];
  registry?: TheaterRegistry;
  /** Alternate resolution when the route is not in the registry (patterns, params…). */
  resolve?: (
    route: string,
    scene: TheaterScene,
  ) => TheaterComponent | undefined;
  /** Controlled index. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number, scene: TheaterScene) => void;
  onEvent?: (event: TheaterEvent) => void;
  autoplay?: boolean;
  loop?: boolean;
  /** Full laps before holding the last frame (there is no closing screen). `Infinity` (default) never stops. */
  maxLoops?: number;
  /** Duration of a scene that does not declare its own (a still composition), in ms. */
  duration?: number;
  /** Duration of the cross-fade between scenes, in ms. */
  transition?: number;
  /** Hovering the stage holds the show. Off: the person's pointer and the ghost share the window. */
  pauseOnHover?: boolean;
  /** Pressing into the stage pauses. Off by default: the show goes on while they try the real app. */
  pauseOnInteract?: boolean;
  pauseOffscreen?: boolean;
  /**
   * A pause (tapping the scene, keyboard) resumes on its own when the pointer leaves the Theater;
   * on touch, on tapping outside. For when there are no controls to hit Play with:
   * `Theater` turns it on by default if `controls` is false. It does not resume an ended state (`ended`).
   */
  resumeOnLeave?: boolean;
  /** Action for the controls. If missing, `scene.href` is used. */
  cta?: TheaterCta;
  labels?: Partial<TheaterLabels>;
  /**
   * The desk's colors: the product's own, as circles blurred behind frosted glass, like the
   * Javadaba desktop. Two to four CSS colors, spread over six circles. Without it the desk
   * takes the accent of the Surface it sits in (`ACCENT_DESK`).
   */
  desk?: readonly string[];
  product?: TheaterProduct;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface TheaterState {
  scenes: TheaterScene[];
  index: number;
  scene: TheaterScene | undefined;
  /**
   * The component each scene mounts, by scene index. Resolved once when `scenes`, `registry` or
   * `resolve` change, so a layer renders a value that is already stable.
   */
  components: ReadonlyArray<TheaterComponent | undefined>;
  count: number;
  /** Changes on every scene jump (also when repeating the same one). */
  cycle: number;
  /** Actually playing (intent + no holds). */
  playing: boolean;
  /** The user (or the sequence ending) has paused. */
  paused: boolean;
  /** The sequence has ended (no loop, or lap ceiling) and has not resumed. */
  ended: boolean;
  /** Active holds: "hover", "offscreen", "hidden", "loading"… */
  holds: ReadonlySet<string>;
  /** Scenes receive events (registered by the Stage). */
  interactive: boolean;
}

export interface TheaterActions {
  play: (reason?: TheaterPlayReason) => void;
  pause: (reason?: TheaterPauseReason) => void;
  toggle: (reason?: TheaterPlayReason & TheaterPauseReason) => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  /** Temporary hold (hover, offscreen…). Does not change the user's intent. */
  hold: (key: string) => void;
  release: (key: string) => void;
  /** The user has tapped inside the scene. */
  interact: () => void;
  open: (href: string) => void;
  /** A link in the scene was pressed. Nothing navigates; the window says so. */
  link: (href: string) => void;
  /** A scene could not be shown: reported through `onEvent` (and the console), never to the viewer. */
  report: (kind: "missing" | "failed") => void;
  setInteractive: (interactive: boolean) => void;
}

export interface TheaterMeta {
  transition: number;
  pauseOnHover: boolean;
  pauseOnInteract: boolean;
  cta: TheaterCta | undefined;
  labels: TheaterLabels;
  product: TheaterProduct | undefined;
  durationOf: (index: number) => number;
  /** Milliseconds elapsed in the current scene. */
  getElapsed: () => number;
  resolveScene: (scene: TheaterScene) => TheaterComponent | undefined;
}

export type TheaterContextValue = TheaterState & TheaterActions & TheaterMeta;

/** What a miniapp can know about its scene via `useTheaterScene()`. */
export interface TheaterSceneInfo {
  scene: TheaterScene;
  index: number;
  /** false on the layer that is fading out. */
  active: boolean;
  /** Actually advancing: false during any pause (hover, interaction, offscreen…). */
  playing: boolean;
  /** Scene ms elapsed. So whatever the miniapp animates runs on the same clock as the cursor. */
  getElapsed: () => number;
  /**
   * Sequence pass. Changes when the sequence starts over WITHOUT unmounting the scene
   * (a Theater with a single looping scene, or returning to the scene already showing): it's the
   * signal for the scene to restart its own script. A choreography that is already a loop ignores it.
   */
  pass: number;
}

export interface TheaterPartProps {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/** The product a Theater shows: its chip on the desk and, with `titleBar`, its seal in the window's title row. */
export interface TheaterProduct {
  name: string;
  /** The product's seal, drawn at 16 px (an `<img>` or a ToolMark). Decorative: the name carries the meaning. */
  icon?: ReactNode;
}

export interface TheaterWindowProps {
  /**
   * The window's title row: the seal, the scene's title and the window controls, drawn but inert
   * (Lib-Theater "The window"). On by default, as the board draws it (owner answer 11.01, wave 7: it
   * is a Javadaba OS title bar, not a browser bar, so there is no address and no traffic lights).
   * `false` takes it off.
   */
  titleBar?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export interface TheaterStageProps {
  /**
   * Logical viewport of the scenes (or a list from largest to smallest); it scales to the
   * available width without going below `minScale`. `null` = scenes fill the
   * frame as is.
   */
  viewport?: ViewportSpec;
  /** Minimum legible scale before moving to the list's next viewport. */
  minScale?: number;
  /** If false, scenes do not receive events (a still picture of the app that moves). */
  interactive?: boolean;
  /** Ghost cursor per `scene.cursor`. */
  cursor?: boolean;
  /** Default Suspense fallback for lazy scenes. */
  fallback?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Overlaid layers. */
  children?: ReactNode;
}

/**
 * The parts a Theater can switch on (Lib-Theater "Theater settings"). Every one is off by default:
 * product pages and storefronts keep them off, and the Theater works on its own. The caption is
 * still read to screen readers when the bar is off.
 */
export interface TheaterParts {
  /** The seal and the name, top left of the desk. Needs `product`. */
  productChip: boolean;
  /** "A live scene, looping", top right of the desk. */
  liveBadge: boolean;
  /** The sentence for each scene, on glass under the window. */
  captionBar: boolean;
  /** The timeline: one segment per scene. */
  scenes: boolean;
  /** Says the end runs into the start. */
  loops: boolean;
  /** One button, in the bar. */
  playPause: boolean;
  /** The way into the app, at the end of the bar. Needs a link on the scene or `cta`. */
  openApp: boolean;
  /** Paused, still, or a one-time hint, over the window. */
  statusPill: boolean;
}

export interface TheaterProps
  extends
    TheaterRootProps,
    Pick<TheaterWindowProps, "titleBar">,
    Pick<
      TheaterStageProps,
      "viewport" | "minScale" | "interactive" | "cursor" | "fallback"
    > {
  parts?: Partial<TheaterParts>;
}
