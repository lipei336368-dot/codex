import type { BankSummaryDto, QuestionTypeDto } from "../../../shared/api/contracts";

type QuestionSummaryRailProps = {
  summary: BankSummaryDto;
  selectedType: QuestionTypeDto | null;
  onSelectType: (questionType: QuestionTypeDto | null) => void;
};

const cards: Array<{
  label: string;
  value: QuestionTypeDto | null;
  count: (summary: BankSummaryDto) => number;
  available: (summary: BankSummaryDto) => number;
}> = [
  { label: "全部", value: null, count: (summary) => summary.total, available: (summary) => summary.available },
  {
    label: "选择题",
    value: "single_choice",
    count: (summary) => summary.byType.singleChoice,
    available: (summary) => summary.availableByType.singleChoice
  },
  {
    label: "多选题",
    value: "multiple_choice",
    count: (summary) => summary.byType.multipleChoice,
    available: (summary) => summary.availableByType.multipleChoice
  },
  {
    label: "简答论述题",
    value: "short_answer",
    count: (summary) => summary.byType.shortAnswer + summary.byType.essay,
    available: (summary) => summary.availableByType.shortAnswer + summary.availableByType.essay
  }
];

export function QuestionSummaryRail({ summary, selectedType, onSelectType }: QuestionSummaryRailProps) {
  return (
    <div className="question-summary-rail">
      {cards.map((card) => (
        <button
          key={card.label}
          type="button"
          className={selectedType === card.value ? "summary-card active" : "summary-card"}
          onClick={() => onSelectType(card.value)}
        >
          <span>{card.label}</span>
          <strong>总数 {card.count(summary)}</strong>
          <small>可用 {card.available(summary)}</small>
        </button>
      ))}
    </div>
  );
}
