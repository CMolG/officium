"use client";

import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@javadaba/ui";

import { PROJECT_COLORS, PROJECT_ICONS, projectColorVar, projectColorLabel } from "../../lib/backlog/project-appearance";
import type { ProjectColor } from "../../lib/backlog/types";
import { ProjectIcon } from "./ProjectIcon";

export interface ProjectAppearancePickerProps {
  icon: string;
  color: ProjectColor;
  onChange: (next: { icon: string; color: ProjectColor }) => void;
  /** Non-owners see the current appearance but can't open the picker -- disabled WITH the reason
   *  visible (`interface-psychology.md` #2), not just hidden. */
  disabled?: boolean;
  disabledReason?: string;
}

/**
 * The icon+color trigger and its popover (JAVA-51): 24 curated icons, then the 10-color palette,
 * each swatch drawn in its own token so what you pick is what you get -- no second render step
 * that could disagree with `ProjectIcon`.
 */
export function ProjectAppearancePicker({ icon, color, onChange, disabled, disabledReason }: ProjectAppearancePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={disabled ? disabledReason : "Change icon and color"}
          aria-label="Project appearance"
          className="flex flex-row size-11 shrink-0 items-center justify-center rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] transition-colors hover:bg-[color:var(--jd-ink)]/[0.06] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <ProjectIcon icon={icon} color={color} size={20} />
        </button>
      </PopoverTrigger>
      {!disabled && (
        <PopoverContent className="w-72">
          <PopoverTitle className="px-4 pt-3">Icon</PopoverTitle>
          {/* Six columns: a wrapped row of sixth-width cells, the 4px gutter carried by the
              negative right margin (Yoga has no grid, native-portability rule 2). */}
          <div role="group" aria-label="Icon" className="-mr-1 flex flex-row flex-wrap gap-y-1 px-3 pb-3 pt-2">
            {PROJECT_ICONS.map((option) => {
              const Icon = option.icon;
              const selected = option.id === icon;
              return (
                <div key={option.id} className="w-1/6">
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={option.label}
                    title={option.label}
                    onClick={() => onChange({ icon: option.id, color })}
                    className={`flex flex-row size-9 items-center justify-center rounded-[var(--radius-jd-sm)] transition-colors ${
                      selected
                        ? "bg-[color:var(--jd-ink)]/[0.1] ring-2 ring-[color:var(--jd-ink)]/40"
                        : "hover:bg-[color:var(--jd-ink)]/[0.06]"
                    }`}
                  >
                    <Icon size={17} style={{ color: projectColorVar(color) }} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
          <PopoverTitle className="border-t border-[color:var(--jd-line)] px-4 pt-3">Color</PopoverTitle>
          <div role="group" aria-label="Color" className="flex flex-row flex-wrap gap-1.5 px-3 pb-3 pt-2">
            {PROJECT_COLORS.map((option) => {
              const selected = option === color;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  aria-label={projectColorLabel(option)}
                  title={projectColorLabel(option)}
                  onClick={() => onChange({ icon, color: option })}
                  className={`flex flex-row size-8 items-center justify-center rounded-full transition-transform ${selected ? "scale-110 ring-2 ring-offset-2 ring-offset-[color:var(--jd-raised)]" : "hover:scale-105"}`}
                  style={selected ? { boxShadow: `0 0 0 2px ${projectColorVar(option)}` } : undefined}
                >
                  <span
                    aria-hidden="true"
                    className="size-5 rounded-full"
                    style={{ background: projectColorVar(option) }}
                  />
                </button>
              );
            })}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
