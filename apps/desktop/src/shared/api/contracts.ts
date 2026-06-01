export type AppError = {
  code: string;
  message: string;
  details?: unknown;
};

export type AppResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

export type SubjectDto = {
  id: string;
  name: string;
  themeKey: string;
};

export type ChapterDto = {
  id: string;
  subjectId: string;
  order: number;
  name: string;
  noRequirement: boolean;
};

export type RawSubjectDto = {
  id: string;
  name: string;
  theme_key: string;
};

export type RawChapterDto = {
  id: string;
  subject_id: string;
  order: number;
  name: string;
  no_requirement: boolean;
};

export type QuestionTypeDto = "single_choice" | "multiple_choice" | "short_answer" | "essay";

export type BankSummaryDto = {
  total: number;
  available: number;
  byType: {
    singleChoice: number;
    multipleChoice: number;
    shortAnswer: number;
    essay: number;
  };
  availableByType: {
    singleChoice: number;
    multipleChoice: number;
    shortAnswer: number;
    essay: number;
  };
};

export type RawBankSummaryDto = {
  total: number;
  available: number;
  by_type: {
    single_choice: number;
    multiple_choice: number;
    short_answer: number;
    essay: number;
  };
  available_by_type: {
    single_choice: number;
    multiple_choice: number;
    short_answer: number;
    essay: number;
  };
};

export type QuestionSearchInput = {
  subjectId: string;
  chapterId: string | null;
  questionType: QuestionTypeDto | null;
  query: string | null;
  includeDrawn: boolean;
};

export type RawQuestionSearchInput = {
  subject_id: string;
  chapter_id: string | null;
  question_type: QuestionTypeDto | null;
  query: string | null;
  include_drawn: boolean;
};

export type TaskKind = "import_json" | "dedupe" | "export_json" | "export_word" | "export_images";

export type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export type TaskProgressDto = {
  id: string;
  kind: TaskKind;
  status: TaskStatus;
  title: string;
  current: number;
  total: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
};

export type RawTaskProgressDto = {
  id: string;
  kind: TaskKind;
  status: TaskStatus;
  title: string;
  current: number;
  total: number;
  message: string;
  created_at: string;
  updated_at: string;
  error?: string;
};

export type PagedQuestionSearchInput = QuestionSearchInput & {
  offset: number;
  limit: number;
};

export type RawPagedQuestionSearchInput = RawQuestionSearchInput & {
  offset: number;
  limit: number;
};

export type PagedQuestionResultDto = {
  total: number;
  items: QuestionDto[];
};

export type RawPagedQuestionResultDto = {
  total: number;
  items: RawQuestionDto[];
};

export type QuestionDto = {
  id: string;
  subjectId: string;
  chapterId: string;
  questionType: QuestionTypeDto;
  stem: string;
  answer: string | null;
  analysis: string | null;
  stemImagePath: string | null;
  answerImagePath: string | null;
  analysisImagePath: string | null;
  options: QuestionOptionInput[];
  sourceSchool: string | null;
  sourceYear: string | null;
  drawn: boolean;
};

export type DuplicateQuestionDto = {
  id: string;
  stem: string;
  chapterId: string;
  questionType: QuestionTypeDto;
};

export type RawDuplicateQuestionDto = {
  id: string;
  stem: string;
  chapter_id: string;
  question_type: QuestionTypeDto;
};

export type DuplicateQuestionGroupDto = {
  key: string;
  questions: DuplicateQuestionDto[];
};

export type RawDuplicateQuestionGroupDto = {
  key: string;
  questions: RawDuplicateQuestionDto[];
};

export type QuestionOptionInput = {
  label: string;
  text: string | null;
  imagePath: string | null;
  isCorrect: boolean;
};

export type RawQuestionOptionInput = {
  label: string;
  text: string | null;
  image_path: string | null;
  is_correct: boolean;
};

export type NewQuestionInput = {
  subjectId: string;
  chapterId: string;
  questionType: QuestionTypeDto;
  stem: string;
  answer: string | null;
  analysis: string | null;
  stemImagePath: string | null;
  answerImagePath: string | null;
  analysisImagePath: string | null;
  options: QuestionOptionInput[];
  sourceSchool: string | null;
  sourceYear: string | null;
};

export type RawNewQuestionInput = {
  subject_id: string;
  chapter_id: string;
  question_type: QuestionTypeDto;
  stem: string;
  answer: string | null;
  analysis: string | null;
  stem_image_path: string | null;
  answer_image_path: string | null;
  analysis_image_path: string | null;
  options: RawQuestionOptionInput[];
  source_school: string | null;
  source_year: string | null;
};

export type RawQuestionDto = {
  id: string;
  subject_id: string;
  chapter_id: string;
  question_type: QuestionTypeDto;
  stem: string;
  answer: string | null;
  analysis: string | null;
  stem_image_path: string | null;
  answer_image_path: string | null;
  analysis_image_path: string | null;
  options: RawQuestionOptionInput[];
  source_school: string | null;
  source_year: string | null;
  drawn: boolean;
};

export type UpdateQuestionInput = {
  id: string;
  chapterId: string;
  stem: string;
  answer: string | null;
  analysis: string | null;
  stemImagePath: string | null;
  answerImagePath: string | null;
  analysisImagePath: string | null;
  options: QuestionOptionInput[];
};

export type RawUpdateQuestionInput = {
  id: string;
  chapter_id: string;
  stem: string;
  answer: string | null;
  analysis: string | null;
  stem_image_path: string | null;
  answer_image_path: string | null;
  analysis_image_path: string | null;
  options: RawQuestionOptionInput[];
};

export type ImportErrorDto = {
  index: number;
  stem: string | null;
  message: string;
};

export type ImportReportDto = {
  added: number;
  skipped: number;
  errorsCount: number;
  errors: ImportErrorDto[];
};

export type RawImportReportDto = {
  added: number;
  skipped: number;
  errors_count: number;
  errors: ImportErrorDto[];
};
