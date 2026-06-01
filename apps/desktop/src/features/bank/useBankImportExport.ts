import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiClient } from "../../shared/api/client";
import type { DuplicateQuestionGroupDto, ImportReportDto, TaskProgressDto } from "../../shared/api/contracts";
import { chooseSavePath, saveTextFile } from "../../shared/platform/files";
import { defaultPathInDirectory } from "../../shared/platform/paths";

type UseBankImportExportInput = {
  subjectId: string;
  defaultExportDirectory: string;
  refreshBankData: () => Promise<void>;
  onDeleteDuplicateQuestions: (questionIds: string[], afterSuccess: () => void) => void;
};

export function useBankImportExport({
  subjectId,
  defaultExportDirectory,
  refreshBankData,
  onDeleteDuplicateQuestions
}: UseBankImportExportInput) {
  const [importMessage, setImportMessage] = useState("");
  const [exportMessage, setExportMessage] = useState("");
  const [importReport, setImportReport] = useState<ImportReportDto | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateQuestionGroupDto[] | null>(null);
  const [activeTask, setActiveTask] = useState<TaskProgressDto | null>(null);

  const duplicateMutation = useMutation({
    mutationFn: () => apiClient.findDuplicateQuestions(subjectId),
    onSuccess: (groups) => {
      setDuplicateGroups(groups);
      setExportMessage(groups.length > 0 ? "" : "未发现重复题目");
    }
  });

  const exportSelectedMutation = useMutation({
    mutationFn: (questionIds: string[]) => apiClient.exportSelectedQuestionsJson(subjectId, questionIds),
    onSuccess: async (jsonText) => {
      const path = await saveTextFile(
        {
          title: "导出题库 JSON",
          defaultPath: defaultPathInDirectory(defaultExportDirectory, "题库导出.json"),
          filters: [{ name: "JSON", extensions: ["json"] }]
        },
        jsonText
      );
      setExportMessage(path ? "已导出 JSON" : "已取消导出");
    }
  });

  const exportSelectedWordMutation = useMutation({
    mutationFn: async (questionIds: string[]) => {
      const path = await chooseSavePath({
        title: "导出题库 Word",
        defaultPath: defaultPathInDirectory(defaultExportDirectory, "题库导出.docx"),
        filters: [{ name: "Word", extensions: ["docx"] }]
      });
      if (!path) {
        return false;
      }
      await apiClient.exportSelectedQuestionsWord(subjectId, questionIds, path);
      return true;
    },
    onSuccess: (saved) => {
      setExportMessage(saved ? "已导出 Word" : "已取消导出");
    }
  });

  async function importJsonFile(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) {
      return;
    }

    const startedAt = new Date().toISOString();
    setActiveTask({
      id: `import-${Date.now()}`,
      kind: "import_json",
      status: "running",
      title: "导入 JSON",
      current: 0,
      total: files.length,
      message: "正在读取文件",
      createdAt: startedAt,
      updatedAt: startedAt
    });

    const reports: ImportReportDto[] = [];
    try {
      for (const [index, file] of files.entries()) {
        setActiveTask((task) =>
          task
            ? {
                ...task,
                current: index,
                message: `正在导入 ${file.name}`,
                updatedAt: new Date().toISOString()
              }
            : task
        );
        reports.push(await apiClient.importJsonText(subjectId, await readFileText(file)));
      }

      const report = mergeImportReports(reports);
      setImportMessage(`已导入 ${report.added}，跳过 ${report.skipped}`);
      setImportReport(report.skipped > 0 || report.errorsCount > 0 ? report : null);
      await refreshBankData();
    } finally {
      setActiveTask(null);
    }
  }

  function exportSelectedQuestions(questionIds: string[]) {
    if (questionIds.length > 0) {
      exportSelectedMutation.mutate(questionIds);
    }
  }

  function exportSelectedQuestionsWord(questionIds: string[]) {
    if (questionIds.length > 0) {
      exportSelectedWordMutation.mutate(questionIds);
    }
  }

  function findDuplicates() {
    duplicateMutation.mutate();
  }

  function keepDuplicateQuestion(group: DuplicateQuestionGroupDto, keepId: string) {
    const deleteIds = group.questions.map((question) => question.id).filter((id) => id !== keepId);
    if (deleteIds.length === 0) {
      return;
    }
    onDeleteDuplicateQuestions(deleteIds, () => {
      setDuplicateGroups((current) => (current ? current.filter((item) => item.key !== group.key) : current));
    });
  }

  return {
    importMessage,
    exportMessage,
    importReport,
    duplicateGroups,
    activeTask,
    setImportReport,
    setDuplicateGroups,
    setActiveTask,
    importJsonFile,
    exportSelectedQuestions,
    exportSelectedQuestionsWord,
    findDuplicates,
    keepDuplicateQuestion
  };
}

export function mergeImportReports(reports: ImportReportDto[]): ImportReportDto {
  return reports.reduce<ImportReportDto>(
    (merged, report) => ({
      added: merged.added + report.added,
      skipped: merged.skipped + report.skipped,
      errorsCount: merged.errorsCount + report.errorsCount,
      errors: [...merged.errors, ...report.errors]
    }),
    { added: 0, skipped: 0, errorsCount: 0, errors: [] }
  );
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("failed to read file"));
    reader.readAsText(file);
  });
}
