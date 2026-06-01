import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuestionEditor } from "./QuestionEditor";
import type { QuestionDto } from "../../../shared/api/contracts";

const choiceQuestion: QuestionDto = {
  id: "choice-1",
  subjectId: "pharmaceutics",
  chapterId: "pharmaceutics-01",
  questionType: "single_choice",
  stem: "选择题示例",
  answer: "A",
  analysis: "解析",
  stemImagePath: null,
  answerImagePath: null,
  analysisImagePath: null,
  options: [
    { label: "A", text: "正确", imagePath: null, isCorrect: true },
    { label: "B", text: "错误", imagePath: null, isCorrect: false }
  ],
  sourceSchool: null,
  sourceYear: null,
  drawn: false
};

const essayQuestion: QuestionDto = {
  ...choiceQuestion,
  id: "essay-1",
  questionType: "essay",
  stem: "论述题示例",
  analysis: null,
  options: []
};

describe("QuestionEditor", () => {
  it("shows options and analysis for choice questions", () => {
    render(<QuestionEditor question={choiceQuestion} mode="read" onEdit={vi.fn()} onCancel={vi.fn()} onSave={vi.fn()} />);

    expect(screen.getByText("选项")).toBeInTheDocument();
    expect(screen.getByLabelText("解析")).toBeInTheDocument();
    expect(screen.getAllByText("正确").length).toBeGreaterThan(0);
  });

  it("shows answer only for essay questions", () => {
    render(<QuestionEditor question={essayQuestion} mode="read" onEdit={vi.fn()} onCancel={vi.fn()} onSave={vi.fn()} />);

    expect(screen.queryByText("选项")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("解析")).not.toBeInTheDocument();
    expect(screen.getByLabelText("答案")).toBeInTheDocument();
  });

  it("exposes edit action in read mode", () => {
    const onEdit = vi.fn();
    render(<QuestionEditor question={choiceQuestion} mode="read" onEdit={onEdit} onCancel={vi.fn()} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "编辑" }));

    expect(onEdit).toHaveBeenCalled();
  });
});
