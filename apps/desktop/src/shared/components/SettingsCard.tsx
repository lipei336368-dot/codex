import type { ReactNode } from "react";

type SettingsCardProps = {
  title: string;
  value?: ReactNode;
  children?: ReactNode;
};

export function SettingsCard({ title, value, children }: SettingsCardProps) {
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <h3>{title}</h3>
        {value ? <div className="settings-card-value">{value}</div> : null}
      </div>
      {children ? <div className="settings-card-body">{children}</div> : null}
    </section>
  );
}
