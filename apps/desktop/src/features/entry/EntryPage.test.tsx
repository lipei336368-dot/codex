import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../shared/api/client";
import { EntryPage } from "./EntryPage";

vi.mock("../../shared/api/client", () => ({
  apiClient: {
    listChapters: vi.fn(),
    createQuestion: vi.fn(),
    saveQuestionAsset: vi.fn()
  }
}));

function renderEntryPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EntryPage subjectId="pharmaceutics" />
    </QueryClientProvider>
  );
}

describe("EntryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.listChapters).mockResolvedValue([
      { id: "pharmaceutics-01", subjectId: "pharmaceutics", order: 1, name: "第一章 绪论", noRequirement: false }
    ]);
    vi.mocked(apiClient.createQuestion).mockResolvedValue("q1");
    vi.mocked(apiClient.saveQuestionAsset).mockResolvedValue("D:/app/assets/pharmaceutics/pasted.png");
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:preview") });
  });

  it("saves a single choice question with selected correct option", async () => {
    renderEntryPage();

    await screen.findByText("第一章 绪论");
    fireEvent.change(screen.getByLabelText("题干"), { target: { value: "溶胶剂加入电解质会发生什么？" } });
    fireEvent.change(screen.getByLabelText("A 选项"), { target: { value: "乳化" } });
    fireEvent.change(screen.getByLabelText("B 选项"), { target: { value: "聚沉" } });
    fireEvent.click(screen.getByLabelText("B 正确答案"));
    fireEvent.change(screen.getByLabelText("解析"), { target: { value: "电解质压缩双电层，导致聚沉。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存后继续" }));

    await waitFor(() => {
      expect(apiClient.createQuestion).toHaveBeenCalledWith({
        subjectId: "pharmaceutics",
        chapterId: "pharmaceutics-01",
        questionType: "single_choice",
        stem: "溶胶剂加入电解质会发生什么？",
        answer: "B",
        analysis: "电解质压缩双电层，导致聚沉。",
        stemImagePath: null,
        answerImagePath: null,
        analysisImagePath: null,
        options: [
          { label: "A", text: "乳化", imagePath: null, isCorrect: false },
          { label: "B", text: "聚沉", imagePath: null, isCorrect: true }
        ],
        sourceSchool: null,
        sourceYear: null
      });
      expect(screen.getByText("已保存：选择题")).toBeInTheDocument();
      expect(screen.getByLabelText("题干")).toHaveValue("");
    });
  });

  it("saves a combined short answer essay question without options or analysis", async () => {
    renderEntryPage();

    await screen.findByText("第一章 绪论");
    fireEvent.click(screen.getByRole("button", { name: "简答论述题" }));
    expect(screen.queryByLabelText("A 选项")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("解析")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("题干"), { target: { value: "简述溶胶剂稳定性的原因。" } });
    fireEvent.change(screen.getByLabelText("答案"), { target: { value: "胶粒带同种电荷，彼此排斥。" } });
    fireEvent.click(screen.getByRole("button", { name: "保存后继续" }));

    await waitFor(() => {
      expect(apiClient.createQuestion).toHaveBeenCalledWith({
        subjectId: "pharmaceutics",
        chapterId: "pharmaceutics-01",
        questionType: "short_answer",
        stem: "简述溶胶剂稳定性的原因。",
        answer: "胶粒带同种电荷，彼此排斥。",
        analysis: null,
        stemImagePath: null,
        answerImagePath: null,
        analysisImagePath: null,
        options: [],
        sourceSchool: null,
        sourceYear: null
      });
      expect(screen.getByText("已保存：简答论述题")).toBeInTheDocument();
    });
  });

  it("offers only choice, multiple choice, and combined short answer essay entry types", async () => {
    renderEntryPage();

    await waitFor(() => {
      expect(document.querySelectorAll(".entry-type-control .segment")).toHaveLength(3);
    });
    const typeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(".entry-type-control .segment"));

    fireEvent.click(typeButtons[2]);
    const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea"));
    fireEvent.change(textareas[0], { target: { value: "combined open answer stem" } });
    fireEvent.change(textareas[1], { target: { value: "combined open answer" } });
    fireEvent.click(document.querySelector<HTMLButtonElement>(".bank-edit-actions .button-primary")!);

    await waitFor(() => {
      expect(apiClient.createQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          questionType: "short_answer",
          answer: "combined open answer",
          options: []
        })
      );
    });
  });

  it("does not save a choice question when the selected answer option is empty", async () => {
    renderEntryPage();

    await screen.findByText("第一章 绪论");
    fireEvent.change(screen.getByLabelText("题干"), { target: { value: "空选项校验题" } });
    fireEvent.change(screen.getByLabelText("A 选项"), { target: { value: "有效选项" } });
    fireEvent.click(screen.getByLabelText("D 正确答案"));
    fireEvent.change(screen.getByLabelText("解析"), { target: { value: "解析内容" } });
    fireEvent.click(screen.getByRole("button", { name: "保存后继续" }));

    expect(await screen.findByText("正确答案对应的选项不能为空")).toBeInTheDocument();
    expect(apiClient.createQuestion).not.toHaveBeenCalled();
  });

  it("lets a single choice correct answer be unchecked and blocks saving without one", async () => {
    renderEntryPage();

    await screen.findByText("第一章 绪论");
    fireEvent.change(screen.getByLabelText("题干"), { target: { value: "single answer toggle test" } });
    fireEvent.change(screen.getByLabelText("A 选项"), { target: { value: "A option" } });
    fireEvent.change(screen.getByLabelText("B 选项"), { target: { value: "B option" } });
    fireEvent.change(screen.getByLabelText("解析"), { target: { value: "analysis" } });
    fireEvent.click(screen.getByLabelText("A 正确答案"));
    fireEvent.click(screen.getByLabelText("A 正确答案"));
    fireEvent.click(screen.getByRole("button", { name: "保存后继续" }));

    expect(await screen.findByText("单选题必须选择一个正确答案")).toBeInTheDocument();
    expect(apiClient.createQuestion).not.toHaveBeenCalled();
  });

  it("requires at least two correct answers for multiple choice questions", async () => {
    renderEntryPage();

    await screen.findByText("第一章 绪论");
    fireEvent.click(screen.getByRole("button", { name: "多选题" }));
    fireEvent.change(screen.getByLabelText("题干"), { target: { value: "multiple answer count test" } });
    fireEvent.change(screen.getByLabelText("A 选项"), { target: { value: "A option" } });
    fireEvent.change(screen.getByLabelText("B 选项"), { target: { value: "B option" } });
    fireEvent.click(screen.getByLabelText("A 正确答案"));
    fireEvent.change(screen.getByLabelText("解析"), { target: { value: "analysis" } });
    fireEvent.click(screen.getByRole("button", { name: "保存后继续" }));

    expect(await screen.findByText("多选题至少选择两个正确答案")).toBeInTheDocument();
    expect(apiClient.createQuestion).not.toHaveBeenCalled();
  });

  it("requires an answer for short answer questions", async () => {
    renderEntryPage();

    await screen.findByText("第一章 绪论");
    fireEvent.click(screen.getByRole("button", { name: "简答论述题" }));
    fireEvent.change(screen.getByLabelText("题干"), { target: { value: "缺少答案的简答题" } });
    fireEvent.click(screen.getByRole("button", { name: "保存后继续" }));

    expect(await screen.findByText("答案不能为空")).toBeInTheDocument();
    expect(apiClient.createQuestion).not.toHaveBeenCalled();
  });

  it("adds and removes option rows", async () => {
    renderEntryPage();

    await screen.findByText("第一章 绪论");
    fireEvent.click(screen.getByRole("button", { name: "添加选项" }));
    expect(screen.getByLabelText("E 选项")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "删除 E 选项" }));
    expect(screen.queryByLabelText("E 选项")).not.toBeInTheDocument();
  });

  it("saves a pasted stem image and shows its preview", async () => {
    renderEntryPage();

    await screen.findByText("第一章 绪论");
    const image = new File(["image-bytes"], "stem.png", { type: "image/png" });
    Object.defineProperty(image, "arrayBuffer", {
      value: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer)
    });

    fireEvent.paste(screen.getByLabelText("题干"), {
      clipboardData: {
        files: [image]
      }
    });

    expect(await screen.findByAltText("题干图片预览")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("A 选项"), { target: { value: "正确" } });
    fireEvent.change(screen.getByLabelText("B 选项"), { target: { value: "错误" } });
    fireEvent.click(screen.getByLabelText("A 正确答案"));
    fireEvent.change(screen.getByLabelText("解析"), { target: { value: "图片题解析" } });
    fireEvent.click(screen.getByRole("button", { name: "保存后继续" }));

    await waitFor(() => {
      expect(apiClient.saveQuestionAsset).toHaveBeenCalledWith(
        "pharmaceutics",
        "stem.png",
        new Uint8Array([1, 2, 3])
      );
      expect(apiClient.createQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          stem: "",
          stemImagePath: "D:/app/assets/pharmaceutics/pasted.png"
        })
      );
    });
  });
});
