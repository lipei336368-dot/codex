import { describe, expect, it } from "vitest";
import { chooseLayoutPlan } from "./layoutEngine";
import type { ExportQuestionBlock } from "./types";

function block(overrides: Partial<ExportQuestionBlock>): ExportQuestionBlock {
  return {
    id: "q",
    index: 1,
    questionType: "single_choice",
    typeLabel: "选择题",
    stem: "短题干",
    stemImagePath: null,
    options: [
      { label: "A", text: "正确", imagePath: null, isCorrect: true },
      { label: "B", text: "错误", imagePath: null, isCorrect: false }
    ],
    answer: "A",
    answerText: "正确",
    answerImagePath: null,
    analysis: "解析",
    analysisImagePath: null,
    raw: {} as ExportQuestionBlock["raw"],
    ...overrides
  };
}

describe("chooseLayoutPlan", () => {
  it("keeps four normal choice questions compact enough for one sheet", () => {
    const plan = chooseLayoutPlan([block({}), block({ index: 2 }), block({ index: 3 }), block({ index: 4 })], "question");

    expect(["normal", "compact", "dense"]).toContain(plan.density);
    expect(plan.hasImages).toBe(false);
  });

  it("uses ultra density for very long answer sheets", () => {
    const longText = "药剂学考研解析".repeat(180);
    const plan = chooseLayoutPlan([block({ analysis: longText }), block({ index: 2, analysis: longText })], "answer");

    expect(plan.density).toBe("ultra");
  });

  it("uses micro density for extreme long text and image-heavy sheets", () => {
    const longText = "药剂学考研解析".repeat(320);
    const plan = chooseLayoutPlan(
      [
        block({ analysis: longText, answerImagePath: "D:\\answer.png", analysisImagePath: "D:\\analysis.png" }),
        block({ index: 2, analysis: longText, stemImagePath: "D:\\stem.png" })
      ],
      "answer"
    );

    expect(plan.density).toBe("micro");
  });

  it("adds image weight when options contain images", () => {
    const plan = chooseLayoutPlan([
      block({
        options: [
          { label: "A", text: null, imagePath: "D:\\a.png", isCorrect: true },
          { label: "B", text: null, imagePath: "D:\\b.png", isCorrect: false }
        ]
      })
    ], "question");

    expect(plan.hasImages).toBe(true);
    expect(plan.imageScore).toBe(2);
  });
});
