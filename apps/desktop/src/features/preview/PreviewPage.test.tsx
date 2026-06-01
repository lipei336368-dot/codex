import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../app/store";
import { apiClient } from "../../shared/api/client";
import type { QuestionDto } from "../../shared/api/contracts";
import { chooseSavePath } from "../../shared/platform/files";
import { exportSheetToPngBytes } from "../export-image/exportImage";
import { PreviewPage } from "./PreviewPage";

vi.mock("../../shared/api/client", () => ({
  apiClient: {
    searchQuestions: vi.fn(),
    listGeneratedDates: vi.fn(),
    resetGeneratedDates: vi.fn(),
    writeBinaryFile: vi.fn(),
    markDrawn: vi.fn(),
    revealPath: vi.fn()
  }
}));

vi.mock("../../shared/platform/files", () => ({
  chooseSavePath: vi.fn()
}));

vi.mock("../export-image/exportImage", () => ({
  exportSheetToPngBytes: vi.fn()
}));

const choiceQuestion: QuestionDto = {
  id: "q1",
  subjectId: "pharmaceutics",
  chapterId: "pharmaceutics-01",
  questionType: "single_choice",
  stem: "溶胶剂稳定的主要原因是",
  answer: "B",
  analysis: "同种电荷相互排斥，使胶粒保持分散。",
  stemImagePath: null,
  answerImagePath: null,
  analysisImagePath: null,
  options: [
    { label: "A", text: "范德华引力强", imagePath: null, isCorrect: false },
    { label: "B", text: "分散相粒子带同种电荷", imagePath: null, isCorrect: true }
  ],
  sourceSchool: null,
  sourceYear: null,
  drawn: false
};

const shortAnswerQuestion: QuestionDto = {
  id: "q2",
  subjectId: "pharmaceutics",
  chapterId: "pharmaceutics-01",
  questionType: "short_answer",
  stem: "简述保护胶体的作用。",
  answer: "亲水性高分子吸附在胶粒表面，形成保护膜，提高溶胶稳定性。",
  analysis: null,
  stemImagePath: null,
  answerImagePath: null,
  analysisImagePath: null,
  options: [],
  sourceSchool: null,
  sourceYear: null,
  drawn: false
};

function renderPreviewPage(subjectId: "pharmaceutics" | "pharmacology" = "pharmaceutics") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PreviewPage subjectId={subjectId} />
    </QueryClientProvider>
  );
}

