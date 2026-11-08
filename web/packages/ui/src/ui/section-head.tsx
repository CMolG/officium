import { typeClass } from "../lib/type-scale";
import { Text } from "./text";

/*
 * SectionHead -- a product page's section opener (Lib-Chrome): a short rule in the accent, a kicker,
 * and a display title. One style; the accent is the only variable, and it comes from the surface.
 * Taken from Officium's product page when Curriculum's became its second consumer (JAVA-952).
 */

export interface SectionHeadProps {
  kicker: string;
  title: string;
  /** The heading level. A section opener is an `h2` unless the page nests it deeper. */
  as?: "h2" | "h3";
}

export function SectionHead({ kicker, title, as = "h2" }: SectionHeadProps) {
  const Heading = as;
  return (
    <div className="flex flex-col gap-3.5 pt-3">
      <span aria-hidden="true" className="h-1 w-10 rounded-sm bg-[color:var(--jd-accent-mark)]" />
      <Text type="kicker">{kicker}</Text>
      <Heading className={`m-0 text-balance ${typeClass("display-m")}`}>{title}</Heading>
    </div>
  );
}
