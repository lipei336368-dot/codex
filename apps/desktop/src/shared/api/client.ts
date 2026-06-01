import { invoke } from "@tauri-apps/api/core";
import type {
  AppError,
  AppResult,
  BankSummaryDto,
  ChapterDto,
  DuplicateQuestionGroupDto,
  ImportReportDto,
  NewQuestionInput,
  PagedQuestionResultDto,
  PagedQuestionSearchInput,
  QuestionDto,
  QuestionSearchInput,
  RawBankSummaryDto,
  RawChapterDto,
  RawDuplicateQuestionGroupDto,
  RawImportReportDto,
  RawNewQuestionInput,
  RawPagedQuestionResultDto,
  RawPagedQuestionSearchInput,
  RawQuestionDto,
  RawQuestionSearchInput,
  RawSubjectDto,
  RawUpdateQuestionInput,
  SubjectDto,
  UpdateQuestionInput
} from "./contracts";

export type TauriInvoker = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

export class AppClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(error: AppError) {
    super(error.message);
    this.name = "AppClientError";
    this.code = error.code;
    this.details = error.details;
  }
}

export function unwrapAppResult<T>(result: AppResult<T>): T {
  if (result.ok) {
    return result.data;
  }

  throw new AppClientError(result.error);
}

export function createApiClient(invoker: TauriInvoker = invoke as TauriInvoker) {
  return {
    async listSubjects(): Promise<SubjectDto[]> {
      const result = (await invoker("subjects_list")) as AppResult<RawSubjectDto[]>;
      return unwrapAppResult(result).map(toSubjectDto);
    },

    async getDataDirectory(): Promise<string> {
      const result = (await invoker("app_data_directory")) as AppResult<string>;
      return unwrapAppResult(result);
    },

    async backupDatabase(path: string): Promise<void> {
      const result = (await invoker("app_backup_database", { path })) as AppResult<null>;
      unwrapAppResult(result);
    },

    async setDataDirectory(path: string): Promise<string> {
      const result = (await invoker("app_set_data_directory", { path })) as AppResult<string>;
      return unwrapAppResult(result);
    },

    async listChapters(subjectId: string): Promise<ChapterDto[]> {
      const result = (await invoker("chapters_list", { subjectId })) as AppResult<RawChapterDto[]>;
      return unwrapAppResult(result).map(toChapterDto);
    },

    async getBankSummary(subjectId: string): Promise<BankSummaryDto> {
      const result = (await invoker("bank_summary", { subjectId })) as AppResult<RawBankSummaryDto>;
      return toBankSummaryDto(unwrapAppResult(result));
    },

    async searchQuestions(search: QuestionSearchInput): Promise<QuestionDto[]> {
      const result = (await invoker("bank_search", { search: toRawQuestionSearch(search) })) as AppResult<RawQuestionDto[]>;
      return unwrapAppResult(result).map(toQuestionDto);
    },

    async searchQuestionsPaged(search: PagedQuestionSearchInput): Promise<PagedQuestionResultDto> {
      const result = (await invoker("bank_search_paged", {
        search: toRawPagedQuestionSearch(search)
      })) as AppResult<RawPagedQuestionResultDto>;
      const page = unwrapAppResult(result);
      return {
        total: page.total,
        items: page.items.map(toQuestionDto)
      };
    },

    async createQuestion(question: NewQuestionInput): Promise<string> {
      const result = (await invoker("bank_create", { question: toRawNewQuestion(question) })) as AppResult<string>;
      return unwrapAppResult(result);
    },

    async saveQuestionAsset(subjectId: string, fileName: string, bytes: Uint8Array): Promise<string> {
      const result = (await invoker("save_question_asset", { subjectId, fileName, bytes })) as AppResult<string>;
      return unwrapAppResult(result);
    },

    async updateQuestion(question: UpdateQuestionInput): Promise<void> {
      const result = (await invoker("bank_update", { question: toRawUpdateQuestion(question) })) as AppResult<null>;
      unwrapAppResult(result);
    },

    async deleteQuestions(questionIds: string[]): Promise<void> {
      const result = (await invoker("bank_delete", { questionIds })) as AppResult<null>;
      unwrapAppResult(result);
    },

    async resetDrawn(subjectId: string, questionIds: string[]): Promise<void> {
      const result = (await invoker("bank_reset_drawn", { subjectId, questionIds })) as AppResult<null>;
      unwrapAppResult(result);
    },

    async markDrawn(subjectId: string, questionIds: string[], publishDate: string): Promise<void> {
      const result = (await invoker("bank_mark_drawn", { subjectId, questionIds, publishDate })) as AppResult<null>;
      unwrapAppResult(result);
    },

    async listGeneratedDates(subjectId: string): Promise<string[]> {
      const result = (await invoker("bank_generated_dates", { subjectId })) as AppResult<string[]>;
      return unwrapAppResult(result);
    },

    async resetGeneratedDates(subjectId: string, publishDates: string[]): Promise<void> {
      const result = (await invoker("bank_reset_generated_dates", { subjectId, publishDates })) as AppResult<null>;
      unwrapAppResult(result);
    },

    async findDuplicateQuestions(subjectId: string): Promise<DuplicateQuestionGroupDto[]> {
      const result = (await invoker("bank_find_duplicates", { subjectId })) as AppResult<RawDuplicateQuestionGroupDto[]>;
      return unwrapAppResult(result).map(toDuplicateQuestionGroupDto);
    },

    async importJsonText(subjectId: string, jsonText: string): Promise<ImportReportDto> {
      const result = (await invoker("import_json", { subjectId, jsonText })) as AppResult<RawImportReportDto>;
      return toImportReportDto(unwrapAppResult(result));
    },

    async exportSelectedQuestionsJson(subjectId: string, questionIds: string[]): Promise<string> {
      const result = (await invoker("export_json_by_ids", { subjectId, questionIds })) as AppResult<string>;
      return unwrapAppResult(result);
    },

    async writeTextFile(path: string, content: string): Promise<void> {
      const result = (await invoker("write_text_file", { path, content })) as AppResult<null>;
      unwrapAppResult(result);
    },

    async writeBinaryFile(path: string, bytes: Uint8Array): Promise<void> {
      const result = (await invoker("write_binary_file", { path, bytes })) as AppResult<null>;
      unwrapAppResult(result);
    },

    async revealPath(path: string): Promise<void> {
      const result = (await invoker("reveal_path_in_file_manager", { path })) as AppResult<null>;
      unwrapAppResult(result);
    },

    async exportSelectedQuestionsWord(subjectId: string, questionIds: string[], path: string): Promise<void> {
      const result = (await invoker("export_docx_by_ids_to_path", { subjectId, questionIds, path })) as AppResult<null>;
      unwrapAppResult(result);
    }
  };
}

