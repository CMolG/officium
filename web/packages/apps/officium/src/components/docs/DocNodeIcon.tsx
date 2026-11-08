import { FileText, Folder } from "lucide-react";

import { LucideNodeIcon } from "./LucideNodeIcon";
import { PROJECT_ICONS, isValidProjectColor, projectColorVar, projectIconComponent } from "../../lib/backlog/project-appearance";
import { isEmojiIcon, isLucideIconId } from "../../lib/docs/doc-node-rules";

/** The icons the app ships with (the curated grid); any other Lucide id is loaded alone (JAVA-1765). */
const isCurated = (icon: string) => icon === "folder" || icon === "file-text" || PROJECT_ICONS.some((option) => option.id === icon);

/**
 * A documentation node's icon (JAVA-791, JAVA-1765): an emoji as text, a Lucide icon of any name, or the
 * default for what the node is (a folder for a section, a page for a page). The colour never stands alone:
 * the node's name always sits beside the icon.
 */
export function DocNodeIcon({
  icon,
  color,
  isSection,
  size = 14,
}: {
  icon: string | null;
  color: string | null;
  isSection: boolean;
  size?: number;
}) {
  const tone = color && isValidProjectColor(color) ? { color: projectColorVar(color) } : undefined;
  if (icon && isEmojiIcon(icon)) {
    return (
      <span aria-hidden="true" className="shrink-0 text-center leading-none" style={{ width: size, fontSize: size - 1 }}>
        {icon}
      </span>
    );
  }
  if (icon && isLucideIconId(icon) && !isCurated(icon)) {
    return <LucideNodeIcon id={icon} tone={tone} size={size} isSection={isSection} />;
  }
  const Fallback = isSection ? Folder : FileText;
  const Icon = icon === "file-text" ? FileText : icon === "folder" ? Folder : icon ? projectIconComponent(icon) : Fallback;
  return <Icon size={size} className="shrink-0" style={tone} aria-hidden="true" />;
}
