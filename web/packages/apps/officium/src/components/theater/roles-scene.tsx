"use client";

import type { ReactNode } from "react";
import { Gauge } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

import { SectionHeading } from "../backlog/SectionHeading";
import { ROLES_CARDS, LINEAR_PROOF } from "./roles-script";
import { RolesProfileBar } from "./roles-profile-bar";
import { RolesTile } from "./roles-tile";
import { useRolesScript } from "./use-roles-script";

/**
 * The work-profile scene: one bento, a profile at the top, the six cards below it, the proof at
 * the foot. The root is a container, so the tiles' columns follow the frame the scene is drawn in
 * (the landing's 1120 and 360), not the host's width.
 */
export function RolesScene() {
  const script = useRolesScript();
  let grid: ReactNode;
  if (script.cards) {
    grid = (
      <ul aria-label="Cards and the AI that works them" className="-mx-2 flex flex-row flex-wrap">
        {script.cards.map((card) => (
          <RolesTile
            key={card.key}
            card={card}
            was={script.baseline?.[card.key] ?? null}
          />
        ))}
      </ul>
    );
  } else if (script.error) {
    grid = (
      <div className="flex flex-col items-start gap-2">
        <Text role="alert" className="text-sm font-medium">
          {script.error}
        </Text>
        <Button type="button" register="ui" size="sm" className="min-h-11" onClick={() => void script.reload()}>
          <Text>Try again</Text>
        </Button>
      </div>
    );
  } else {
    grid = (
      <ul aria-busy="true" aria-label="Loading the cards" className="-mx-2 flex flex-row flex-wrap">
        {ROLES_CARDS.map((key) => (
          <li key={key} aria-hidden="true" className="w-full p-2 @2xl:w-1/2 @4xl:w-1/3">
            <div className="h-28 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-line)]" />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="@container flex h-full min-h-0 flex-col gap-4 p-4">
      <section aria-label="Work profile" className="flex flex-col gap-2">
        <SectionHeading icon={<Gauge size={16} />}>Work profile</SectionHeading>
        <Text className="text-sm text-[color:var(--jd-muted)]">
          The models and efforts this project&apos;s agents work with, per kind of card and phase.
        </Text>
        <RolesProfileBar
          choice={script.choice}
          onChoose={script.setChoice}
          onApply={() => void script.apply()}
        />
      </section>
      <div className="min-h-0 flex-1 overflow-y-auto">{grid}</div>
      <p className="text-xs text-[color:var(--jd-muted)]">{LINEAR_PROOF.sentence}</p>
    </div>
  );
}
