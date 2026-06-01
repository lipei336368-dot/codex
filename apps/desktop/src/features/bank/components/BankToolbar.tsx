import { Toolbar } from "../../../shared/components/Toolbar";
import type { ToolbarAction } from "../../../shared/components/Toolbar";

type BankToolbarProps = {
  query: string;
  actions: ToolbarAction[];
  onQueryChange: (query: string) => void;
};

export function BankToolbar({ query, actions, onQueryChange }: BankToolbarProps) {
  return (
    <Toolbar
      title="题库"
      searchValue={query}
      searchPlaceholder="搜索题干"
      onSearchChange={onQueryChange}
      actions={actions}
    />
  );
}
