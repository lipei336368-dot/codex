import type { NewQuestionInput, QuestionOptionInput, QuestionTypeDto, UpdateQuestionInput } from "../../shared/api/contracts";

export type QuestionDraft = {
  subjectId: string;
  chapterId: string;
  questionType: QuestionTypeDto;
  stem: string;
  answer: string;
  analysis: string;
  stemImagePath: string | null;
  answerImagePath: string | null;
  analysisImagePath: string | null;
  sourceSchool: string | null;
  sourceYear: string | null;
  options: QuestionOptionInput[];
};

export type DraftValidationResult = { ok: true } | { ok: false; message: string };

export function validateQuestionDraft(draft: QuestionDraft): DraftValidationResult {
  if (!draft.chapterId) {
    return { ok: false, message: "章节不能为空" };
  }

  if (!draft.stem.trim() && !draft.stemImagePath) {
    return { ok: false, message: "题干不能为空" };
  }

  if (isChoiceType(draft.questionType)) {
    const selectedLabels = correctLabels(draft);
    if (draft.questionType === "single_choice" && selectedLabels.length !== 1) {
      return { ok: false, message: "单选题必须选择一个正确答案" };
    }
    if (draft.questionType === "multiple_choice" && selectedLabels.length < 2) {
      return { ok: false, message: "多选题至少选择两个正确答案" };
    }
    if (selectedLabels.some((label) => !optionHasContent(draft.options.find((option) => option.label === label)))) {
      return { ok: false, message: "正确答案对应的选项不能为空" };
    }
    if (filledOptions(draft.options).length < 2) {
      return { ok: false, message: "至少填写两个选项" };
    }
    if (!draft.analysis.trim() && !draft.analysisImagePath) {
      return { ok: false, message: "解析不能为空" };
    }
  } else if (!draft.answer.trim() && !draft.answerImagePath) {
    return { ok: false, message: "答案不能为空" };
  }

  return { ok: true };
}

export function buildQuestionPayload(draft: QuestionDraft): NewQuestionInput {
  const isChoice = isChoiceType(draft.questionType);

  return {
    subjectId: draft.subjectId,
    chapterId: draft.chapterId,
    questionType: draft.questionType,
    stem: draft.stem.trim(),
    answer: isChoice ? correctLabels(draft).join("") || null : textOrNull(draft.answer),
    analysis: isChoice ? textOrNull(draft.analysis) : null,
    stemImagePath: draft.stemImagePath,
    answerImagePath: draft.answerImagePath,
    analysisImagePath: draft.analysisImagePath,
    sourceSchool: draft.sourceSchool,
    sourceYear: draft.sourceYear,
    options: isChoice ? filledOptions(draft.options) : []
  };
}

export function buildQuestionUpdatePayload(id: string, draft: QuestionDraft): UpdateQuestionInput {
  const payload = buildQuestionPayload(draft);
  return {
    id,
    chapterId: payload.chapterId,
    stem: payload.stem,
    answer: payload.answer,
    analysis: payload.analysis,
    stemImagePath: payload.stemImagePath,
    answerImagePath: payload.answerImagePath,
    analysisImagePath: payload.analysisImagePath,
    options: payload.options
  };
}

function isChoiceType(questionType: QuestionTypeDto) {
  return questionType === "single_choice" || questionType === "multiple_choice";
}

function correctLabels(draft: QuestionDraft) {
  return draft.options
    .filter((option) => option.isCorrect)
    .map((option) => option.label)
    .sort();
}

function filledOptions(options: QuestionOptionInput[]) {
  return options
    .filter(optionHasContent)
    .map((option) => ({
      ...option,
      text: textOrNull(option.text ?? "")
    }));
}

function optionHasContent(option: QuestionOptionInput | undefined): option is QuestionOptionInput {
  return Boolean(option?.text?.trim() || option?.imagePath);
}

function textOrNull(value: string) {
  const text = value.trim();
  return text ? text : null;
}
