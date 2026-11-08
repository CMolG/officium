import type { ReactNode } from "react";

export function Notice({
  title,
  actions,
  children,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="theater__notice" role="status">
      <strong>{title}</strong>
      {children}
      {actions ? <div className="theater__notice-actions">{actions}</div> : null}
    </div>
  );
}
