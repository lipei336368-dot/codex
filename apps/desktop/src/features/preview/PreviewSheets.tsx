import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { PreviewBatch, SubjectId } from "../../app/store";
import { ExportSheet } from "../export-image/ExportSheet";
import { buildExportSheetModel } from "../export-image/sheetModel";
import { getExportTheme } from "../export-image/themes";

const EXPORT_SHEET_WIDTH = 1080;
const EXPORT_SHEET_HEIGHT = 1920;
const PREVIEW_SHEET_CARD_INSET = 24;

export type BatchSheetElements = {
  question: HTMLElement | null;
  answer: HTMLElement | null;
};

type PreviewSheetsProps = {
  subjectId: SubjectId;
  examDate: string;
  activeBatch: PreviewBatch;
  captureBatches: PreviewBatch[];
  registerCaptureRef: (batchId: string, kind: keyof BatchSheetElements, node: HTMLElement | null) => void;
  onOpenLightbox: (kind: "question" | "answer") => void;
};

export function PreviewSheets({
  subjectId,
  examDate,
  activeBatch,
  captureBatches,
  registerCaptureRef,
  onOpenLightbox
}: PreviewSheetsProps) {
  const { gridRef, scale } = usePreviewSheetScale();
  const theme = getExportTheme(subjectId);
  const visibleQuestionModel = buildExportSheetModel({
    kind: "question",
    questions: activeBatch.questions,
    subjectId,
    publishDate: activeBatch.publishDate,
    examDate,
    theme
  });
  const visibleAnswerModel = buildExportSheetModel({
    kind: "answer",
    questions: activeBatch.questions,
    subjectId,
    publishDate: activeBatch.publishDate,
    examDate,
    theme
  });
  const canvasStyle = {
    "--preview-sheet-scale": String(scale),
    "--preview-sheet-width": `${Math.round(EXPORT_SHEET_WIDTH * scale)}px`,
    "--preview-sheet-height": `${Math.round(EXPORT_SHEET_HEIGHT * scale)}px`
  } as CSSProperties;

  return (
    <>
      <section className="preview-sheet-grid" aria-label="每日一题预览" ref={gridRef}>
        <div className="preview-sheet-card">
          <div className="preview-sheet-canvas" data-testid="preview-sheet-canvas" style={canvasStyle}>
            <ExportSheet model={visibleQuestionModel} scale="preview" onClick={() => onOpenLightbox("question")} />
          </div>
        </div>
        <div className="preview-sheet-card">
          <div className="preview-sheet-canvas" data-testid="preview-sheet-canvas" style={canvasStyle}>
            <ExportSheet model={visibleAnswerModel} scale="preview" onClick={() => onOpenLightbox("answer")} />
          </div>
        </div>
      </section>

      <section className="export-capture-stage" aria-hidden="true">
        {captureBatches.map((batch) => {
          const captureQuestionModel = buildExportSheetModel({
            kind: "question",
            questions: batch.questions,
            subjectId,
            publishDate: batch.publishDate,
            examDate,
            theme
          });
          const captureAnswerModel = buildExportSheetModel({
            kind: "answer",
            questions: batch.questions,
            subjectId,
            publishDate: batch.publishDate,
            examDate,
            theme
          });

          return (
            <div className="export-capture-pair" key={batch.id}>
              <ExportSheet
                model={captureQuestionModel}
                scale="native"
                sheetRef={(node) => registerCaptureRef(batch.id, "question", node)}
              />
              <ExportSheet
                model={captureAnswerModel}
                scale="native"
                sheetRef={(node) => registerCaptureRef(batch.id, "answer", node)}
              />
            </div>
          );
        })}
      </section>
    </>
  );
}

function usePreviewSheetScale() {
  const gridRef = useRef<HTMLElement | null>(null);
  const [scale, setScale] = useState(0.34);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) {
      return undefined;
    }

    const updateScale = () => {
      const bounds = grid.getBoundingClientRect();
      const styles = window.getComputedStyle(grid);
      const columnGap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
      const columns = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 860px)").matches ? 1 : 2;
      const columnWidth = columns === 2 ? (bounds.width - columnGap) / 2 : bounds.width;
      const availableWidth = Math.max(1, columnWidth - PREVIEW_SHEET_CARD_INSET);
      const availableHeight = Math.max(1, bounds.height - PREVIEW_SHEET_CARD_INSET);
      const nextScale = Math.min(availableWidth / EXPORT_SHEET_WIDTH, availableHeight / EXPORT_SHEET_HEIGHT, 0.43);

      setScale(Math.max(0.2, Number(nextScale.toFixed(4))));
    };

    updateScale();
    window.addEventListener("resize", updateScale);

    if (typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", updateScale);
    }

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(grid);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return { gridRef, scale };
}
