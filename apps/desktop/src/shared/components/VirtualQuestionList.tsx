import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { QuestionDto } from "../api/contracts";

type VirtualQuestionListProps = {
  questions: QuestionDto[];
  totalCount?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  selectedIds: Set<string>;
  onToggle: (questionId: string) => void;
  onOpen: (questionId: string) => void;
  selectionMode?: "row" | "checkbox";
  renderActions?: (question: QuestionDto) => ReactNode;
};

const typeLabels = {
  single_choice: "选择题",
  multiple_choice: "多选题",
  short_answer: "简答论述题",
  essay: "简答论述题"
};

export function VirtualQuestionList({
  questions,
  totalCount = questions.length,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  selectedIds,
  onToggle,
  onOpen,
  selectionMode = "row",
  renderActions
}: VirtualQuestionListProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowCount = Math.max(questions.length, totalCount, hasMore ? questions.length + 1 : questions.length);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    initialRect: { height: 640, width: 800 },
    overscan: 8
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const visibleItems =
    virtualItems.length > 0
      ? virtualItems
      : Array.from({ length: Math.min(rowCount, 20) }, (_, index) => ({
          index,
          key: index,
          start: index * 56
        }));

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem || !hasMore || isLoadingMore || !onLoadMore) {
      return;
    }
    if (lastItem.index >= Math.max(questions.length - 6, 0)) {
      onLoadMore();
    }
  }, [hasMore, isLoadingMore, onLoadMore, questions.length, virtualItems]);

  return (
    <div
      ref={parentRef}
      className="virtual-question-list"
      role="list"
      onScroll={(event) => {
        const target = event.currentTarget;
        const viewportHeight = target.clientHeight || 1;
        const scrollHeight = target.scrollHeight || rowVirtualizer.getTotalSize();
        const nearEnd = target.scrollTop + viewportHeight >= scrollHeight - 240;
        if (nearEnd && hasMore && !isLoadingMore) {
          onLoadMore?.();
        }
      }}
    >
      <div className="virtual-question-list-inner" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {visibleItems.map((virtualRow) => {
          const question = questions[virtualRow.index];
          if (!question) {
            return (
              <div
                key={`loading-${virtualRow.index}`}
                className="virtual-question-row virtual-question-row-loading"
                role="listitem"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                {isLoadingMore ? "正在加载更多..." : "继续加载更多"}
              </div>
            );
          }
          const checkboxMode = selectionMode === "checkbox";
          const selectable = !question.drawn;

          return (
            <div
              key={question.id}
              className={[
                "virtual-question-row",
                selectedIds.has(question.id) ? "virtual-question-row-selected" : "",
                question.drawn ? "virtual-question-row-drawn" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              role="listitem"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
              tabIndex={checkboxMode ? -1 : 0}
              onClick={checkboxMode ? undefined : () => onToggle(question.id)}
              onDoubleClick={() => onOpen(question.id)}
              onKeyDown={(event) => {
                if (!checkboxMode && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onToggle(question.id);
                }
              }}
            >
              <span className="question-row-selector">
                {checkboxMode && selectable ? (
                  <input
                    aria-label={`选择 ${question.stem}`}
                    checked={selectedIds.has(question.id)}
                    onChange={() => onToggle(question.id)}
                    type="checkbox"
                  />
                ) : null}
              </span>
              <span className="question-type-badge">{typeLabels[question.questionType]}</span>
              <span className="virtual-question-stem">{question.stem}</span>
              <span className={question.drawn ? "question-row-status question-row-status-drawn" : "question-row-status"}>
                {question.drawn ? "已抽取" : "可用"}
              </span>
              <span className="question-row-actions">{renderActions?.(question)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
