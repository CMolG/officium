"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button, Input, Label, Text } from "@javadaba/ui";

import { DEFAULT_ROLE_MATRIX } from "../../lib/backlog/role-config";
import { changedCells, overridesFrom } from "../../lib/backlog/role-matrix";
import { useCopy } from "../../lib/i18n/use-copy";
import { applyCellChange } from "../../lib/profiles/cell-change";
import { getProfilesClient, isConflict } from "../../lib/profiles/profiles-client";
import type { ProfileView } from "../../lib/profiles/profile-types";
import { useProfileDraft } from "../../lib/profiles/use-profile-draft";
import { CATEGORY_ROWS } from "../backlog/matrix-rows";
import { CellMatrix } from "./CellMatrix";

interface Props {
  /** The profile to edit, or null to create one. */
  profileId: string | null;
  onSaved: (profile: ProfileView) => void;
  onClose: () => void;
}

const slug = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);

/**
 * A work profile's cells (card://JAVA-1524), edited in place (JAVA-1627: a region of the Work Profile
 * page, not a dialog): for each category and phase, the roles, model and effort, edited with the
 * matrix's own cell editor and saved together. What is sent is only the cells that differ from what
 * the profile had, so another cell somebody changed meanwhile is never overwritten; a stale profile is
 * refused and read again.
 */
export function ProfileEditorPanel({ profileId, onSaved, onClose }: Props) {
  const copy = useCopy().workProfile;
  const client = getProfilesClient();
  const { saved, setSaved, draft, setDraft, name, setName, error, setError } = useProfileDraft(profileId, copy.profileReadFailed);
  const [busy, setBusy] = useState(false);
  const nameId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Opening moves focus to the editor's heading, as an opened cell's editor does (JAVA-1627).
  useEffect(() => headingRef.current?.focus(), []);

  const loading = profileId !== null && saved === null && error === null;
  // A profile that could not be read is never edited from a blank form: saving one would write over it.
  const unreadable = profileId !== null && saved === null && error !== null;
  const id = profileId ?? slug(name);
  const pending = changedCells(draft, saved?.matrix ?? DEFAULT_ROLE_MATRIX);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const result = await client.upsert(id, {
        expectedVersion: saved?.version ?? 0,
        name: name.trim(),
        overrides: overridesFrom(draft, saved?.matrix ?? DEFAULT_ROLE_MATRIX),
      });
      if (isConflict(result) && profileId === null) {
        // A new profile's id comes from its name: a conflict means the name is taken, and the draft is kept.
        setError(copy.nameTaken);
        return;
      }
      if (isConflict(result)) {
        if (result.current) {
          setSaved(result.current);
          setDraft(result.current.matrix);
        }
        setError(copy.profileConflict(result.message));
        return;
      }
      onSaved(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : copy.profileSaveFailed);
    } finally {
      setBusy(false);
    }
  }

  const missing = !name.trim() ? copy.nameMissing : !id ? copy.nameInvalid : null;

  return (
    <section
      data-testid="profile-editor"
      aria-labelledby={`${nameId}-title`}
      className="flex flex-col gap-4 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${nameId}-title`} ref={headingRef} tabIndex={-1} className="text-sm font-bold outline-none">
          {profileId ? copy.customizeNamed(saved?.name ?? copy.profileFallback) : copy.newWorkProfile}
        </h2>
        <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
          {copy.profileHint}
        </Text>
      </div>
      {unreadable ? null : loading ? (
        <Text role="status" className="text-sm">{copy.loadingProfile}</Text>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <Label htmlFor={nameId}>{copy.nameLabel}</Label>
            <Input id={nameId} value={name} maxLength={80} disabled={saved?.builtin}
              aria-describedby={saved?.builtin ? `${nameId}-builtin` : undefined}
              onChange={(e) => setName(e.target.value)} />
            {saved?.builtin && (
              <Text id={`${nameId}-builtin`} className="text-xs text-[color:var(--jd-muted)]">
                {copy.builtinName}
              </Text>
            )}
          </div>
          <CellMatrix
            sections={[{ rows: CATEGORY_ROWS }]}
            draft={draft}
            base={DEFAULT_ROLE_MATRIX}
            baseName={copy.defaults}
            markCustom={false}
            editable
            foldAlways
            onChange={(change) => setDraft((current) => applyCellChange(current, change))}
          />
        </>
      )}
      {error && (
        <Text role="alert" className="block rounded-[var(--radius-jd-md)] bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {error}
        </Text>
      )}
      {/* Wraps by content, not by breakpoint: the sidebar is resizable, so the room is not the viewport's (JAVA-1773). */}
      <div className="flex flex-row flex-wrap items-center gap-3">
        {!loading && !unreadable && (
          <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
            {missing && <Text className="text-xs text-[color:var(--jd-muted)]">{missing}</Text>}
            <Text data-testid="profile-editor-pending" className="text-xs font-medium text-[color:var(--jd-muted)]">
              {pending === 0 ? copy.pendingNone : pending === 1 ? copy.pendingOne : copy.pendingMany(pending)}
            </Text>
          </div>
        )}
        <div className="flex min-w-0 max-w-full flex-row flex-wrap gap-2">
          <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11" disabled={busy} onClick={onClose}>
            <Text>{copy.cancel}</Text>
          </Button>
          <Button type="button" register="ui" size="sm" className="min-h-11" disabled={busy || loading || unreadable || missing !== null}
            aria-busy={busy || undefined} onClick={() => void save()}>
            <Text>{busy ? copy.savingProfile : copy.saveProfile}</Text>
          </Button>
        </div>
      </div>
    </section>
  );
}
