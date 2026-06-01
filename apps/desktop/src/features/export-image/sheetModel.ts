import type { SubjectId } from "../../app/store";
import type { QuestionDto, QuestionTypeDto } from "../../shared/api/contracts";
import { chooseLayoutPlan } from "./layoutEngine";
import type { ExportSheetModel, ExportSheetTheme, SheetKind } from "./types";

const typeLabels: Record<QuestionTypeDto, string> = {
  single_choice: "选择题",
  multiple_choice: "多选题",
  short_answer: "简答论述题",
  essay: "简答论述题"
};

const shortTitles: Record<SubjectId, string> = {
  pharmaceutics: "药剂学",
  pharmacology: "药理学",
  medicinal_chemistry: "药物化学",
  pharmaceutical_analysis: "药物分析"
};

type BuildExportSheetModelInput = {
  kind: SheetKind;
  questions: QuestionDto[];
  subjectId: SubjectId;
  publishDate: string;
  examDate: string;
  theme: ExportSheetTheme;
};

export function buildExportSheetModel(input: BuildExportSheetModelInput): ExportSheetModel {
  const questions = input.questions.map((question, questionIndex) => ({
    id: question.id,
    index: questionIndex + 1,
    questionType: question.questionType,
    typeLabel: typeLabels[question.questionType],
    stem: question.stem,
    stemImagePath: question.stemImagePath,
    options: question.options,
    answer: question.answer,
    answerText: selectedOptionText(question) || question.answer,
    answerImagePath: question.answerImagePath,
    analysis: question.analysis,
    analysisImagePath: question.analysisImagePath,
    raw: question
  }));
  const plan = chooseLayoutPlan(questions, input.kind);
  const shortTitle = shortTitles[input.subjectId];

  return {
    kind: input.kind,
    meta: {
      subjectId: input.subjectId,
      publishDate: input.publishDate,
      examDate: input.examDate,
      daysUntilExam: daysUntilExam(input.examDate, input.publishDate)
    },
    theme: input.theme,
    title: `${shortTitle}每日一题${input.kind === "answer" ? "答案" : ""}`,
    dateLabel: dateLabel(input.publishDate),
    questions,
    density: plan.density
  };
}

function selectedOptionText(question: QuestionDto) {
  if (question.questionType !== "single_choice" && question.questionType !== "multiple_choice") {
    return question.answer;
  }

  const answerLabels = new Set(
    (question.answer ?? "")
      .split(/[\s、，,]+/)
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
  );
  return question.options
    .filter((option) => option.isCorrect || answerLabels.has(option.label.toUpperCase()))
    .map((option) => option.text)
    .filter(Boolean)
    .join("；");
}

function dateLabel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return "";
  }
  return `${match[2]}月${match[3]}日`;
}

function daysUntilExam(examDateValue: string, publishDateValue: string) {
  const examMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(examDateValue);
  const publishMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(publishDateValue);
  if (!examMatch || !publishMatch) {
    return 0;
  }
  const publishDate = new Date(Number(publishMatch[1]), Number(publishMatch[2]) - 1, Number(publishMatch[3]));
  const examDate = new Date(Number(examMatch[1]), Number(examMatch[2]) - 1, Number(examMatch[3]));
  return Math.max(0, Math.ceil((examDate.getTime() - publishDate.getTime()) / 86_400_000));
}
