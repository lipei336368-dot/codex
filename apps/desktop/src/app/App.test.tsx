import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuestionDto } from "../shared/api/contracts";
import { App } from "./App";
import { useAppStore } from "./store";

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

const previewQuestion: QuestionDto = {
  id: "preview-question-1",
  subjectId: "pharmaceutics",
  chapterId: "pharmaceutics-01",
  questionType: "single_choice",
  stem: "预览返回测试题",
  answer: "A",
  analysis: "测试解析",
  stemImagePath: null,
  answerImagePath: null,
  analysisImagePath: null,
  options: [
    { label: "A", text: "正确", imagePath: null, isCorrect: true },
    { label: "B", text: "错误", imagePath: null, isCorrect: false }
  ],
  sourceSchool: null,
  sourceYear: null,
  drawn: false
};

async function selectPharmaceuticsSubject() {
  fireEvent.click(screen.getByRole("button", { name: "药剂学" }));
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

describe("App page flow", () => {
  beforeEach(() => {
    useAppStore.getState().resetApp();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps global navigation in the shell after subject selection", async () => {
    renderApp();

    await selectPharmaceuticsSubject();

    expect(await screen.findByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(screen.getAllByText("药剂学").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "切换科目" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "生成" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "题库" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "录题" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
  });

  it("marks the active sidebar page", async () => {
    renderApp();

    await selectPharmaceuticsSubject();
    await screen.findByRole("navigation", { name: "主导航" });
    fireEvent.click(screen.getByRole("button", { name: "题库" }));

    expect(screen.getByRole("button", { name: "题库" })).toHaveAttribute("aria-current", "page");
  });

  it("shows the current date and exam countdown in the top bar", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-18T08:00:00+08:00"));
    renderApp();

    await selectPharmaceuticsSubject();

    expect(screen.getByText("2026-05-18")).toBeInTheDocument();
    expect(screen.getByText(/距离考研/)).toBeInTheDocument();
  });

  it("returns from preview to the page that opened it", async () => {
    renderApp();

    await selectPharmaceuticsSubject();
    await screen.findByRole("navigation", { name: "主导航" });
    fireEvent.click(screen.getByRole("button", { name: "题库" }));
    act(() => {
      useAppStore.getState().openPreviewQueue([
        {
          id: "preview-batch-1",
          title: "预览返回测试",
          publishDate: "2026-05-19",
          questions: [previewQuestion]
        }
      ]);
    });

    expect(await screen.findByRole("heading", { name: "预览每日一题" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回编辑" }));

    expect(await screen.findByRole("heading", { name: "题库" })).toBeInTheDocument();
  });
});
