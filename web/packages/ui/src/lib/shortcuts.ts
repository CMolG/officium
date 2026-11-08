import { isApplePlatform } from "@javadaba/sdk/platform";

/*
 * One keyboard-shortcut model for the ecosystem (JAVA-799). It is javadaba-web-os's
 * `lib/platform.ts` moved here, with three fixes, each pinned by `shortcuts.test.ts`:
 *
 * - A letter also matches on `event.code`, so Ctrl+Alt+H works on a Mac (Option turns H into
 *   `˙`) and Mod+K works on a Cyrillic layout.
 * - A symbol key (`?`, `.`, `/`) ignores Shift, because on a US layout `?` IS Shift+/, while on a
 *   Spanish or French one it is another key entirely.
 * - The platform is read when asked, never at import: the server's render and the browser's
 *   agree on the keys they show (see `ShortcutKeys`).
 *
 * A combo is written once, abstractly: `Mod+K`, `Mod+Shift+N`, `Ctrl+Alt+H`, `?`, `F11`.
 * `Mod` is Command on Apple platforms and Control elsewhere.
 */

const SPECIAL_KEY_DISPLAY: Record<string, string> = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Escape: "Esc",
  Backtick: "`",
  Space: "Space",
  Delete: "⌫",
  Backspace: "⌫",
  Enter: "⏎",
  Tab: "Tab",
};

const SPECIAL_KEY_ALIAS: Record<string, string> = {
  Space: " ",
  Backtick: "`",
  Escape: "Escape",
  Delete: "Delete",
  Backspace: "Backspace",
  Enter: "Enter",
  Tab: "Tab",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
};

// Shifted number and symbol keys on a US layout: `Shift+3` produces `#`.
const SHIFT_KEY_MAP: Record<string, string> = {
  "1": "!", "2": "@", "3": "#", "4": "$", "5": "%",
  "6": "^", "7": "&", "8": "*", "9": "(", "0": ")",
  "=": "+", "-": "_", "`": "~", "[": "{", "]": "}",
  "\\": "|", ";": ":", "'": '"', ",": "<", ".": ">", "/": "?",
};

export interface ShortcutEvent {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

interface ParsedCombo {
  mod: boolean;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  key: string;
}

function parse(combo: string): ParsedCombo {
  const parsed: ParsedCombo = { mod: false, shift: false, alt: false, ctrl: false, key: "" };
  // A trailing "+" is the plus key itself: "Mod++".
  for (const part of combo.split("+")) {
    const p = part.trim();
    if (p === "Mod") parsed.mod = true;
    else if (p === "Shift") parsed.shift = true;
    else if (p === "Alt") parsed.alt = true;
    else if (p === "Ctrl") parsed.ctrl = true;
    else parsed.key = SPECIAL_KEY_ALIAS[p] ?? (p === "" ? "+" : p);
  }
  return parsed;
}

const isLetter = (key: string) => /^[a-z]$/i.test(key);
const isSymbol = (key: string) => key.length === 1 && !/[a-z0-9]/i.test(key) && key !== " ";

/** Whether the primary modifier (Command on Apple platforms, Control elsewhere) is held. */
export function isModKey(e: { metaKey: boolean; ctrlKey: boolean }, apple = isApplePlatform()): boolean {
  return apple ? e.metaKey : e.ctrlKey;
}

/**
 * Turns a combo into what the platform prints on a keycap.
 * `Mod+Shift+N` is `⌘⇧N` on a Mac and `Ctrl+Shift+N` elsewhere.
 */
export function formatShortcut(combo: string, apple = isApplePlatform()): string {
  const caps = shortcutKeys(combo, apple);
  return apple ? caps.join("") : caps.join("+");
}

/** The keycaps of a combo in print order, one entry each, so `ShortcutKeys` can draw a `<kbd>` per key. */
export function shortcutKeys(combo: string, apple = isApplePlatform()): string[] {
  const { mod, shift, alt, ctrl, key } = parse(combo);
  const caps: string[] = [];
  if (ctrl) caps.push(apple ? "⌃" : "Ctrl");
  if (mod) caps.push(apple ? "⌘" : "Ctrl");
  if (alt) caps.push(apple ? "⌥" : "Alt");
  if (shift) caps.push(apple ? "⇧" : "Shift");
  // Ctrl and Mod are one key off Apple platforms.
  const unique = caps.filter((cap, i) => caps.indexOf(cap) === i);
  if (key) unique.push(SPECIAL_KEY_DISPLAY[key === " " ? "Space" : key] ?? (isLetter(key) ? key.toUpperCase() : key));
  return unique;
}

/** Structurally matches a keydown against a combo: every modifier on its own, then the key. */
export function matchesCombo(e: ShortcutEvent, combo: string, apple = isApplePlatform()): boolean {
  const want = parse(combo);
  // Control is a key of its own on Apple platforms; elsewhere "Ctrl" in a combo IS Mod, one key.
  if (apple) {
    if (want.mod !== e.metaKey || want.ctrl !== e.ctrlKey) return false;
  } else if ((want.mod || want.ctrl) !== e.ctrlKey) {
    return false;
  }
  if (want.alt !== e.altKey) return false;

  const symbol = isSymbol(want.key);
  if (!symbol && want.shift !== e.shiftKey) return false;

  if (e.key.toLowerCase() === want.key.toLowerCase()) return true;
  if (want.shift && SHIFT_KEY_MAP[want.key] === e.key) return true;
  // Only when `key` is not itself a Latin letter: on AZERTY, Ctrl+Z is physical KeyW and must not match Mod+W.
  if (isLetter(want.key) && !/^[a-z]$/i.test(e.key) && e.code === `Key${want.key.toUpperCase()}`) return true;
  return e.code === want.key;
}

/** A keydown that is typing (or about to), where an app shortcut must stay out of the way. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  // Any editable value but `false`: Officium's page title is `plaintext-only` (JAVA-796).
  if (target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='textbox']")) {
    return true;
  }
  // A modal owns the keyboard while it is open (a dialog's own keys, its fields).
  return target.closest("[role='dialog'], [role='alertdialog']") !== null;
}

/**
 * Scores how well `query` matches `target`: exact 300, a prefix 200+, a substring 100+, and a
 * fuzzy walk of its characters 10-80; no match is -1. Spotlight's ranking, shared.
 */
export function fuzzyScore(query: string, target: string): number {
  if (!query || !target) return -1;

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return 300;
  if (t.startsWith(q)) return 200 + (q.length / t.length) * 50;

  const idx = t.indexOf(q);
  if (idx !== -1) return 100 + (q.length / t.length) * 40 + Math.max(0, 30 - idx);

  let score = 0;
  let qi = 0;
  let lastMatchIdx = -1;
  let consecutiveCount = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue;
    score += 10;
    if (lastMatchIdx === ti - 1) {
      consecutiveCount++;
      score += 5 * consecutiveCount;
    } else {
      consecutiveCount = 0;
    }
    if (ti === 0 || /[\s\-_.]/.test(t[ti - 1])) score += 8;
    if (ti > 0 && t[ti] === t[ti].toUpperCase() && t[ti - 1] === t[ti - 1].toLowerCase()) score += 6;
    lastMatchIdx = ti;
    qi++;
  }

  return qi === q.length ? score : -1;
}
