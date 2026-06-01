import { describe, expect, it } from "vitest";
import { buildQuestionPayload, validateQuestionDraft, type QuestionDraft } from "./questionDraft";

const baseDraft: QuestionDraft = {
  subjectId: "pharmaceutics",
  chapterId: "pharmaceutics-01",
  questionType: "single_choice",
  stem: "片剂崩解时限检查的意义是什么？",
  answer: "",
  analysis: "解析内容",
  stemImagePath: null,
  answerImagePath: null,
  analysisImagePath: null,
  sourceSchool: null,
  sourceYear: null,
  options: [
    { label: "A", text: "检查释药前置质量", imagePath: null, isCorrect: true },
    { label: "B", text: "检查包装质量", imagePath: null, isCorrect: false },
    { label: "C", text: "", imagePath: null, isCorrect: false }
  ]
};

describe("question draft validation", () => {
  it("requires one correct option for single choice", () => {
    const draft = {
      ...baseDraft,
      options: baseDraft.options.map((option) => ({ ...option, isCorrect: false }))
    };

    expect(validateQuestionDraft(draft)).toEqual({ ok: false, message: "单选题必须选择一个正确答案" });
  });

  it("requires at least two correct options for multiple choice", () => {
    const draft: QuestionDraft = {
      ...baseDraft,
      questionType: "multiple_choice",
      options: [
        { label: "A", text: "正确项", imagePath: null, isCorrect: true },
        { label: "B", text: "干扰项", imagePath: null, isCorrect: false }
      ]
    };

    expect(validateQuestionDraft(draft)).toEqual({ ok: false, message: "多选题至少选择两个正确答案" });
  });

  it("requires selected choice options to have text or an image", () => {
    const draft: QuestionDraft = {
      ...baseDraft,
      options: [
        { label: "A", text: "有效选项", imagePath: null, isCorrect: false },
        { label: "B", text: "", imagePath: null, isCorrect: true }
      ]
    };

    expect(validateQuestionDraft(draft)).toEqual({ ok: false, message: "正确答案对应的选项不能为空" });
  });

  it("requires answer text or image for short answer questions", () => {
    const draft: QuestionDraft = {
      ...baseDraft,
      questionType: "short_answer",
      answer: "   ",
      options: []
    };

    expect(validateQuestionDraft(draft)).toEqual({ ok: false, message: "答案不能为空" });
  });

  it("builds a choice payload with answer letters from correct options", () => {
    const payload = buildQuestionPayload(baseDraft);

    expect(payload.answer).toBe("A");
    expect(payload.options).toEqual([
      { label: "A", text: "检查释药前置质量", imagePath: null, isCorrect: true },
      { label: "B", text: "检查包装质量", imagePath: null, isCorrect: false }
    ]);
  });

  it("builds a short-answer payload without options or analysis", () => {
    const draft: QuestionDraft = {
      ...baseDraft,
      questionType: "short_answer",
      answer: " 应从处方、工艺和质量控制角度作答。 ",
      analysis: "不会保存到简答论述题",
      options: []
    };

    const payload = buildQuestionPayload(draft);

    expect(payload.answer).toBe("应从处方、工艺和质量控制角度作答。");
    expect(payload.analysis).toBeNull();
    expect(payload.options).toEqual([]);
  });
});
