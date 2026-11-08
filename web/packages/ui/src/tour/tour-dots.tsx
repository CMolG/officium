import { cn } from "../lib/cn";

/** Progress as dots, the current one long. Decorative: the card's header already says "2 of 5". */
export function TourDots({ index, total }: { index: number; total: number }) {
  return (
    <span aria-hidden="true" className="flex flex-row items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          className={cn(
            "block h-1.5 rounded-[3px] transition-[width,background-color] duration-[var(--jd-dur-fast)]",
            i === index ? "w-4 bg-[color:var(--jd-ink)]" : "w-1.5 bg-[color:var(--jd-line)]",
          )}
        />
      ))}
    </span>
  );
}
