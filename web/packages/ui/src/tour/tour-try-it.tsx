import { Glyph } from "../ui/glyph";

/**
 * The optional action a step asks for ("Try it: drag a Container onto the canvas"). When the
 * person does it the line turns to a tick and the tour moves on; Next always works too.
 */
export function TourTryIt({ lead, label, done }: { lead: string; label: string; done: boolean }) {
  return (
    <div className="flex flex-row items-center gap-2 rounded-[10px] bg-[color:var(--jd-card)] px-2.5 py-2 text-[12.5px] font-semibold">
      {done ? (
        <Glyph name="check-circle" size={16} className="shrink-0" />
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <path d="M9 3v12l3-2.5 2.5 5 2-1-2.5-5H18z" />
        </svg>
      )}
      <span>{`${lead} ${label}`}</span>
    </div>
  );
}
