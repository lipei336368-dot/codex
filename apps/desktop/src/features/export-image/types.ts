import type { SubjectId } from "../../app/store";
import type { QuestionDto, QuestionOptionInput, QuestionTypeDto } from "../../shared/api/contracts";

export type SheetKind = "question" | "answer";

export type SheetDensity = "roomy" | "normal" | "compact" | "dense" | "ultra" | "micro";

export type ExportThemeId = "pharmaceutics" | "pharmacology" | "medicinal_chemistry" | "pharmaceutical_analysis";

export type ExportSheetTheme = {
  id: ExportThemeId;
  subjectId: SubjectId;
  subjectName: string;
  shortTitle: string;
  englishTitle: string;
  icon: "mortarboard" | "pulse" | "molecule" | "analysis";
  className: string;
  colors: {
    ink: string;
    muted: string;
    primary: string;
    primarySoft: string;
    line: string;
    paper: string;
    wash: string;
    accent: string;
  };
};

export type ExportImageMeta = {
  subjectId: SubjectId;
  publishDate: string;
  examDate: string;
  daysUntilExam: number;
};

export type ExportSheetModel = {
  kind: SheetKind;
  meta: ExportImageMeta;
  theme: ExportSheetTheme;
  title: string;
  dateLabel: string;
  questions: ExportQuestionBlock[];
  density: SheetDensity;
};

export type ExportQuestionBlock = {
  id: string;
  index: number;
  questionType: QuestionTypeDto;
  typeLabel: string;
  stem: string;
  stemImagePath: string | null;
  options: QuestionOptionInput[];
  answer: string | null;
  answerText: string | null;
  answerImagePath: string | null;
  analysis: string | null;
  analysisImagePath: string | null;
  raw: QuestionDto;
};

export type ExportLayoutPlan = {
  density: SheetDensity;
  textScore: number;
  imageScore: number;
  totalScore: number;
  hasImages: boolean;
};

export type ExportCaptureResult = {
  bytes: Uint8Array;
  width: number;
  height: number;
};
