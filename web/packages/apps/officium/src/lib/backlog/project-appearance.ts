import {
  Beaker,
  BookOpen,
  Briefcase,
  Building,
  Camera,
  Cpu,
  CreditCard,
  Database,
  FolderKanban,
  Gamepad2,
  Globe,
  Layers,
  Map as MapIcon,
  Megaphone,
  Music,
  Palette,
  Rocket,
  Server,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Target,
  UsersRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import type { ProjectColor } from "./types";

/**
 * A project's appearance (officium-api.md §8.1, JAVA-51): a curated icon plus a closed color, the
 * one thing that tells two projects apart everywhere a project is named -- the sidebar, the
 * projects home, a card's board. Statically imported: a project's icon is drawn on every screen,
 * so it cannot wait for a chunk. Docs nodes draw any Lucide icon lazily (`use-lucide-icon.ts`);
 * a project is still limited to these 24, the same list `isValidProjectIcon` checks against.
 */
export interface ProjectIconOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const DEFAULT_PROJECT_ICON = "folder-kanban";
export const DEFAULT_PROJECT_COLOR: ProjectColor = "slate";

export const PROJECT_ICONS: readonly ProjectIconOption[] = [
  { id: "folder-kanban", label: "Folder", icon: FolderKanban },
  { id: "rocket", label: "Rocket", icon: Rocket },
  { id: "layers", label: "Layers", icon: Layers },
  { id: "target", label: "Target", icon: Target },
  { id: "briefcase", label: "Briefcase", icon: Briefcase },
  { id: "globe", label: "Globe", icon: Globe },
  { id: "shopping-cart", label: "Shopping cart", icon: ShoppingCart },
  { id: "credit-card", label: "Payments", icon: CreditCard },
  { id: "database", label: "Database", icon: Database },
  { id: "server", label: "Server", icon: Server },
  { id: "cpu", label: "Hardware", icon: Cpu },
  { id: "smartphone", label: "Mobile", icon: Smartphone },
  { id: "palette", label: "Design", icon: Palette },
  { id: "megaphone", label: "Marketing", icon: Megaphone },
  { id: "users-round", label: "People", icon: UsersRound },
  { id: "shield-check", label: "Security", icon: ShieldCheck },
  { id: "wrench", label: "Tools", icon: Wrench },
  { id: "beaker", label: "Research", icon: Beaker },
  { id: "book-open", label: "Docs", icon: BookOpen },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "camera", label: "Media", icon: Camera },
  { id: "music", label: "Audio", icon: Music },
  { id: "gamepad-2", label: "Gaming", icon: Gamepad2 },
  { id: "building", label: "Company", icon: Building },
];

const ICON_BY_ID = new Map(PROJECT_ICONS.map((option) => [option.id, option.icon]));

export function isValidProjectIcon(id: string): boolean {
  return ICON_BY_ID.has(id);
}

/** Falls back to the default rather than drawing nothing for an icon this build doesn't know
 *  (an older/newer client, or the API answering a value this list hasn't caught up with yet). */
export function projectIconComponent(id: string): LucideIcon {
  return ICON_BY_ID.get(id) ?? FolderKanban;
}

export const PROJECT_COLORS: readonly ProjectColor[] = [
  "slate", "red", "orange", "amber", "green", "teal", "blue", "indigo", "violet", "pink",
];

export function isValidProjectColor(value: string): value is ProjectColor {
  return (PROJECT_COLORS as readonly string[]).includes(value);
}

const PROJECT_COLOR_LABELS: Record<ProjectColor, string> = {
  slate: "Slate", red: "Red", orange: "Orange", amber: "Amber", green: "Green",
  teal: "Teal", blue: "Blue", indigo: "Indigo", violet: "Violet", pink: "Pink",
};

export function projectColorLabel(color: ProjectColor): string {
  return PROJECT_COLOR_LABELS[color];
}

/** The custom-property reference (`theme-tokens.css`), literal `var()` -- same pattern as
 *  `categoryColor`/`statusTone`: it goes into `style`, so Tailwind never has to see it. */
export function projectColorVar(color: ProjectColor): string {
  return `var(--officium-project-${color})`;
}
