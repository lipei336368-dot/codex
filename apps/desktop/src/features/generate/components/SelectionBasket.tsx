import type { QuestionDto } from "../../../shared/api/contracts";
import { Button } from "../../../shared/components/Button";

type SelectionBasketProps = {
  publishDate: string;
  questions: QuestionDto[];
  onRemove: (questionId: string) => void;
  onPreview: () => void;
};

export function SelectionBasket({ publishDate, questions, onRemove, onPreview }: SelectionBasketProps) {
  return (
    <aside className="selection-basket glass-panel" aria-label="选题篮">
      <header>
        <span className="eyebrow">发布日期</span>
        <h2>{publishDate}</h2>
        <strong>{questions.length} 题</strong>
      </header>
      <div className="basket-list">
        {questions.length === 0 ? (
          <span className="generated-history-empty">从左侧题库勾选题目</span>
        ) : (
          questions.map((question, index) => (
            <div key={question.id} className="basket-item">
              <span>{index + 1}</span>
              <strong>{question.stem}</strong>
              <button type="button" onClick={() => onRemove(question.id)}>
                移除
              </button>
            </div>
          ))
        )}
      </div>
      <Button disabled={questions.length === 0} variant="primary" onClick={onPreview}>
        生成预览
      </Button>
    </aside>
  );
}
