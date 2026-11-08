"use client";

/**
 * Live editing with others (JAVA-803) speaks up only when it is NOT working. While it works it says nothing (JAVA-1552):
 * a "Live" label read as "this page is published", which is not what it meant; a draft says Draft instead. When it is
 * down it says what it costs the person, which is nothing: they can still write (Doc-Edit, "The live room").
 */
export function DocRoomStatus({ unavailable }: { active: boolean; unavailable: boolean }) {
  if (!unavailable) return null;
  return (
    <span data-testid="doc-room-status" className="flex flex-col text-xs leading-tight text-[color:var(--jd-muted)]">
      <b className="font-semibold text-[color:var(--jd-ink)]">Live editing unavailable</b>
      <span>You can still write; changes merge when you save.</span>
    </span>
  );
}
