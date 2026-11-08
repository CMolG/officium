import { useEffect, useRef, useState } from "react";
import { Button, Input, Note, Text } from "@javadaba/ui";

import type { OrganizationProfile } from "../../lib/backlog/types";

const RENAME_ERRORS: Record<string, string> = {
  organization_name_invalid: "Use 2 to 60 characters, with no control characters.",
};

/**
 * The page heading: the organization's name, renamed inline by its owner (JAVA-1780). Renaming is
 * reversible, so there is no confirmation: Cancel and Escape cost the same as opening.
 */
export function OrganizationHeading({
  profile,
  failed,
  onRename,
}: {
  profile: OrganizationProfile | null;
  failed: boolean;
  onRename: (name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const renameButton = useRef<HTMLButtonElement>(null);
  const returning = useRef(false);

  // Focus goes back to the Rename button once the form closes, whether it was saved or cancelled.
  useEffect(() => {
    if (!editing && returning.current) {
      returning.current = false;
      renameButton.current?.focus();
    }
  }, [editing]);

  const value = draft.trim().replace(/\s+/g, " ");
  const valid = value.length >= 2 && value.length <= 60;
  const changed = profile !== null && value !== profile.name;

  function open() {
    setDraft(profile?.name ?? "");
    setError(null);
    setNotice(null);
    setEditing(true);
  }

  function close() {
    returning.current = true;
    setEditing(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onRename(value);
      setNotice(`Renamed to “${value}”.`);
      close();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(RENAME_ERRORS[code] ?? "Couldn't rename the organization. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (editing && profile) {
    return (
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (changed && valid && !saving) void save();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            aria-label="Organization name"
            autoFocus
            value={draft}
            maxLength={60}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            className="min-w-0 sm:max-w-md"
          />
          <div className="flex flex-row gap-2">
            <Button type="submit" register="ui" size="sm" disabled={!changed || !valid || saving}>
              {saving ? "Saving…" : "Save name"}
            </Button>
            <Button type="button" register="ui" variant="ghost" size="sm" onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
        <p className="m-0 text-xs text-[color:var(--jd-muted)]">{`${value.length} / 60 · 2 to 60 characters.`}</p>
        {error && <Note tone="danger">{error}</Note>}
      </form>
    );
  }

  return (
    <section aria-label="Organization" className="flex flex-col gap-1.5">
      <Text type="kicker" tone="faint">
        Organization
      </Text>
      <div className="flex flex-row flex-wrap items-center gap-3">
        <h2 data-testid="organization-name" className="min-w-0 wrap-anywhere text-lg font-bold">
          {profile?.name ?? "Organization"}
        </h2>
        {profile && (
          <Button ref={renameButton} type="button" register="ui" variant="outline" size="sm" aria-label="Rename organization" onClick={open}>
            Rename organization
          </Button>
        )}
      </div>
      {failed && !profile && <Note tone="danger">Couldn&apos;t load the organization. Reload the page to try again.</Note>}
      {notice && (
        <p role="status" className="m-0 min-w-0 wrap-anywhere text-xs text-[color:var(--jd-muted)]">
          {notice}
        </p>
      )}
    </section>
  );
}
