"use client";

import { Input, Text } from "@javadaba/ui";

/** A role id typed in, for a role the list does not offer (Officium takes any kebab-case id). */
export function RoleTypedField({ value, error, onChange }: { value: string; error: string | null; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <Text className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Not listed? Type its id</Text>
      <Input value={value} placeholder="frontend-developer" aria-invalid={error ? true : undefined} className="h-11" onChange={(e) => onChange(e.target.value)} />
      {error && (
        <Text as="p" role="alert" className="text-xs font-bold text-destructive">
          {error}
        </Text>
      )}
    </label>
  );
}
