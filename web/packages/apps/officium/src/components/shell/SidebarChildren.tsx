import type { ReactNode } from "react";

/** What a node holds, indented under a rule: a folder's projects, a project's views. */
export function SidebarChildren({ rail, children }: { rail: boolean; children: ReactNode }) {
  return (
    <div className={`officium-rise flex flex-col gap-0.5 border-l border-[color:var(--jd-line)] ${rail ? "ml-0.5 pl-0.5" : "ml-3 pl-3"}`}>
      {children}
    </div>
  );
}
