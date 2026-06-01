import { create } from "zustand";
import type { QuestionDto } from "../shared/api/contracts";

export type SubjectId = "pharmaceutics" | "pharmacology" | "medicinal_chemistry" | "pharmaceutical_analysis";
export type AppPage = "dashboard" | "generate" | "bank" | "entry" | "settings" | "preview";
export type PreviewBatch = {
  id: string;
  title: string;
  publishDate: string;
  questions: QuestionDto[];
};

const defaultExamDate = "2026-12-19";
const examDateStorageKey = "yiyan.examDate";
const defaultExportDirectoryStorageKey = "yiyan.defaultExportDirectory";

type AppState = {
  selectedSubjectId: SubjectId | null;
  activePage: AppPage;
  generationStartDate: string;
  examDate: string;
  defaultExportDirectory: string;
  previewReturnPage: AppPage;
  previewQuestions: QuestionDto[] | null;
  previewBatches: PreviewBatch[] | null;
  previewBatchIndex: number;
  selectSubject: (subjectId: SubjectId) => void;
  setPage: (page: AppPage) => void;
  setGenerationStartDate: (date: string) => void;
  setExamDate: (date: string) => void;
  setDefaultExportDirectory: (directory: string) => void;
  openPreview: (questions?: QuestionDto[]) => void;
  openPreviewQueue: (batches: PreviewBatch[]) => void;
  setPreviewPublishDate: (date: string) => void;
  setPreviewBatchIndex: (index: number) => void;
  resetSubject: () => void;
  resetApp: () => void;
};

const initialState = {
  selectedSubjectId: null,
  activePage: "bank" as AppPage,
  generationStartDate: todayIsoDate(),
  examDate: loadStoredExamDate(),
  defaultExportDirectory: loadStoredDefaultExportDirectory(),
  previewReturnPage: "bank" as AppPage,
  previewQuestions: null,
  previewBatches: null,
  previewBatchIndex: 0
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,
  selectSubject: (subjectId) => set({ selectedSubjectId: subjectId, activePage: "bank", previewReturnPage: "bank" }),
  setPage: (page) => set({ activePage: page }),
  setGenerationStartDate: (date) => set({ generationStartDate: date }),
  setExamDate: (date) => {
    saveStoredExamDate(date);
    set({ examDate: date });
  },
  setDefaultExportDirectory: (directory) => {
    saveStoredDefaultExportDirectory(directory);
    set({ defaultExportDirectory: directory });
  },
  openPreview: (questions) =>
    set((state) => ({
      activePage: "preview",
      previewReturnPage: state.activePage,
      previewQuestions: questions ?? null,
      previewBatches: null,
      previewBatchIndex: 0
    })),
  openPreviewQueue: (batches) =>
    set((state) => ({
      activePage: "preview",
      previewReturnPage: state.activePage,
      previewQuestions: batches[0]?.questions ?? null,
      previewBatches: batches,
      previewBatchIndex: 0
    })),
  setPreviewPublishDate: (date) =>
    set((state) => ({
      generationStartDate: date,
      previewBatches: state.previewBatches
        ? state.previewBatches.map((batch, index) =>
            index === state.previewBatchIndex
              ? {
                  ...batch,
                  title: date,
                  publishDate: date
                }
              : batch
          )
        : state.previewBatches
    })),
  setPreviewBatchIndex: (index) =>
    set((state) => ({
      previewBatchIndex: Math.min(Math.max(index, 0), Math.max((state.previewBatches?.length ?? 1) - 1, 0))
    })),
  resetSubject: () => set(initialState),
  resetApp: () => set(initialState)
}));

function loadStoredExamDate() {
  if (typeof window === "undefined") {
    return defaultExamDate;
  }
  return window.localStorage.getItem(examDateStorageKey) || defaultExamDate;
}

function saveStoredExamDate(date: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(examDateStorageKey, date);
}

function loadStoredDefaultExportDirectory() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(defaultExportDirectoryStorageKey) || "";
}

function saveStoredDefaultExportDirectory(directory: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(defaultExportDirectoryStorageKey, directory);
}

function todayIsoDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}
