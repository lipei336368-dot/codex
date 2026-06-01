import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../../app/store";
import { apiClient } from "../../shared/api/client";
import { chooseSavePath, saveTextFile } from "../../shared/platform/files";
import type { QuestionDto } from "../../shared/api/contracts";
import { BankPage } from "./BankPage";

vi.mock("../../shared/api/client", () => ({
  apiClient: {
    getBankSummary: vi.fn(),
    listChapters: vi.fn(),
    searchQuestions: vi.fn(),
    searchQuestionsPaged: vi.fn(),
    updateQuestion: vi.fn(),
    deleteQuestions: vi.fn(),
    resetDrawn: vi.fn(),
    saveQuestionAsset: vi.fn(),
    importJsonText: vi.fn(),
    findDuplicateQuestions: vi.fn(),
    exportSelectedQuestionsJson: vi.fn(),
    exportSelectedQuestionsWord: vi.fn()
  }
}));

vi.mock("../../shared/platform/files", () => ({
  chooseSavePath: vi.fn(),
  saveTextFile: vi.fn()
}));

const questions: QuestionDto[] = [
  {
    id: "q1",
    subjectId: "pharmaceutics",
    chapterId: "chapter-1",
    questionType: "single_choice",
    stem: "Stable emulsion question",
    answer: "A",
    analysis: "analysis",
    stemImagePath: "D:/assets/stem.png",
    answerImagePath: null,
    analysisImagePath: null,
    options: [
      { label: "A", text: "correct", imagePath: "D:/assets/option-a.png", isCorrect: true },
      { label: "B", text: "wrong", imagePath: null, isCorrect: false }
    ],
    sourceSchool: null,
    sourceYear: null,
    drawn: false
  },
  {
    id: "q2",
    subjectId: "pharmaceutics",
    chapterId: "chapter-2",
    questionType: "short_answer",
    stem: "Drawn short answer",
    answer: "answer",
    analysis: null,
    stemImagePath: null,
    answerImagePath: null,
    analysisImagePath: null,
    options: [],
    sourceSchool: null,
    sourceYear: null,
    drawn: true
  }
];

function renderBankPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BankPage subjectId="pharmaceutics" />
    </QueryClientProvider>
  );
}

function questionRow(stem: string) {
  return screen.getByText(stem).closest(".virtual-question-row") as HTMLElement;
}

