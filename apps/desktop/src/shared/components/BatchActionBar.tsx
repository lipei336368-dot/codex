import { Button } from "./Button";
import type { ToolbarAction } from "./Toolbar";

type BatchActionBarProps = {
  selectedCount: number;
  actions: ToolbarAction[];
  onClear?: () => void;
};

export function BatchActionBar({ selectedCount, actions, onClear }: BatchActionBarProps) {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="batch-action-bar glass-panel" role="toolbar" aria-label="批量操作">
      <strong>已选 {selectedCount}</strong>
      <div className="batch-action-buttons">
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
        {onClear ? (
          <Button variant="ghost" onClick={onClear}>
            取消选择
          </Button>
        ) : null}
      </div>
    </div>
  );
}