describe("PreviewPage", () => {
  beforeEach(() => {
    vi.useRealTimers();
    useAppStore.getState().resetApp();
    vi.clearAllMocks();
    vi.mocked(apiClient.searchQuestions).mockResolvedValue([choiceQuestion, shortAnswerQuestion]);
    vi.mocked(apiClient.listGeneratedDates).mockResolvedValue([]);
    vi.mocked(apiClient.resetGeneratedDates).mockResolvedValue(undefined);
    vi.mocked(chooseSavePath).mockResolvedValue("D:\\out\\0506-每日一题.png");
    vi.mocked(exportSheetToPngBytes).mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      width: 1080,
      height: 1920
    });
  });

  it("uses subject-specific sheet theme classes", async () => {
    renderPreviewPage("pharmacology");

    expect((await screen.findAllByTestId("export-sheet"))[0]).toHaveClass("export-theme-pharmacology");
  });

  it("renders daily question and answer sheets from available questions", async () => {
    renderPreviewPage();

    expect((await screen.findAllByTestId("preview-sheet-canvas")).length).toBe(2);
    expect((await screen.findAllByText("药剂学每日一题")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("药剂学每日一题答案").length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/溶胶剂稳定的主要原因是/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText("B").length).toBeGreaterThan(0);
    expect(screen.getAllByText("分散相粒子带同种电荷").length).toBeGreaterThan(0);
    expect(screen.getAllByText("答案：B").length).toBeGreaterThan(0);
    expect(screen.getAllByText("同种电荷相互排斥，使胶粒保持分散。").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/亲水性高分子吸附在胶粒表面，形成保护膜，提高溶胶稳定性。/).length).toBeGreaterThan(0);
  });

  it("uses bank-selected preview questions instead of fetching all available questions", async () => {
    useAppStore.getState().setGenerationStartDate("2026-05-06");
    useAppStore.getState().openPreview([shortAnswerQuestion]);

    renderPreviewPage();

    expect(screen.getAllByText(/简述保护胶体的作用。/).length).toBeGreaterThan(0);
    expect(screen.queryByText("溶胶剂稳定的主要原因是")).not.toBeInTheDocument();
    expect(apiClient.searchQuestions).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "导出图片" }));
    await waitFor(() => {
      expect(apiClient.markDrawn).toHaveBeenCalledWith("pharmaceutics", ["q2"], "2026-05-06");
    });
  });

  it("exports both preview sheets and marks questions drawn only after saving", async () => {
    useAppStore.getState().setDefaultExportDirectory("D:\\每日一题导出");
    renderPreviewPage();

    expect((await screen.findAllByText(/溶胶剂稳定的主要原因是/)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "导出图片" }));

    await waitFor(() => {
      expect(apiClient.writeBinaryFile).toHaveBeenCalledTimes(2);
    });
    expect(chooseSavePath).toHaveBeenCalledWith({
      title: "导出每日一题图片",
      defaultPath: expect.stringMatching(/^D:\\每日一题导出\\\d{4}-每日一题\.png$/),
      filters: [{ name: "PNG 图片", extensions: ["png"] }]
    });
    expect(apiClient.writeBinaryFile).toHaveBeenNthCalledWith(
      1,
      "D:\\out\\0506-每日一题.png",
      new Uint8Array([1, 2, 3])
    );
    expect(apiClient.writeBinaryFile).toHaveBeenNthCalledWith(
      2,
      "D:\\out\\0506-每日一题答案.png",
      new Uint8Array([1, 2, 3])
    );
    expect(apiClient.markDrawn).toHaveBeenCalledWith(
      "pharmaceutics",
      ["q1", "q2"],
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
    );
    expect(await screen.findByRole("status")).toHaveTextContent("已导出图片");

    fireEvent.click(screen.getByRole("button", { name: "打开所在文件夹" }));

    expect(apiClient.revealPath).toHaveBeenCalledWith("D:\\out\\0506-每日一题.png");
  });

  it("exports from hidden native sheets instead of the visible preview cards", async () => {
    renderPreviewPage();

    expect((await screen.findAllByText(/溶胶剂稳定的主要原因是/)).length).toBeGreaterThan(0);
    const previewSheets = await screen.findAllByTestId("export-sheet");
    expect(previewSheets.some((sheet) => sheet.className.includes("export-sheet-scale-preview"))).toBe(true);
    expect(previewSheets.some((sheet) => sheet.className.includes("export-sheet-scale-native"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "导出图片" }));

    await waitFor(() => {
      expect(exportSheetToPngBytes).toHaveBeenCalledTimes(2);
    });
    const exportedElements = vi.mocked(exportSheetToPngBytes).mock.calls.map(([element]) => element);
    expect(exportedElements.every((element) => element.className.includes("export-sheet-scale-native"))).toBe(true);
    expect(exportedElements.every((element) => element.closest(".export-capture-stage"))).toBeTruthy();
    expect(exportedElements.every((element) => !element.closest(".preview-sheet-card"))).toBe(true);
  });

  it("shows an export error if the save dialog cannot open", async () => {
    vi.mocked(chooseSavePath).mockRejectedValue(new Error("dialog permission denied"));
    renderPreviewPage();

    expect((await screen.findAllByTestId("export-sheet"))[0]).toBeInTheDocument();
    await waitFor(() => {
      expect(apiClient.listGeneratedDates).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "导出图片" }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("导出失败");
    });
    expect(apiClient.writeBinaryFile).not.toHaveBeenCalled();
    expect(apiClient.markDrawn).not.toHaveBeenCalled();
  });

  it("switches between multiple preview days and exports the active day", async () => {
    useAppStore.getState().openPreviewQueue([
      {
        id: "day-1",
        title: "第 1 天",
        publishDate: "2026-05-06",
        questions: [choiceQuestion]
      },
      {
        id: "day-2",
        title: "第 2 天",
        publishDate: "2026-05-07",
        questions: [shortAnswerQuestion]
      }
    ]);

    renderPreviewPage();

    expect(screen.getByText("第 1 / 2 天")).toBeInTheDocument();
    expect(screen.getAllByText(/溶胶剂稳定的主要原因是/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "下一天" }));

    expect(screen.getByText("第 2 / 2 天")).toBeInTheDocument();
    expect(screen.getAllByText(/简述保护胶体的作用。/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "导出图片" }));

    await waitFor(() => {
      expect(apiClient.markDrawn).toHaveBeenCalledWith("pharmaceutics", ["q2"], "2026-05-07");
    });
    expect(chooseSavePath).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: "0507-每日一题.png"
      })
    );
  });

  it("exports every preview day and marks each day drawn with its own date", async () => {
    useAppStore.getState().openPreviewQueue([
      {
        id: "day-1",
        title: "第 1 天",
        publishDate: "2026-05-06",
        questions: [choiceQuestion]
      },
      {
        id: "day-2",
        title: "第 2 天",
        publishDate: "2026-05-07",
        questions: [shortAnswerQuestion]
      }
    ]);

    renderPreviewPage();

    fireEvent.click(screen.getByRole("button", { name: "导出全部" }));

    await waitFor(() => {
      expect(apiClient.writeBinaryFile).toHaveBeenCalledTimes(4);
    });
    expect(apiClient.writeBinaryFile).toHaveBeenNthCalledWith(
      1,
      "D:\\out\\0506-每日一题.png",
      new Uint8Array([1, 2, 3])
    );
    expect(apiClient.writeBinaryFile).toHaveBeenNthCalledWith(
      2,
      "D:\\out\\0506-每日一题答案.png",
      new Uint8Array([1, 2, 3])
    );
    expect(apiClient.writeBinaryFile).toHaveBeenNthCalledWith(
      3,
      "D:\\out\\0507-每日一题.png",
      new Uint8Array([1, 2, 3])
    );
    expect(apiClient.writeBinaryFile).toHaveBeenNthCalledWith(
      4,
      "D:\\out\\0507-每日一题答案.png",
      new Uint8Array([1, 2, 3])
    );
    expect(apiClient.markDrawn).toHaveBeenNthCalledWith(1, "pharmaceutics", ["q1"], "2026-05-06");
    expect(apiClient.markDrawn).toHaveBeenNthCalledWith(2, "pharmaceutics", ["q2"], "2026-05-07");
    expect(await screen.findByRole("status")).toHaveTextContent("已导出全部");
  });

  it("does not mark any batch drawn when exporting all days partially fails", async () => {
    vi.mocked(apiClient.writeBinaryFile)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("disk full"));
    useAppStore.getState().openPreviewQueue([
      {
        id: "day-1",
        title: "第 1 天",
        publishDate: "2026-05-06",
        questions: [choiceQuestion]
      },
      {
        id: "day-2",
        title: "第 2 天",
        publishDate: "2026-05-07",
        questions: [shortAnswerQuestion]
      }
    ]);

    renderPreviewPage();

    fireEvent.click(screen.getByRole("button", { name: "导出全部" }));

    expect(await screen.findByText(/成功的日期未标记为已抽取/)).toBeInTheDocument();
    expect(apiClient.markDrawn).not.toHaveBeenCalled();
    expect(apiClient.resetGeneratedDates).not.toHaveBeenCalled();
  });

  it("opens a large image preview when clicking an export sheet and closes on blank area", async () => {
    renderPreviewPage();

    fireEvent.click((await screen.findAllByTestId("export-sheet"))[0]);

    expect(await screen.findByRole("dialog", { name: "图片预览" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("dialog", { name: "图片预览" }));

    expect(screen.queryByRole("dialog", { name: "图片预览" })).not.toBeInTheDocument();
  });

  it("opens large preview even when png capture fails", async () => {
    vi.mocked(exportSheetToPngBytes).mockRejectedValue(new Error("capture overflow"));
    renderPreviewPage();

    fireEvent.click((await screen.findAllByTestId("export-sheet"))[0]);

    expect(await screen.findByRole("dialog", { name: "图片预览" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("hides export error toast automatically", async () => {
    vi.mocked(chooseSavePath).mockRejectedValue(new Error("dialog permission denied"));
    renderPreviewPage();
    await waitFor(() => {
      expect(apiClient.listGeneratedDates).toHaveBeenCalled();
    });

    fireEvent.click(await screen.findByRole("button", { name: "导出图片" }));

    expect(await screen.findByRole("status")).toHaveTextContent("导出失败");

    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument(), { timeout: 2600 });
  });

  it("uses the selected publish date for the countdown on preview sheets", async () => {
    useAppStore.getState().setGenerationStartDate("2026-05-18");
    useAppStore.getState().setExamDate("2026-12-26");

    renderPreviewPage();

    expect(screen.getAllByText("距离考研还有 222 天").length).toBeGreaterThanOrEqual(2);
  });

  it("refreshes the preview date and countdown when selecting a calendar day", async () => {
    useAppStore.getState().setGenerationStartDate("2026-05-27");
    useAppStore.getState().setExamDate("2026-12-19");
    useAppStore.getState().openPreview([shortAnswerQuestion]);

    renderPreviewPage();

    expect(screen.getByText("日期：05月27日")).toBeInTheDocument();
    expect(screen.getAllByText("05月27日").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("距离考研还有 206 天").length).toBeGreaterThanOrEqual(2);

    fireEvent.click(await screen.findByRole("button", { name: /2026-05-28/ }));

    expect(screen.getByLabelText("生成日期")).toHaveValue("2026-05-28");
    expect(screen.getByText("日期：05月28日")).toBeInTheDocument();
    expect(screen.getAllByText("05月28日").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("距离考研还有 205 天").length).toBeGreaterThanOrEqual(2);
  });

  it("asks before overwriting an already generated date and resets that date before marking new questions", async () => {
    vi.mocked(apiClient.listGeneratedDates).mockResolvedValue(["2026-05-06"]);
    useAppStore.getState().openPreviewQueue([
      {
        id: "day-1",
        title: "第 1 天",
        publishDate: "2026-05-06",
        questions: [choiceQuestion]
      }
    ]);
    renderPreviewPage();

    fireEvent.click(screen.getByRole("button", { name: "导出图片" }));

    expect(await screen.findByRole("dialog")).toHaveTextContent("该日期已生成");
    expect(screen.queryByRole("dialog", { name: "图片预览" })).not.toBeInTheDocument();
    expect(exportSheetToPngBytes).not.toHaveBeenCalled();
    expect(apiClient.writeBinaryFile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认覆盖" }));

    await waitFor(() => {
      expect(apiClient.resetGeneratedDates).toHaveBeenCalledWith("pharmaceutics", ["2026-05-06"]);
    });
    expect(apiClient.markDrawn).toHaveBeenCalledWith("pharmaceutics", ["q1"], "2026-05-06");
  });
});
