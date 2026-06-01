import type { ReactNode } from "react";

type InspectorPanelProps = {
  title?: string;
  children: ReactNode;
};

export function InspectorPanel({ title = "详情", children }: InspectorPanelProps) {
  return (
    <aside className="inspector-panel glass-panel" aria-label={title}>
      {children}
    </aside>
  );
}
