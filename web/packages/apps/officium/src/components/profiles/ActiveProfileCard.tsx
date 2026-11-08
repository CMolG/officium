"use client";

import { useRef, useState } from "react";
import { Gauge } from "lucide-react";

import { Badge, Button, Note, Panel, Select, Text } from "@javadaba/ui";

import { useCopy } from "../../lib/i18n/use-copy";
import { SectionHeading } from "../backlog/SectionHeading";
import { PLAN_LOCKED_ID } from "./PlanLockedNotice";
import { ProfileEditorPanel } from "./ProfileEditorPanel";
import { ShuffleToggle } from "./ShuffleToggle";
import { DEFAULTS, useActiveProfile } from "./use-active-profile";

/**
 * Which work profile this project's agents run on (card://JAVA-1524): Claude Standard, Claude Eco or one of the
 * owner's own, each a set of models and efforts per kind of card and phase. The owner switches it here; everyone
 * else sees which one is active, and why they cannot change it. The project's own cells, below, still win.
 */
export function ActiveProfileCard({ projectId, onActivated }: { projectId: string; onActivated: () => void }) {
  const copy = useCopy().workProfile;
  const { client, view, setView, owner, choice, setChoice, error, setError, load } = useActiveProfile(projectId, copy.readFailed);
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  // The button that opened the profile editor: it takes focus back when the editor closes.
  const opener = useRef<HTMLButtonElement | null>(null);

  const activeId = view?.profiles.find((p) => p.active)?.id ?? DEFAULTS;

  async function activate() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const next = await client.activate(projectId, choice === DEFAULTS ? null : choice);
      setView(next);
      setStatus(copy.activated(next.active?.name ?? copy.defaults));
      onActivated();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : copy.switchFailed);
    } finally {
      setBusy(false);
    }
  }

  function openEditor(next: string | null, button: HTMLButtonElement) {
    opener.current = button;
    setStatus(null);
    setEditing(next);
  }

  function closeEditor() {
    setEditing(undefined);
    opener.current?.focus();
  }

  return (
    <Panel as="section" material="plain" radius="lg" aria-label={copy.workProfileLabel} data-testid="work-profile-panel" className="flex flex-col gap-3 p-4">
      <SectionHeading icon={<Gauge size={16} />}>{copy.workProfileLabel}</SectionHeading>
      <Text className="text-sm text-[color:var(--jd-muted)]">
        {copy.panelIntro}
      </Text>
      {error && (
        <Note tone="danger" role="alert" className="items-center">
          <div className="flex flex-row flex-wrap items-center gap-3">
            <Text className="min-w-0 flex-1 text-sm font-medium">{error}</Text>
            <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11" onClick={() => void load()}>
              <Text>{copy.tryAgain}</Text>
            </Button>
          </div>
        </Note>
      )}
      {!view && !error ? (
        <Text role="status" className="text-sm">{copy.loading}</Text>
      ) : view && (
        <>
          <div className="flex flex-row flex-wrap items-center gap-2">
            <Text data-testid="active-profile" className="text-sm">
              {copy.active}: <strong>{view.active?.name ?? copy.defaults}</strong>
              {view.active && !view.active.yours && ` · ${copy.setByOther}`}
            </Text>
            {view.profiles.find((p) => p.id === view.active?.profileId)?.builtin && (
              <Badge register="tag" tone="neutral" fill="subtle" size="xs">
                {copy.builtin}
              </Badge>
            )}
          </div>
          {status && <Text role="status" className="text-sm font-medium">{status}</Text>}
          {owner && (
          <div className="flex flex-row flex-wrap items-center gap-2">
            <Select
              aria-label={copy.workProfileLabel}
              value={choice}
              onChange={setChoice}
              options={[
                { value: DEFAULTS, label: copy.defaults, description: copy.defaultsHint },
                ...view.profiles.map((p) => ({ value: p.id, label: p.name, description: p.builtin ? (p.customized ? copy.builtinEdited : copy.builtin) : copy.yours })),
              ]}
              className="min-h-11 w-full min-w-0 justify-between sm:w-auto sm:flex-1"
            />
            <Button type="button" register="ui" size="sm" className="min-h-11" disabled={busy || choice === activeId}
              aria-busy={busy || undefined} title={choice === activeId ? copy.alreadyActive : undefined} onClick={() => void activate()}>
              <Text>{busy ? copy.switching : copy.useProfile}</Text>
            </Button>
            <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11" disabled={choice === DEFAULTS || !view.editable}
              aria-describedby={view.editable ? undefined : PLAN_LOCKED_ID} onClick={(event) => openEditor(choice, event.currentTarget)}>
              <Text>{copy.customize}</Text>
            </Button>
            <Button type="button" register="ui" size="sm" variant="ghost" className="min-h-11" disabled={!view.editable}
              aria-describedby={view.editable ? undefined : PLAN_LOCKED_ID} onClick={(event) => openEditor(null, event.currentTarget)}>
              <Text>{copy.newProfile}</Text>
            </Button>
          </div>
          )}
          <ShuffleToggle projectId={projectId} view={view} owner={owner} client={client} onChanged={(next) => {
            setView(next);
            onActivated();
          }} />
          {!owner && <Text className="text-xs text-[color:var(--jd-muted)]">{copy.ownerOnly}</Text>}
        </>
      )}
      {editing !== undefined && (
        <ProfileEditorPanel
          profileId={editing}
          onSaved={(profile) => {
            setChoice(profile.id);
            setStatus(copy.saved(profile.name));
            void load().then(() => setChoice(profile.id));
            if (profile.id === activeId) onActivated();
          }}
          onClose={closeEditor}
        />
      )}
    </Panel>
  );
}
