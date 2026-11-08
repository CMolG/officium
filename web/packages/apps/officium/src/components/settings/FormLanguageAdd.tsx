"use client";

import { Button, Input, Text } from "@javadaba/ui";

import { MAX_FORM_LANGUAGES, formLanguageName } from "../../lib/backlog/form-languages";

/** The owner's way to list a language: a code typed in, or one of the suggestions not listed yet. */
export function FormLanguageAdd({
  input,
  setInput,
  inputError,
  full,
  addable,
  onAdd,
}: {
  input: string;
  setInput: (value: string) => void;
  inputError: string | null;
  full: boolean;
  addable: readonly string[];
  onAdd: (code: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1.5">
          <Text className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Language code</Text>
          <Input
            value={input}
            placeholder="es"
            disabled={full}
            className="w-32"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && input.trim() !== "" && onAdd(input)}
          />
        </label>
        <Button type="button" register="ui" className="min-h-11" disabled={full || input.trim() === ""} onClick={() => onAdd(input)}>
          Add
        </Button>
      </div>
      {full && (
        <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
          {`${MAX_FORM_LANGUAGES} languages is the most a project lists. Remove one to add another.`}
        </Text>
      )}
      {inputError && (
        <Text as="p" role="alert" className="text-sm font-medium text-destructive">
          {inputError}
        </Text>
      )}
      {addable.length > 0 && !full && (
        <div className="flex flex-row flex-wrap gap-2">
          {addable.map((code) => (
            <Button key={code} type="button" register="ui" variant="outline" className="min-h-11" onClick={() => onAdd(code)}>
              {`Add ${formLanguageName(code)}`}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
