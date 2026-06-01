import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../app/store";
import { apiClient } from "../../shared/api/client";
import type { QuestionDto } from "../../shared/api/contracts";
import { GeneratePage } from "./GeneratePage";

vi.mock("../../shared/api/client", () => ({
  apiClient: {
    listChapters: vi.fn(),
    listGeneratedDates: vi.fn(),
    resetGeneratedDates: vi.fn(),
    searchQuestions: vi.fn(),
    markDrawn: vi.fn()
  }
}));

function makeQuestions(type: QuestionDto["questionType"], prefix: string, count: number): QuestionDto[] {
  return Array.from({ length: count }, (_, index): QuestionDto => ({
    id: `${type}-${index + 1}`,
    subjectId: "pharmaceutics",
    chapterId: "pharmaceutics-01",
    questionType: type,
    stem: `${prefix} ${index + 1}`,
    answer: "A",
    analysis: type === "short_answer" || type === "essay" ? null : "解析",
    stemImagePath: null,
    answerImagePath: null,
    analysisImagePath: null,
    options:
      type === "short_answer" || type === "essay"
        ? []
        : [
            { label: "A", text: "正确", imagePath: null, isCorrect: true },
            { label: "B", text: "错误", imagePath: null, isCorrect: false }
          ],
    sourceSchool: null,
    sourceYear: null,
    drawn: false
  }));
}

const questions = makeQuestions("single_choice", "选择题", 8);

function renderGeneratePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <GeneratePage subjectId="pharmaceutics" />
    </QueryClientProvider>
  );
}

describe("GeneratePage", () => {
  beforeEach(() => {
    useAppStore.getState().resetApp();
    useAppStore.getState().setGenerationStartDate("2026-05-18");
    vi.clearAllMocks();
    vi.mocked(apiClient.listChapters).mockResolvedValue([
      { id: "pharmaceutics-01", subjectId: "pharmaceutics", order: 1, name: "第一章 绪论", noRequirement: false },
      {
        id: "pharmaceutics-02",
        subjectId: "pharmaceutics",
        order: 2,
        name: "第二章 药物的物理化学相互作用",
        noRequirement: false
      }
    ]);
    vi.mocked(apiClient.listGeneratedDates).mockResolvedValue(["2026-05-06", "2026-05-18"]);
    vi.mocked(apiClient.resetGeneratedDates).mockResolvedValue(undefined);
    vi.mocked(apiClient.searchQuestions).mockResolvedValue(questions);
  });

  it("shows generated dates for the current subject calendar", async () => {
    renderGeneratePage();

    expect(apiClient.listGeneratedDates).toHaveBeenCalledWith("pharmaceutics");
    expect(await screen.findByLabelText("2026-05-06 已生成")).toHaveClass("calendar-day-generated");
    expect(screen.getByLabelText("2026-05-18 已生成")).toHaveClass("calendar-day-active");
  });

  it("searches available questions by subject, chapter, type, and text", async () => {
    renderGeneratePage();

    fireEvent.change(screen.getByLabelText("搜索题干"), { target: { value: "溶胶" } });
    fireEvent.click(await screen.findByRole("button", { name: "第二章 药物的物理化学相互作用" }));

    await waitFor(() => {
      expect(apiClient.searchQuestions).toHaveBeenLastCalledWith({
        subjectId: "pharmaceutics",
        chapterId: "pharmaceutics-02",
        questionType: null,
        query: "溶胶",
        includeDrawn: false
      });
    });
  });

  it("builds a preview batch from manually selected questions without marking drawn", async () => {
    renderGeneratePage();

    fireEvent.click(await screen.findByText("选择题 1"));
    expect(screen.getByRole("complementary", { name: "选题篮" })).toHaveTextContent("1 题");

    fireEvent.click(screen.getByRole("button", { name: "生成预览" }));

    expect(useAppStore.getState().activePage).toBe("preview");
    expect(useAppStore.getState().previewBatches?.[0].questions.map((question) => question.id)).toEqual(["single_choice-1"]);
    expect(apiClient.markDrawn).not.toHaveBeenCalled();
  });

  it("removes a question from the selection basket", async () => {
    renderGeneratePage();

    fireEvent.click(await screen.findByText("选择题 1"));
    fireEvent.click(screen.getByRole("button", { name: "移除" }));

    expect(screen.getByRole("complementary", { name: "选题篮" })).toHaveTextContent("0 题");
    expect(screen.getByRole("button", { name: "生成预览" })).toBeDisabled();
  });

  it("uses the selected calendar date for preview publishing", async () => {
    renderGeneratePage();

    fireEvent.click(await screen.findByLabelText("2026-05-06 已生成"));
    fireEvent.click(await screen.findByText("选择题 1"));
    fireEvent.click(screen.getByRole("button", { name: "生成预览" }));

    expect(useAppStore.getState().previewBatches?.[0].publishDate).toBe("2026-05-06");
  });

  it("resets a generated date from the history panel", async () => {
    renderGeneratePage();

    expect(await screen.findByText("2026-05-06")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重置 2026-05-06" }));
    fireEvent.click(screen.getByRole("button", { name: "确认重置" }));

    await waitFor(() => {
      expect(apiClient.resetGeneratedDates).toHaveBeenCalledWith("pharmaceutics", ["2026-05-06"]);
    });
  });
});
