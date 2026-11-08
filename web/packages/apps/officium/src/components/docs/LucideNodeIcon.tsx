"use client";

import { FileText, Folder, type LucideIcon } from "lucide-react";

import { useLucideIcon } from "../../lib/icons/use-lucide-icon";

/** A Lucide icon loaded by its id. While it loads, or when the installed Lucide lacks it, the node's default draws in the same box. */
export function LucideNodeIcon({
  id,
  tone,
  size,
  isSection,
}: {
  id: string;
  tone: { color: string } | undefined;
  size: number;
  isSection: boolean;
}) {
  const lucide = useLucideIcon(id);
  const Icon: LucideIcon = lucide.value ?? (isSection ? Folder : FileText);
  return <Icon size={size} className="shrink-0" style={tone} aria-hidden="true" />;
}
