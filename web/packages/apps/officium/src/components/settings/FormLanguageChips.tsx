"use client";

import { Button, Text } from "@javadaba/ui";
import { X } from "lucide-react";

import { formLanguageName } from "../../lib/backlog/form-languages";

/** The listed languages in order: the first is the default, named in text, not by colour alone. */
export function FormLanguageChips({
  codes,
  isOwner,
  onRemove,
}: {
  codes: string[];
  isOwner: boolean;
  onRemove: (code: string) => void;
}) {
  return (
    <ul className="flex flex-row flex-wrap gap-2" aria-label="Form languages">
      {codes.map((code, index) => (
        <li
          key={code}
          className="flex flex-row items-center gap-1 rounded-full border border-[color:var(--jd-line)] py-1 pl-3 pr-1 text-sm"
        >
          <Text>{`${formLanguageName(code)} (${code})`}</Text>
          {index === 0 && <Text className="text-xs font-bold text-[color:var(--jd-muted)]">Default</Text>}
          {isOwner && (
            <Button
              type="button"
              register="ui"
              variant="ghost"
              className="min-h-11 min-w-11 p-0"
              aria-label={`Remove ${formLanguageName(code)}`}
              onClick={() => onRemove(code)}
            >
              <X size={14} aria-hidden="true" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
