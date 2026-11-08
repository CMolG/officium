/*
 * catalog.ts: the Javadaba kid's drawings as data. 91 of them: 36 of the kid himself (the 24 moods,
 * 11 gestures and 1 scene the design calls by name) and 55 dressed in a role (an artist, a chef, a
 * pilot...), which the design keeps for later ("Later · role").
 *
 * A name here is the design's own word and the file's name at once (`shh.webp`, `wow.webp`,
 * `amazed.webp`): since wave 7 the files were renamed to the words the artboards use, so a screen
 * written from the design says `name="shh"` with nothing in between. The roles keep the names of
 * their files (`artist_shy`).
 *
 * No image is imported here: this file is safe for a server route, a script or a test. The
 * files themselves are `images.ts`.
 */

export type KidKind = "mood" | "gesture" | "scene";

export interface KidMeta {
  readonly kind: KidKind;
  /** What the drawing is for, in the design's words. */
  readonly meaning: string;
  /** The alt text for when no words beside the drawing already say it. */
  readonly alt: string;
}

function kid(kind: KidKind, meaning: string, alt: string) {
  return { kind, meaning, alt } as const satisfies KidMeta;
}

export const KID_DOODLES = {
  // Moods, 24
  wave: kid("mood", "Hello: a welcome, a first visit, hello again.", "The Javadaba kid, waving hello."),
  confident: kid("mood", "Ready when you are: the invitation before a footer.", "The Javadaba kid, arms crossed, confident."),
  salute: kid("mood", "At your service: one account, signing in.", "The Javadaba kid, saluting."),
  think: kid("mood", "Thinking it over: the people who write and build here.", "The Javadaba kid, thinking."),
  dizzy: kid("mood", "Something on our side that does not add up, like a link that no longer works.", "The Javadaba kid, dizzy."),
  mug: kid("mood", "Take your time: nothing here yet, a person reads it.", "The Javadaba kid, with a mug."),
  eager: kid("mood", "Can't wait: a door about to open, the desktop and its apps.", "The Javadaba kid, eager."),
  oh: kid("mood", "A plain surprise: a page that is not here.", "The Javadaba kid, surprised."),
  shh: kid("mood", "Private: only you see it, or nothing is measured.", "The Javadaba kid, finger to his lips."),
  stop: kid("mood", "Not for you here: another country, access you lost.", "The Javadaba kid, hand up to stop."),
  wow: kid("mood", "It just went out into the world: published, earned, live.", "The Javadaba kid, amazed."),
  amazed: kid("mood", "Much more than expected: a result that took the person by surprise.", "The Javadaba kid, mind blown."),
  oops: kid("mood", "Our fault: a server error, a plan the AI could not make.", "The Javadaba kid, nervous."),
  facepalm: kid("mood", "Our own blunder, owned plainly. Never aimed at the person's mistake.", "The Javadaba kid, hand on his face."),
  worried: kid("mood", "Before something goes wrong: space nearly full, a deadline tomorrow.", "The Javadaba kid, worried."),
  phew: kid("mood", "Relief after effort: a long job finally done, a close call recovered.", "The Javadaba kid, relieved."),
  huh: kid("mood", "Nothing matches, or the thing moved away.", "The Javadaba kid, confused."),
  sleepy: kid("mood", "Quiet on purpose: closed, nothing due, waiting for the first answer.", "The Javadaba kid, asleep."),
  grumpy: kid("mood", "Too many: tries, messages, requests.", "The Javadaba kid, grumpy."),
  cry: kid("mood", "A goodbye the person chose, shown after it is done. Never on the confirmation itself.", "The Javadaba kid, crying."),
  strong: kid("mood", "A long task the person finished.", "The Javadaba kid, flexing."),
  thanks: kid("mood", "Someone gave something: photos, answers, their time.", "The Javadaba kid, saying thanks."),
  glad: kid("mood", "A calm success: it went out, it is saved, nothing more to do.", "The Javadaba kid, glad."),
  laugh: kid("mood", "A joke we make on purpose: an easter egg, an April 1.", "The Javadaba kid, laughing."),
  // Gestures, 11
  like: kid("gesture", "A yes, after the person gave it. Never the button itself.", "The Javadaba kid, thumbs up."),
  dislike: kid("gesture", "A no, after the person gave it. Never the button itself.", "The Javadaba kid, thumbs down."),
  love: kid("gesture", "Favorites and saved things, empty or full.", "The Javadaba kid, with a heart."),
  shrug: kid("gesture", "We do not know yet: data nobody has checked, nothing to match.", "The Javadaba kid, shrugging."),
  idea: kid("gesture", "Tips, templates, starting from a pattern.", "The Javadaba kid, with an idea."),
  wink: kid("gesture", "Psst, try this: a first-time hint, a shortcut.", "The Javadaba kid, winking."),
  point: kid("gesture", "A first run with one action: drawn on the left of what it points at.", "The Javadaba kid, pointing."),
  peace: kid("gesture", "Signed out or unsubscribed, without guilt.", "The Javadaba kid, making a peace sign."),
  yay: kid("gesture", "All done: nothing left to read, review or file.", "The Javadaba kid, celebrating."),
  okay: kid("gesture", "Working, verified, connected.", "The Javadaba kid, making an okay sign."),
  clap: kid("gesture", "A milestone someone reached, the end of a book included.", "The Javadaba kid, clapping."),
  // Scenes, 1 (the other, the robots, is a strip and not a doodle: javadaba-landing/public/img/robots-at-work.webp)
  vacation: kid("scene", "Away: the person is out, the agents are not. Never above 240 px.", "The Javadaba kid, on vacation."),
} as const;