describe("BankPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getBankSummary).mockResolvedValue({
      total: 2,
      available: 1,
      byType: { singleChoice: 1, multipleChoice: 0, shortAnswer: 1, essay: 0 },
      availableByType: { singleChoice: 1, multipleChoice: 0, shortAnswer: 0, essay: 0 }
    });
    vi.mocked(apiClient.listChapters).mockResolvedValue([
      { id: "chapter-1", subjectId: "pharmaceutics", order: 1, name: "Chapter 1", noRequirement: false },
      { id: "chapter-2", subjectId: "pharmaceutics", order: 2, name: "Chapter 2", noRequirement: false }
    ]);
    vi.mocked(apiClient.searchQuestions).mockResolvedValue(questions);
    vi.mocked(apiClient.searchQuestionsPaged).mockResolvedValue({ total: questions.length, items: questions });
    vi.mocked(apiClient.updateQuestion).mockResolvedValue(undefined);
    vi.mocked(apiClient.deleteQuestions).mockResolvedValue(undefined);
    vi.mocked(apiClient.resetDrawn).mockResolvedValue(undefined);
    vi.mocked(apiClient.saveQuestionAsset).mockResolvedValue("D:/assets/new-stem.png");
    vi.mocked(apiClient.importJsonText).mockResolvedValue({ added: 1, skipped: 0, errorsCount: 0, errors: [] });
    vi.mocked(apiClient.findDuplicateQuestions).mockResolvedValue([]);
    vi.mocked(apiClient.exportSelectedQuestionsJson).mockResolvedValue("{\"questions\":[]}");
    vi.mocked(apiClient.exportSelectedQuestionsWord).mockResolvedValue(undefined);
    vi.mocked(chooseSavePath).mockResolvedValue("D:/out/questions.docx");
    vi.mocked(saveTextFile).mockResolvedValue("D:/out/questions.json");
    useAppStore.getState().resetApp();
  });

  it("renders loaded bank rows from the paged query", async () => {
    renderBankPage();

    expect(await screen.findByText("Stable emulsion question")).toBeInTheDocument();
    expect(screen.getByText("Drawn short answer")).toBeInTheDocument();
    expect(apiClient.searchQuestions).not.toHaveBeenCalled();
    expect(apiClient.searchQuestionsPaged).toHaveBeenCalledWith({
      subjectId: "pharmaceutics",
      chapterId: null,
      questionType: null,
      query: null,
      includeDrawn: true,
      offset: 0,
      limit: 80
    });
  });

  it("combines short answer and essay counts into one summary card after multiple choice", async () => {
    vi.mocked(apiClient.getBankSummary).mockResolvedValue({
      total: 6,
      available: 4,
      byType: { singleChoice: 1, multipleChoice: 2, shortAnswer: 1, essay: 2 },
      availableByType: { singleChoice: 1, multipleChoice: 1, shortAnswer: 1, essay: 1 }
    });

    renderBankPage();

    await waitFor(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(".summary-card"));
      expect(cards).toHaveLength(4);
      expect(cards[0].textContent).toContain("6");
      expect(cards[1].textContent).toContain("1");
      expect(cards[2].textContent).toContain("2");
      expect(cards[3].textContent).toContain("3");
      expect(cards[3].textContent).toContain("2");
    });
  });

  it("passes search text to the paged bank search command", async () => {
    renderBankPage();

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "emulsion" } });

    await waitFor(() => {
      expect(apiClient.searchQuestionsPaged).toHaveBeenLastCalledWith({
        subjectId: "pharmaceutics",
        chapterId: null,
        questionType: null,
        query: "emulsion",
        includeDrawn: true,
        offset: 0,
        limit: 80
      });
    });
  });

  it("filters by summary type card using the paged search command", async () => {
    renderBankPage();

    await screen.findByText("Stable emulsion question");
    const summaryCards = Array.from(document.querySelectorAll<HTMLButtonElement>(".summary-card"));
    fireEvent.click(summaryCards[1]);

    await waitFor(() => {
      expect(apiClient.searchQuestionsPaged).toHaveBeenLastCalledWith({
        subjectId: "pharmaceutics",
        chapterId: null,
        questionType: "single_choice",
        query: null,
        includeDrawn: true,
        offset: 0,
        limit: 80
      });
    });
  });

  it("filters by chapter using the paged search command", async () => {
    renderBankPage();

    fireEvent.click(await screen.findByRole("button", { name: "Chapter 2" }));

    await waitFor(() => {
      expect(apiClient.searchQuestionsPaged).toHaveBeenLastCalledWith({
        subjectId: "pharmaceutics",
        chapterId: "chapter-2",
        questionType: null,
        query: null,
        includeDrawn: true,
        offset: 0,
        limit: 80
      });
    });
  });

  it("loads the next page when the virtual list asks for more rows", async () => {
    vi.mocked(apiClient.searchQuestionsPaged)
      .mockResolvedValueOnce({ total: 3, items: [questions[0]] })
      .mockResolvedValueOnce({ total: 3, items: [questions[1]] });
    renderBankPage();

    await screen.findByText("Stable emulsion question");
    fireEvent.scroll(screen.getByRole("list"), { target: { scrollTop: 10_000 } });

    await waitFor(() => {
      expect(apiClient.searchQuestionsPaged).toHaveBeenCalledWith({
        subjectId: "pharmaceutics",
        chapterId: null,
        questionType: null,
        query: null,
        includeDrawn: true,
        offset: 1,
        limit: 80
      });
    });
  });

  it("selects only loaded available questions and opens preview with them", async () => {
    renderBankPage();

    await screen.findByText("Stable emulsion question");
    const row = questionRow("Stable emulsion question");
    fireEvent.click(within(row).getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /生成|鐢熸垚/ }));

    expect(useAppStore.getState().activePage).toBe("preview");
    expect(useAppStore.getState().previewQuestions?.map((question) => question.id)).toEqual(["q1"]);
  });

  it("resets a drawn question from the row action", async () => {
    renderBankPage();

    await screen.findByText("Drawn short answer");
    fireEvent.click(within(questionRow("Drawn short answer")).getByRole("button"));

    await waitFor(() => {
      expect(apiClient.resetDrawn).toHaveBeenCalledWith("pharmaceutics", ["q2"]);
    });
  });
});
