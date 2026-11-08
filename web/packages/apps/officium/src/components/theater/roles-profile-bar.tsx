"use client";

import { Button, Select, Text } from "@javadaba/ui";

import { PROFILE_DEFAULTS, PROFILE_ECO } from "./roles-script";

// The two choices the scene offers, and only those: Claude Standard differs from the defaults by a
// mod on Review, which no tile shows, so picking it would look like a dead control.
const OPTIONS = [
  { value: PROFILE_DEFAULTS, label: "Officium's defaults", description: "No profile: the matrix as Officium ships it." },
  { value: PROFILE_ECO, label: "Claude Eco", description: "Built in" },
];

/** The profile choice and its apply button. The real panel's controls, minus the parts that reach the API. */
export function RolesProfileBar({
  choice,
  onChoose,
  onApply,
}: {
  choice: string;
  onChoose: (value: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <Select
        aria-label="Work profile"
        data-theater-target="work-profile-select"
        value={choice}
        onChange={onChoose}
        options={OPTIONS}
        className="min-h-11 w-full min-w-0 justify-between sm:w-auto sm:flex-1"
      />
      <Button
        type="button"
        register="ui"
        size="sm"
        className="min-h-11"
        data-theater-target="work-profile-apply"
        onClick={onApply}
      >
        <Text>Use this profile</Text>
      </Button>
    </div>
  );
}
