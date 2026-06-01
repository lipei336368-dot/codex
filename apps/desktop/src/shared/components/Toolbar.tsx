import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Button } from "./Button";

export type ToolbarAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  icon?: ReactNode;
};

type ToolbarProps = {
  title: string;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  actions?: ToolbarAction[];
};

export function Toolbar({
  title,
  searchValue,
  searchPlaceholder = "搜索",
  onSearchChange,
  actions = []
}: ToolbarProps) {
  return (
    <header className="toolbar">
      <h2>{title}</h2>
      {onSearchChange ? (
        <label className="toolbar-search">
          <Search size={16} />
          <input
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={searchValue ?? ""}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      ) : null}
      <div className="toolbar-actions">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant ?? "secondary"}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
    </header>
  );
}
