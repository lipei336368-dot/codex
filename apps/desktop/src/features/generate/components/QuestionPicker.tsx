import type { QuestionDto } from "../../../shared/api/contracts";
import { VirtualQuestionList } from "../../../shared/components/VirtualQuestionList";

type QuestionPickerProps = {
  questions: QuestionDto[];
  selectedIds: Set<string>;
  onToggle: (questionId: string) => void;
  onOpen: (questionId: string) => void;
};

export function QuestionPicker({ questions, selectedIds, onToggle, onOpen }: QuestionPickerProps) {
  if (questions.length === 0) {
    return <div className="inspector-empty">暂无可用题目</div>;
  }

  return <VirtualQuestionList questions={questions} selectedIds={selectedIds} onToggle={onToggle} onOpen={onOpen} />;
}
