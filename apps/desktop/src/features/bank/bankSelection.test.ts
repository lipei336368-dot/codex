import { describe, expect, it } from "vitest";
import type { QuestionDto } from "../../shared/api/contracts";
import { availableQuestionIds, getSelectedAvailableQuestions, reconcileSelectedIds } from "./bankSelection";

const questions = [question("q1", false), question("q2", true), question("q3", false)];

describe("bank selection helpers", () => {
  it("returns only not-drawn IDs", () => {
    expect(availableQuestionIds(questions)).toEqual(["q1", "q3"]);
  });

  it("removes IDs that are drawn or no longer visible", () => {
    const selected = new Set(["q1", "q2", "missing"]);

    expect([...reconcileSelectedIds(selected, questions)]).toEqual(["q1"]);
  });

  it("returns selected available questions in visible order", () => {
    const selected = new Set(["q3", "q1", "q2"]);

    expect(getSelectedAvailableQuestions(questions, selected).map((item) => item.id)).toEqual(["q1", "q3"]);
  });
});

function question(id: string, drawn: boolean): QuestionDto {
  return {
    id,
    subjectId: "pharmaceutics",
    chapterId: "pharmaceutics-chapter-1",
    questionType: "single_choice",
    stem: id,
    answer: "A",
    analysis: null,
    stemImagePath: null,
    answerImagePath: null,
    analysisImagePath: null,
    options: [],
    sourceSchool: null,
    sourceYear: null,
    drawn
  };
}
