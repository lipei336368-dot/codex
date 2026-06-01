import type { QuestionDto, QuestionOptionInput } from "../../../shared/api/contracts";
import { Button } from "../../../shared/components/Button";
import { TextArea } from "../../../shared/components/TextArea";

type QuestionEditorProps = {
  question: QuestionDto | null;
  mode: "read" | "edit";
  onEdit: () => void;
  onCancel: () => void;
  onSave: (question: QuestionDto) => void;
  showActions?: boolean;
};

const typeLabels = {
  single_choice: "选择题",
  multiple_choice: "多选题",
  short_answer: "简答论述题",
  essay: "简答论述题"
};

export function QuestionEditor({ question, mode, onEdit, onCancel, onSave, showActions = true }: QuestionEditorProps) {
  if (!question) {
    return <div className="inspector-empty">选择一道题查看详情</div>;
  }

  const isChoice = question.questionType === "single_choice" || question.questionType === "multiple_choice";
  const readOnly = mode === "read";

  return (
    <section className="question-editor">
      <header className="inspector-header">
        <span className="question-type-badge">{typeLabels[question.questionType]}</span>
        {showActions ? (
          readOnly ? (
            <Button variant="secondary" onClick={onEdit}>
              编辑
            </Button>
          ) : (
            <Button variant="primary" onClick={() => onSave(question)}>
              保存修改
            </Button>
          )
        ) : null}
      </header>
      <TextArea label="题干" value={question.stem} readOnly={readOnly} minRows={3} maxRows={10} />
      {isChoice ? (
        <>
          <div className="editor-section-title">选项</div>
          <div className="question-editor-options">
            {question.options.map((option: QuestionOptionInput) => (
              <div key={option.label} className="question-editor-option">
                <strong>{option.label}</strong>
                <span>{option.text || option.imagePath || "图片选项"}</span>
                {option.isCorrect ? <em>正确</em> : null}
              </div>
            ))}
          </div>
          <TextArea label="解析" value={question.analysis ?? ""} readOnly={readOnly} minRows={2} maxRows={8} />
        </>
      ) : (
        <TextArea label="答案" value={question.answer ?? ""} readOnly={readOnly} minRows={3} maxRows={12} />
      )}
      {!readOnly && showActions ? (
        <Button variant="ghost" onClick={onCancel}>
          取消
        </Button>
      ) : null}
    </section>
  );
}
