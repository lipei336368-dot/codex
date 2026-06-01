import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { QuestionDto } from "../api/contracts";
import { VirtualQuestionList } from "./VirtualQuestionList";

const questions: QuestionDto[] = Array.from({ length: 120 }, (_, index) => ({
  id: `q-${index}`,
  subjectId: "pharmaceutics",
  chapterId: "pharmaceutics-01",
  questionType: "single_choice",
  stem: `题目 ${index}`,
  answer: "A",
  analysis: "解析",
  stemImagePath: null,
  answerImagePath: null,
  analysisImagePath: null,
  options: [],
  sourceSchool: null,
  sourceYear: null,
  drawn: false
}));

describe("VirtualQuestionList", () => {
  it("keeps row click selection as the default mode", () => {
    const onToggle = vi.fn();
    const onOpen = vi.fn();

    render(
      <VirtualQuestionList questions={questions} selectedIds={new Set(["q-1"])} onToggle={onToggle} onOpen={onOpen} />
    );

    expect(screen.getByText("题目 0")).toBeInTheDocument();
    expect(screen.getByText("题目 1")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "选择 题目 1" })).not.toBeInTheDocument();
    expect(screen.getAllByText("可用").length).toBeGreaterThan(0);

    const row = screen.getByText("题目 1").closest(".virtual-question-row") as HTMLElement;
    expect(row).toHaveClass("virtual-question-row-selected");

    fireEvent.click(row);
    expect(onToggle).toHaveBeenCalledWith("q-1");

    fireEvent.doubleClick(row);
    expect(onOpen).toHaveBeenCalledWith("q-1");
  });

  it("selects a row only from the checkbox when selectionMode is checkbox", () => {
    const onToggle = vi.fn();
    const onOpen = vi.fn();

    render(
      <VirtualQuestionList
        questions={[questions[1]]}
        selectedIds={new Set()}
        selectionMode="checkbox"
        onToggle={onToggle}
        onOpen={onOpen}
        renderActions={() => null}
      />
    );

    fireEvent.click(screen.getByText("题目 1"));
    expect(onToggle).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: "选择 题目 1" }));
    expect(onToggle).toHaveBeenCalledWith("q-1");
  });

  it("hides selection checkbox for drawn questions and exposes reset action", () => {
    const drawnQuestion = { ...questions[1], drawn: true };
    const onReset = vi.fn();

    render(
      <VirtualQuestionList
        questions={[drawnQuestion]}
        selectedIds={new Set()}
        selectionMode="checkbox"
        onToggle={vi.fn()}
        onOpen={vi.fn()}
        renderActions={(question) => (
          <button type="button" onClick={() => onReset(question.id)}>
            重置
          </button>
        )}
      />
    );

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("已抽取")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重置" }));
    expect(onReset).toHaveBeenCalledWith(drawnQuestion.id);
  });
});
