import { useState, type RefObject } from "react";
import type { PreviewBatch, SubjectId } from "../../app/store";
import { apiClient } from "../../shared/api/client";
import { chooseSavePath } from "../../shared/platform/files";
import { defaultPathInDirectory } from "../../shared/platform/paths";
import { exportSheetToPngBytes } from "../export-image/exportImage";
import { ImagePreloadError } from "../export-image/imagePreload";
import type { BatchSheetElements } from "./PreviewSheets";
import { answerOutputPath, dateCodeFromIsoDate, folderFromPath, joinPath } from "./previewExportPaths";

type UseImageExportInput = {
  subjectId: SubjectId;
  batches: PreviewBatch[];
  activeBatch: PreviewBatch;
  defaultExportDirectory: string;
  generatedDates: string[];
  batchSheetRefs: RefObject<Record<string, BatchSheetElements>>;
  onAfterExport: () => Promise<void>;
};

export type ExportResult =
  | {
      kind: "success";
      message: string;
      path: string;
    }
  | {
      kind: "error";
      message: string;
    };

type ExportMode = "active" | "all";

type PendingExport = {
  mode: ExportMode;
  duplicateDates: string[];
};

export function useImageExport({
  subjectId,
  batches,
  activeBatch,
  defaultExportDirectory,
  generatedDates,
  batchSheetRefs,
  onAfterExport
}: UseImageExportInput) {
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

  async function handleExportImages() {
    try {
      await requestExport("active");
    } catch (error) {
      console.error(error);
      setExportResult({ kind: "error", message: exportErrorMessage(error) });
    }
  }

  async function handleExportAllImages() {
    try {
      await requestExport("all");
    } catch (error) {
      console.error(error);
      setExportResult({ kind: "error", message: exportErrorMessage(error) });
    }
  }

  async function requestExport(mode: ExportMode) {
    const latestDates = generatedDates.length > 0 ? generatedDates : await apiClient.listGeneratedDates(subjectId);
    const targetBatches = mode === "active" ? [activeBatch] : batches;
    const duplicateDates = duplicatePublishDates(targetBatches, latestDates);
    if (duplicateDates.length > 0) {
      setPendingExport({ mode, duplicateDates });
      return;
    }

    await runExport(mode, []);
  }

  function confirmOverwriteExport() {
    if (!pendingExport) {
      return;
    }
    const nextExport = pendingExport;
    setPendingExport(null);
    void runExport(nextExport.mode, nextExport.duplicateDates);
  }

  function cancelOverwriteExport() {
    setPendingExport(null);
  }

  async function runExport(mode: ExportMode, overwriteDates: string[]) {
    if (mode === "active") {
      await exportActiveBatch(overwriteDates);
      return;
    }

    await exportAllBatches(overwriteDates);
  }

  async function exportActiveBatch(overwriteDates: string[]) {
    const refs = batchSheetRefs.current[activeBatch.id];
    if (activeBatch.questions.length === 0 || !refs?.question || !refs.answer) {
      return;
    }

    let outputPath: string | null;
    try {
      outputPath = await chooseSavePath({
        title: "导出每日一题图片",
        defaultPath: defaultPathInDirectory(defaultExportDirectory, `${dateCodeFromIsoDate(activeBatch.publishDate)}-每日一题.png`),
        filters: [{ name: "PNG 图片", extensions: ["png"] }]
      });
    } catch (error) {
      console.error(error);
      setExportResult({ kind: "error", message: exportErrorMessage(error) });
      return;
    }
    if (!outputPath) {
      return;
    }

    setIsExporting(true);
    setExportResult(null);
    try {
      const questionBytes = (await exportSheetToPngBytes(refs.question)).bytes;
      const answerBytes = (await exportSheetToPngBytes(refs.answer)).bytes;
      await apiClient.writeBinaryFile(outputPath, questionBytes);
      await apiClient.writeBinaryFile(answerOutputPath(outputPath), answerBytes);
      if (overwriteDates.length > 0) {
        await apiClient.resetGeneratedDates(subjectId, overwriteDates);
      }
      await apiClient.markDrawn(subjectId, activeBatch.questions.map((question) => question.id), activeBatch.publishDate);
      await onAfterExport();
      setExportResult({ kind: "success", message: "已导出图片", path: outputPath });
    } catch (error) {
      console.error(error);
      setExportResult({ kind: "error", message: exportErrorMessage(error) });
    } finally {
      setIsExporting(false);
    }
  }

  async function exportAllBatches(overwriteDates: string[]) {
    if (batches.length === 0) {
      return;
    }

    let outputPath: string | null;
    try {
      outputPath = await chooseSavePath({
        title: "导出全部每日一题图片",
        defaultPath: defaultPathInDirectory(defaultExportDirectory, `${dateCodeFromIsoDate(batches[0].publishDate)}-每日一题.png`),
        filters: [{ name: "PNG 图片", extensions: ["png"] }]
      });
    } catch (error) {
      console.error(error);
      setExportResult({ kind: "error", message: exportErrorMessage(error) });
      return;
    }
    if (!outputPath) {
      return;
    }

    setIsExporting(true);
    setExportResult(null);
    try {
      const outputFolder = folderFromPath(outputPath);
      for (const batch of batches) {
        const refs = batchSheetRefs.current[batch.id];
        if (!refs?.question || !refs.answer) {
          throw new Error(`missing export sheets for ${batch.id}`);
        }

        const questionPath = joinPath(outputFolder, `${dateCodeFromIsoDate(batch.publishDate)}-每日一题.png`);
        const answerPath = answerOutputPath(questionPath);
        const questionBytes = (await exportSheetToPngBytes(refs.question)).bytes;
        const answerBytes = (await exportSheetToPngBytes(refs.answer)).bytes;
        await apiClient.writeBinaryFile(questionPath, questionBytes);
        await apiClient.writeBinaryFile(answerPath, answerBytes);
      }

      if (overwriteDates.length > 0) {
        await apiClient.resetGeneratedDates(subjectId, overwriteDates);
      }
      for (const batch of batches) {
        await apiClient.markDrawn(subjectId, batch.questions.map((question) => question.id), batch.publishDate);
      }
      await onAfterExport();
      setExportResult({ kind: "success", message: "已导出全部", path: outputPath });
    } catch (error) {
      console.error(error);
      setExportResult({ kind: "error", message: "导出失败" });
    } finally {
      setIsExporting(false);
    }
  }

  async function revealExport() {
    if (exportResult?.kind !== "success") {
      return;
    }

    try {
      await apiClient.revealPath(exportResult.path);
    } catch (error) {
      console.error(error);
      setExportResult({ kind: "error", message: "打开失败" });
    }
  }

  return {
    isExporting,
    exportResult,
    pendingExport,
    setExportResult,
    handleExportImages,
    handleExportAllImages,
    confirmOverwriteExport,
    cancelOverwriteExport,
    revealExport
  };
}

function duplicatePublishDates(batches: PreviewBatch[], generatedDates: string[]) {
  const existing = new Set(generatedDates);
  return Array.from(new Set(batches.map((batch) => batch.publishDate).filter((date) => existing.has(date))));
}

function exportErrorMessage(error: unknown) {
  if (error instanceof ImagePreloadError) {
    return "有图片加载失败，已停止导出。请重新上传或更换图片。";
  }
  return "导出失败";
}
