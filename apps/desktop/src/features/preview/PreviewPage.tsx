import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import "../../shared/design-system/preview.css";
import "../../shared/design-system/export-image.css";
import type { PreviewBatch, SubjectId } from "../../app/store";
import { useAppStore } from "../../app/store";
import { apiClient } from "../../shared/api/client";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog";
import { SUBJECTS } from "../subject/subjects";
import { ExportSheet } from "../export-image/ExportSheet";
import { buildExportSheetModel } from "../export-image/sheetModel";
import { getExportTheme } from "../export-image/themes";
import { PreviewActions } from "./PreviewActions";
import { PreviewDateCalendar } from "./PreviewDateCalendar";
import { PreviewSheets, type BatchSheetElements } from "./PreviewSheets";
import { dateCodeFromIsoDate } from "./previewExportPaths";
import { useImageExport } from "./useImageExport";

type PreviewPageProps = {
  subjectId: SubjectId;
};

export function PreviewPage({ subjectId }: PreviewPageProps) {
  const queryClient = useQueryClient();
  const subject = SUBJECTS.find((item) => item.id === subjectId)!;
  const previewReturnPage = useAppStore((state) => state.previewReturnPage);
  const previewQuestions = useAppStore((state) => state.previewQuestions);
  const previewBatches = useAppStore((state) => state.previewBatches);
  const previewBatchIndex = useAppStore((state) => state.previewBatchIndex);
  const generationStartDate = useAppStore((state) => state.generationStartDate);
  const examDate = useAppStore((state) => state.examDate);
  const defaultExportDirectory = useAppStore((state) => state.defaultExportDirectory);
  const setPreviewBatchIndex = useAppStore((state) => state.setPreviewBatchIndex);
  const setPreviewPublishDate = useAppStore((state) => state.setPreviewPublishDate);
  const setPage = useAppStore((state) => state.setPage);
  const batchSheetRefs = useRef<Record<string, BatchSheetElements>>({});
  const [lightboxKind, setLightboxKind] = useState<"question" | "answer" | null>(null);

  const { data: availableQuestions = [] } = useQuery({
    queryKey: ["preview-questions", subjectId],
    queryFn: () =>
      apiClient.searchQuestions({
        subjectId,
        chapterId: null,
        questionType: null,
        query: null,
        includeDrawn: false
      }),
    enabled: previewQuestions === null,
    retry: false
  });
  const generatedDatesQuery = useQuery({
    queryKey: ["generated-dates", subjectId],
    queryFn: () => apiClient.listGeneratedDates(subjectId),
    retry: false
  });

  const fallbackQuestions = (previewQuestions ?? availableQuestions).slice(0, 4);
  const batches =
    previewBatches && previewBatches.length > 0
      ? previewBatches
      : [
          {
            id: "preview-day-1",
            title: "第 1 天",
            publishDate: generationStartDate || todayIsoDate(),
            questions: fallbackQuestions
          }
        ];
  const activeBatchIndex = Math.min(previewBatchIndex, batches.length - 1);
  const activeBatch = batches[activeBatchIndex];
  const questions = activeBatch.questions;
  const generatedDates = generatedDatesQuery.data ?? [];

  const {
    isExporting,
    exportResult,
    pendingExport,
    setExportResult,
    handleExportImages,
    handleExportAllImages,
    confirmOverwriteExport,
    cancelOverwriteExport,
    revealExport
  } = useImageExport({
    subjectId,
    batches,
    activeBatch,
    defaultExportDirectory,
    generatedDates,
    batchSheetRefs,
    onAfterExport: refreshQuestionQueries
  });

  useEffect(() => {
    if (!exportResult) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setExportResult(null), exportResult.kind === "error" ? 1600 : 2400);
    return () => window.clearTimeout(timeoutId);
  }, [exportResult, setExportResult]);

  async function refreshQuestionQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bank-search", subjectId] }),
      queryClient.invalidateQueries({ queryKey: ["bank-summary", subjectId] }),
      queryClient.invalidateQueries({ queryKey: ["preview-questions", subjectId] }),
      queryClient.invalidateQueries({ queryKey: ["generated-dates", subjectId] })
    ]);
  }

  function buildLightboxModel(kind: "question" | "answer") {
    return buildExportSheetModel({
      kind,
      questions: activeBatch.questions,
      subjectId,
      publishDate: activeBatch.publishDate,
      examDate,
      theme: getExportTheme(subjectId)
    });
  }

  function registerCaptureRef(batchId: string, kind: keyof BatchSheetElements, element: HTMLElement | null) {
    batchSheetRefs.current[batchId] = {
      question: batchSheetRefs.current[batchId]?.question ?? null,
      answer: batchSheetRefs.current[batchId]?.answer ?? null,
      [kind]: element
    };
  }

  return (
    <section className={`preview-page theme-${subject.themeKey}`}>
      <div className="preview-window-drag-region" data-tauri-drag-region aria-hidden="true" />
      <h2 className="preview-screen-title">预览每日一题</h2>
      <div className="preview-floating-toolbar">
        <div className="preview-date-badge">
          <CalendarDays size={18} />
          <span>日期：{dateLabel(activeBatch.publishDate)}</span>
        </div>
        <PreviewActions
          isExporting={isExporting}
          canExportActive={questions.length > 0}
          canExportAll={batches.length > 1}
          onBack={() => setPage(previewReturnPage)}
          onExportActive={() => void handleExportImages()}
          onExportAll={() => void handleExportAllImages()}
        />
      </div>

      {exportResult ? (
        <div className={`export-toast export-toast-${exportResult.kind}`} role="status">
          <span>{exportResult.message}</span>
          {exportResult.kind === "success" ? (
            <Button className="export-toast-action" onClick={() => void revealExport()} variant="secondary">
              打开所在文件夹
            </Button>
          ) : null}
        </div>
      ) : null}

      {pendingExport ? (
        <ConfirmDialog
          title="该日期已生成"
          message={`将覆盖 ${pendingExport.duplicateDates.map(dateCodeFromIsoDate).join("、")} 的每日一题记录。`}
          confirmLabel="确认覆盖"
          onCancel={cancelOverwriteExport}
          onConfirm={confirmOverwriteExport}
        />
      ) : null}

      <div className="preview-workspace">
        <PreviewDateCalendar
          selectedDate={activeBatch.publishDate}
          generatedDates={generatedDates}
          onSelectDate={setPreviewPublishDate}
        />

        <section className="preview-stage" aria-label="每日一题预览">
          {batches.length > 1 ? (
            <div className="preview-queue-bar">
              <Button disabled={activeBatchIndex === 0} onClick={() => setPreviewBatchIndex(activeBatchIndex - 1)} variant="secondary">
                上一天
              </Button>
              <strong>
                第 {activeBatchIndex + 1} / {batches.length} 天
              </strong>
              <span>{activeBatch.publishDate}</span>
              <Button
                disabled={activeBatchIndex === batches.length - 1}
                onClick={() => setPreviewBatchIndex(activeBatchIndex + 1)}
                variant="secondary"
              >
                下一天
              </Button>
            </div>
          ) : null}

          <PreviewSheets
            subjectId={subjectId}
            examDate={examDate}
            activeBatch={activeBatch}
            captureBatches={batches}
            registerCaptureRef={registerCaptureRef}
            onOpenLightbox={setLightboxKind}
          />
        </section>
      </div>

      {lightboxKind ? (
        <div
          className="lightbox-backdrop sheet-lightbox-backdrop"
          aria-label="图片预览"
          role="dialog"
          tabIndex={0}
          onClick={() => setLightboxKind(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setLightboxKind(null);
            }
          }}
        >
          <div className="sheet-lightbox-canvas" onClick={(event) => event.stopPropagation()}>
            <ExportSheet model={buildLightboxModel(lightboxKind)} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function todayIsoDate(date = new Date()) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

function dateLabel(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return value;
  }
  return `${match[2]}月${match[3]}日`;
}
