"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, FieldError, FieldHelp, Input, Label, Note, Text } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import { ConfigSection } from "../configuration/ConfigSection";

const NICKNAME_ERRORS: Record<string, string> = {
  nickname_taken: "Someone in this organization already goes by that nickname. Try another one.",
  nickname_invalid: "Use 2 to 32 letters, digits, dots, underscores or hyphens, with no spaces.",
};

/**
 * JAVA-199: what you are called here. It is Officium's own -- the rest of Javadaba never sees it -- and it is what
 * tells your agents apart from everyone else's: they write as "Claude Code (nickname)". The preview shows it live.
 */
export function NicknameSection() {
  const repository = useMemo(() => getBacklogRepository(), []);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void repository.getNicknames().then(
      (view) => {
        if (cancelled) return;
        setSaved(view.mine);
        setDraft(view.mine ?? "");
        setLoaded(true);
      },
      () => {
        if (!cancelled) setError("Couldn't load your nickname. Reload the page to try again.");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const value = draft.trim();
  const changed = value !== (saved ?? "");
  const tooShort = value.length === 1;

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const view = await repository.setNickname(value);
      setSaved(view.mine);
      setDraft(view.mine ?? "");
      setNotice(view.mine ? `Saved. Your agents now write as "Claude Code (${view.mine})".` : "Nickname cleared.");
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      setError(NICKNAME_ERRORS[code] ?? "Couldn't save the nickname. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ConfigSection
      title="Your nickname"
      label="Your nickname"
      hint="How this organization sees you, and how your AI agents sign their work here. Only Officium uses it."
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (changed && !saving && !tooShort) void save();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nickname-field">Nickname</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="nickname-field"
              aria-label="Nickname"
              value={draft}
              disabled={!loaded}
              maxLength={32}
              aria-invalid={tooShort || undefined}
              placeholder="e.g. carlos97"
              onChange={(e) => setDraft(e.target.value)}
              className="min-w-0 sm:max-w-xs"
            />
            <Text className="font-mono text-xs text-[color:var(--jd-muted)]">{`${value.length} / 32`}</Text>
          </div>
          <FieldHelp>2 to 32 characters.</FieldHelp>
          {tooShort && <FieldError>Use 2 to 32 characters.</FieldError>}
        </div>
        <Text className="text-sm">
          <span className="text-[color:var(--jd-muted)]">Preview </span>
          <strong>{`Claude Code (${value || saved || "nickname"})`}</strong>
        </Text>
        <div>
          <Button type="submit" register="ui" size="sm" disabled={!loaded || !changed || saving || tooShort}>
            {saving ? "Saving…" : value ? "Save nickname" : "Clear nickname"}
          </Button>
        </div>
      </form>
      {error && <Note tone="danger">{error}</Note>}
      {notice && <Note tone="success" role="status">{notice}</Note>}
    </ConfigSection>
  );
}