export const apiClient = createApiClient();

function toSubjectDto(subject: RawSubjectDto): SubjectDto {
  return {
    id: subject.id,
    name: subject.name,
    themeKey: subject.theme_key
  };
}

function toChapterDto(chapter: RawChapterDto): ChapterDto {
  return {
    id: chapter.id,
    subjectId: chapter.subject_id,
    order: chapter.order,
    name: chapter.name,
    noRequirement: chapter.no_requirement
  };
}

function toBankSummaryDto(summary: RawBankSummaryDto): BankSummaryDto {
  return {
    total: summary.total,
    available: summary.available,
    byType: {
      singleChoice: summary.by_type.single_choice,
      multipleChoice: summary.by_type.multiple_choice,
      shortAnswer: summary.by_type.short_answer,
      essay: summary.by_type.essay
    },
    availableByType: {
      singleChoice: summary.available_by_type.single_choice,
      multipleChoice: summary.available_by_type.multiple_choice,
      shortAnswer: summary.available_by_type.short_answer,
      essay: summary.available_by_type.essay
    }
  };
}

function toRawQuestionSearch(search: QuestionSearchInput): RawQuestionSearchInput {
  return {
    subject_id: search.subjectId,
    chapter_id: search.chapterId,
    question_type: search.questionType,
    query: search.query,
    include_drawn: search.includeDrawn
  };
}

function toRawPagedQuestionSearch(search: PagedQuestionSearchInput): RawPagedQuestionSearchInput {
  return {
    ...toRawQuestionSearch(search),
    offset: search.offset,
    limit: search.limit
  };
}

function toRawNewQuestion(question: NewQuestionInput): RawNewQuestionInput {
  return {
    subject_id: question.subjectId,
    chapter_id: question.chapterId,
    question_type: question.questionType,
    stem: question.stem,
    answer: question.answer,
    analysis: question.analysis,
    stem_image_path: question.stemImagePath,
    answer_image_path: question.answerImagePath,
    analysis_image_path: question.analysisImagePath,
    options: question.options.map((option) => ({
      label: option.label,
      text: option.text,
      image_path: option.imagePath,
      is_correct: option.isCorrect
    })),
    source_school: question.sourceSchool,
    source_year: question.sourceYear
  };
}

function toRawUpdateQuestion(question: UpdateQuestionInput): RawUpdateQuestionInput {
  return {
    id: question.id,
    chapter_id: question.chapterId,
    stem: question.stem,
    answer: question.answer,
    analysis: question.analysis,
    stem_image_path: question.stemImagePath,
    answer_image_path: question.answerImagePath,
    analysis_image_path: question.analysisImagePath,
    options: question.options.map((option) => ({
      label: option.label,
      text: option.text,
      image_path: option.imagePath,
      is_correct: option.isCorrect
    }))
  };
}

function toQuestionDto(question: RawQuestionDto): QuestionDto {
  return {
    id: question.id,
    subjectId: question.subject_id,
    chapterId: question.chapter_id,
    questionType: question.question_type,
    stem: question.stem,
    answer: question.answer,
    analysis: question.analysis,
    stemImagePath: question.stem_image_path,
    answerImagePath: question.answer_image_path,
    analysisImagePath: question.analysis_image_path,
    options: (question.options ?? []).map((option) => ({
      label: option.label,
      text: option.text,
      imagePath: option.image_path,
      isCorrect: option.is_correct
    })),
    sourceSchool: question.source_school,
    sourceYear: question.source_year,
    drawn: question.drawn
  };
}

function toDuplicateQuestionGroupDto(group: RawDuplicateQuestionGroupDto): DuplicateQuestionGroupDto {
  return {
    key: group.key,
    questions: group.questions.map((question) => ({
      id: question.id,
      stem: question.stem,
      chapterId: question.chapter_id,
      questionType: question.question_type
    }))
  };
}

function toImportReportDto(report: RawImportReportDto): ImportReportDto {
  return {
    added: report.added,
    skipped: report.skipped,
    errorsCount: report.errors_count,
    errors: report.errors
  };
}