/**
 * The costumes. A role dresses a base pose: same face, same pose, one costume. They are a future
 * feature: until it opens, a role appears only tagged "Later · role", at most one per product
 * context, and the plain kid stays the default.
 */
export const ROLE_POSES = {
  artist: ["greeting", "ready", "shy", "sigh", "stunned", "thinking", "worried"],
  astronaut: ["greeting", "ready"],
  barista: ["greeting", "ready"],
  builder: ["greeting", "ready"],
  chef: ["greeting", "ready"],
  courier: ["greeting", "ready"],
  developer: ["greeting", "ready"],
  doctor: ["greeting", "ready"],
  firefighter: ["greeting", "ready"],
  gardener: ["greeting", "ready"],
  hairdresser: ["greeting", "ready"],
  judge: ["greeting", "ready"],
  lifeguard: ["greeting", "ready"],
  mechanic: ["greeting", "ready"],
  nurse: ["greeting", "ready"],
  photographer: ["greeting", "ready"],
  pilot: ["greeting", "ready"],
  police: ["greeting", "ready"],
  referee: ["greeting", "ready"],
  reporter: ["greeting", "ready"],
  scientist: ["greeting", "ready"],
  streamer: ["greeting", "ready"],
  teacher: ["greeting", "ready"],
  trainer: ["greeting", "ready"],
  waiter: ["greeting", "ready"],
} as const;

export type KidDoodle = keyof typeof KID_DOODLES;
export type RoleName = keyof typeof ROLE_POSES;
export type RoleDoodle = { [R in RoleName]: `${R}_${(typeof ROLE_POSES)[R][number]}` }[RoleName];
/** The 91 names: exactly the files in `./webp` (and `./png`) without the extension. */
export type DoodleName = KidDoodle | RoleDoodle;

/**
 * @deprecated Wave 7 (MIG-A02) gave the files the design's own words, so there is nothing left to
 * translate: write `name="shh"`. This identity map (`KID.shh === "shh"`) only keeps the call sites
 * of the areas still sweeping from breaking; it is deleted the day `grep -r "KID\."` finds
 * nothing outside this package.
 */
export const KID = Object.fromEntries(Object.keys(KID_DOODLES).map((name) => [name, name])) as { [K in KidDoodle]: K };

export interface DoodleMeta {
  readonly kind: KidKind | "role";
  readonly alt: string;
  /** What the drawing is for. Roles have none yet. */
  readonly meaning?: string;
  /** The role that dresses it. */
  readonly role?: RoleName;
  /** The widest it may be drawn, in px: the vacation scene never goes above 240. */
  readonly maxSize?: number;
}

const roleEntries = (Object.keys(ROLE_POSES) as RoleName[]).flatMap((role) =>
  ROLE_POSES[role].map((pose): [DoodleName, DoodleMeta] => [
    `${role}_${pose}` as RoleDoodle,
    { kind: "role", role, alt: `The Javadaba kid as a ${role}, ${pose === "greeting" ? "waving" : pose}.` },
  ]),
);

export const DOODLES: Readonly<Record<DoodleName, DoodleMeta>> = Object.fromEntries([
  ...Object.entries(KID_DOODLES).map(([name, m]): [string, DoodleMeta] => [
    name,
    { kind: m.kind, alt: m.alt, meaning: m.meaning, ...(name === "vacation" ? { maxSize: 240 } : {}) },
  ]),
  ...roleEntries,
]) as Record<DoodleName, DoodleMeta>;

export const DOODLE_NAMES = Object.keys(DOODLES) as DoodleName[];
