import { cn } from "../lib/cn";

/*
 * ProgressSteps — a stepped progress (Lib-Display § Progress · Stepped): one segment per stage and
 * its name under it. Done stages fill with ink, the stage under way is named in the ink, and the
 * ones still to come are named in the faint ink, so a step is read by position and weight, not color.
 */

export interface ProgressStepsProps {
  /** The stages, in order: "Outline", "Draft", "Judged"... */
  steps: readonly string[];
  /** How many stages are done. The next one is the stage under way. */
  done: number;
  /** Names the list for assistive tech. */
  "aria-label": string;
  className?: string;
}

export function ProgressSteps({ steps, done, className, ...rest }: ProgressStepsProps) {
  const current = Math.min(done, steps.length - 1);
  return (
    <ol
      aria-label={rest["aria-label"]}
      className={cn("m-0 grid list-none gap-1.5 p-0", className)}
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((name, index) => {
        const finished = index < done;
        return (
          <li key={name} aria-current={index === current && done < steps.length ? "step" : undefined} className="flex flex-col gap-2">
            <span
              aria-hidden="true"
              className={cn("h-2.5 rounded-[5px]", finished ? "bg-[color:var(--jd-ink)]" : "bg-[color:var(--jd-ink)]/10")}
            />
            <span
              className={cn(
                "text-xs",
                index <= current && done < steps.length ? "font-semibold text-[color:var(--jd-ink)]" : "",
                finished ? "text-[color:var(--jd-ink)]" : "text-[color:var(--jd-faint)]",
              )}
            >
              <span className="sr-only">{finished ? "Done: " : index === current ? "In progress: " : "Next: "}</span>
              {name}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
