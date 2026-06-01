import type { ReactNode } from "react";
import type { BankSummaryDto, QuestionDto, QuestionTypeDto } from "../../../shared/api/contracts";
import { BatchActionBar } from "../../../shared/components/BatchActionBar";
import { VirtualQuestionList } from "../../../shared/components/VirtualQuestionList";
import { QuestionSummaryRail } from "./QuestionSummaryRail";

type BatchAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
};

type BankQuestionListPaneProps = {
  summary: BankSummaryDto;
  selectedType: QuestionTypeDto | null;
  onSelectType: (type: QuestionTypeDto | null) => void;
  importMessage: string;
  exportMessage: string;
  selectedIds: Set<string>;
  batchActions: BatchAction[];
  questions: QuestionDto[];
  totalCount: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onClearSelection: () => void;
  onToggleQuestion: (questionId: string) => void;
  onOpenQuestion: (questionId: string) => void;
  renderActions: (question: QuestionDto) => ReactNode;
};

export function BankQuestionListPane({
  summary,
  selectedType,
  onSelectType,
  importMessage,
  exportMessage,
  selectedIds,
  batchActions,
  questions,
  totalCount,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onClearSelection,
  onToggleQuestion,
  onOpenQuestion,
  renderActions
}: BankQuestionListPaneProps) {
  return (
    <>
      <QuestionSummaryRail summary={summary} selectedType={selectedType} onSelectType={onSelectType} />
      {importMessage ? <div className="selection-toolbar">{importMessage}</div> : null}
      {exportMessage ? <div className="selection-toolbar">{exportMessage}</div> : null}
      <BatchActionBar selectedCount={selectedIds.size} actions={batchActions} onClear={onClearSelection} />
      {questions.length === 0 && !hasMore ? (
        <div className="inspector-empty">暂无题目</div>
      ) : (
        <VirtualQuestionList
          questions={questions}
          totalCount={totalCount}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          selectedIds={selectedIds}
          selectionMode="checkbox"
          onToggle={onToggleQuestion}
          onOpen={onOpenQuestion}
          renderActions={renderActions}
        />
      )}
    </>
  );
}
