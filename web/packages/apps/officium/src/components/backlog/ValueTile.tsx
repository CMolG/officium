/** One figure of the value report: the month's, and last month's beside it (card://JAVA-1047). */
export function ValueTile({
  label,
  value,
  before,
  missing = "Not available",
}: {
  label: string;
  value: string | null;
  before: string | null;
  missing?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 basis-0 flex-col gap-1 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-4">
      <p className="text-xs font-semibold text-[color:var(--jd-muted)]">{label}</p>
      {value === null ? (
        <p className="text-sm text-[color:var(--jd-muted)]">{missing}</p>
      ) : (
        <p className="text-2xl font-bold">{value}</p>
      )}
      {before === null ? null : <p className="text-xs text-[color:var(--jd-muted)]">Last month: {before}</p>}
    </div>
  );
}
