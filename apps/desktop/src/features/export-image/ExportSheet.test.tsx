import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { QuestionDto } from "../../shared/api/contracts";
import { ExportSheet } from "./ExportSheet";
import { longChoiceQuestions } from "./__fixtures__/stressQuestions";
import { assertExportSheetFits } from "./exportImage";
import { buildExportSheetModel } from "./sheetModel";
import { getExportTheme } from "./themes";

const choiceQuestion: QuestionDto = {
  id: "q1",
  subjectId: "pharmaceutics",
  chapterId: "pharmaceutics-01",
  questionType: "single_choice",
  stem: "下列关于固体分散体的叙述中错误的是（ ）",
  answer: "B",
  analysis: "共沉淀物中的药物多以无定形状态分散。",
  stemImagePath: null,
  answerImagePath: null,
  analysisImagePath: null,
  options: [
    { label: "A", text: "药物在固态溶液中是以分子状态分散的", imagePath: null, isCorrect: false },
    { label: "B", text: "共沉淀物中的药物是以稳定晶型存在的无定形", imagePath: null, isCorrect: true }
  ],
  sourceSchool: null,
  sourceYear: null,
  drawn: false
};

describe("export image themes", () => {
  it("returns a distinct visual theme for each subject", () => {
    expect(getExportTheme("pharmacology").icon).toBe("pulse");
    expect(getExportTheme("medicinal_chemistry").icon).toBe("molecule");
    expect(getExportTheme("pharmaceutical_analysis").icon).toBe("analysis");

    const classNames = [
      getExportTheme("pharmaceutics").className,
      getExportTheme("pharmacology").className,
      getExportTheme("medicinal_chemistry").className,
      getExportTheme("pharmaceutical_analysis").className
    ];
    expect(new Set(classNames).size).toBe(4);
  });
});

describe("buildExportSheetModel", () => {
  it("builds question and answer models with normalized Chinese labels", () => {
    const theme = getExportTheme("pharmaceutics");
    const questionModel = buildExportSheetModel({
      kind: "question",
      questions: [choiceQuestion],
      subjectId: "pharmaceutics",
      publishDate: "2026-05-20",
      examDate: "2026-12-19",
      theme
    });
    const answerModel = buildExportSheetModel({
      kind: "answer",
      questions: [choiceQuestion],
      subjectId: "pharmaceutics",
      publishDate: "2026-05-20",
      examDate: "2026-12-19",
      theme
    });

    expect(questionModel.title).toBe("药剂学每日一题");
    expect(answerModel.title).toBe("药剂学每日一题答案");
    expect(questionModel.dateLabel).toBe("05月20日");
    expect(questionModel.questions[0].typeLabel).toBe("选择题");
    expect(questionModel.questions[0].index).toBe(1);
    expect(answerModel.questions[0].answerText).toBe("共沉淀物中的药物是以稳定晶型存在的无定形");
  });

  it("uses normalized Chinese type labels for all question types", () => {
    const questions: QuestionDto[] = [
      { ...choiceQuestion, id: "single", questionType: "single_choice" },
      { ...choiceQuestion, id: "multiple", questionType: "multiple_choice" },
      { ...choiceQuestion, id: "short", questionType: "short_answer", options: [] },
      { ...choiceQuestion, id: "essay", questionType: "essay", options: [] }
    ];
    const model = buildExportSheetModel({
      kind: "question",
      questions,
      subjectId: "pharmaceutics",
      publishDate: "2026-05-20",
      examDate: "2026-12-19",
      theme: getExportTheme("pharmaceutics")
    });

    expect(model.questions.map((question) => question.typeLabel)).toEqual([
      "选择题",
      "多选题",
      "简答论述题",
      "简答论述题"
    ]);
  });

  it("calculates the exam countdown from the publish date", () => {
    const theme = getExportTheme("pharmaceutics");
    const todayModel = buildExportSheetModel({
      kind: "question",
      questions: [choiceQuestion],
      subjectId: "pharmaceutics",
      publishDate: "2026-05-27",
      examDate: "2026-12-19",
      theme
    });
    const tomorrowModel = buildExportSheetModel({
      kind: "question",
      questions: [choiceQuestion],
      subjectId: "pharmaceutics",
      publishDate: "2026-05-28",
      examDate: "2026-12-19",
      theme
    });

    expect(todayModel.meta.daysUntilExam).toBe(206);
    expect(tomorrowModel.meta.daysUntilExam).toBe(205);
  });
});

describe("ExportSheet", () => {
  it("uses subject-specific title and icon class for all four subjects", () => {
    const expectedTitles = {
      pharmaceutics: "药剂学每日一题",
      pharmacology: "药理学每日一题",
      medicinal_chemistry: "药物化学每日一题",
      pharmaceutical_analysis: "药物分析每日一题"
    } as const;
    const subjectIds = ["pharmaceutics", "pharmacology", "medicinal_chemistry", "pharmaceutical_analysis"] as const;

    for (const subjectId of subjectIds) {
      const model = buildExportSheetModel({
        kind: "question",
        questions: longChoiceQuestions.slice(0, 1),
        subjectId,
        publishDate: "2026-05-20",
        examDate: "2026-12-19",
        theme: getExportTheme(subjectId)
      });
      const { unmount } = render(<ExportSheet model={model} />);

      expect(screen.getByTestId("export-sheet")).toHaveClass(getExportTheme(subjectId).className);
      expect(screen.getByTestId("export-sheet").querySelector(`.export-sheet-icon-${getExportTheme(subjectId).icon}`)).toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(expectedTitles[subjectId]);
      unmount();
    }
  });

  it("renders a question sheet with native export attributes and real Chinese visible strings", () => {
    const model = buildExportSheetModel({
      kind: "question",
      questions: [choiceQuestion],
      subjectId: "pharmaceutics",
      publishDate: "2026-05-20",
      examDate: "2026-12-19",
      theme: getExportTheme("pharmaceutics")
    });

    render(<ExportSheet model={model} />);

    expect(screen.getByTestId("export-sheet")).toHaveAttribute("data-density", model.density);
    expect(screen.getByText("药剂学每日一题")).toBeInTheDocument();
    expect(screen.getByText("05月20日")).toBeInTheDocument();
    expect(screen.getByText("毅研为定药学考研")).toBeInTheDocument();
    expect(screen.getByText(/距离考研还有 \d+ 天/)).toBeInTheDocument();
    expect(screen.getByText("毅研为定832770398")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders answer sheet without option list but with answer and analysis", () => {
    const model = buildExportSheetModel({
      kind: "answer",
      questions: [choiceQuestion],
      subjectId: "pharmaceutics",
      publishDate: "2026-05-20",
      examDate: "2026-12-19",
      theme: getExportTheme("pharmaceutics")
    });

    render(<ExportSheet model={model} />);

    expect(screen.getByText("药剂学每日一题答案")).toBeInTheDocument();
    expect(screen.getByText("答案：B")).toBeInTheDocument();
    expect(screen.getByText("共沉淀物中的药物多以无定形状态分散。")).toBeInTheDocument();
  });

  it("keeps long short-answer text out of the compact answer badge", () => {
    const longAnswer = "盐酸普鲁帕嗪的溶解度小、吸收较差，拟制备成包合物，应围绕处方工艺验证、包合率测定、稳定性和释放行为进行评价。";
    const shortAnswerQuestion: QuestionDto = {
      ...choiceQuestion,
      id: "short-answer",
      questionType: "short_answer",
      stem: "请提供处方设计、制备工艺以及包合物验证方法。",
      answer: longAnswer,
      analysis: "解析文字",
      options: []
    };
    const model = buildExportSheetModel({
      kind: "answer",
      questions: [shortAnswerQuestion],
      subjectId: "pharmaceutics",
      publishDate: "2026-05-20",
      examDate: "2026-12-19",
      theme: getExportTheme("pharmaceutics")
    });

    render(<ExportSheet model={model} />);

    expect(screen.getByText("参考答案")).toHaveClass("export-answer-pill");
    expect(screen.getByText(longAnswer).closest(".export-answer-text")).toBeInTheDocument();
    expect(screen.queryByText(`答案：${longAnswer}`)).not.toBeInTheDocument();
  });

  it("breaks numbered short-answer points onto separate lines", () => {
    const answer = "本题可按处方-工艺-验证设计。(1) 处方设计：选择适宜比例。(2) 制备工艺：研磨或共沉淀。(3) 验证方法：测定包合率与释放度。";
    const model = buildExportSheetModel({
      kind: "answer",
      questions: [
        {
          ...choiceQuestion,
          id: "numbered-short-answer",
          questionType: "short_answer",
          stem: "请说明包合物的处方设计、制备工艺和验证方法。",
          answer,
          options: []
        }
      ],
      subjectId: "pharmaceutics",
      publishDate: "2026-05-20",
      examDate: "2026-12-19",
      theme: getExportTheme("pharmaceutics")
    });

    render(<ExportSheet model={model} />);

    const answerText = document.querySelector(".export-answer-text") as HTMLElement;
    const lines = Array.from(answerText.querySelectorAll("[data-testid='export-structured-line']"));
    expect(lines.map((line) => line.textContent)).toEqual([
      "本题可按处方-工艺-验证设计。",
      "(1) 处方设计：选择适宜比例。",
      "(2) 制备工艺：研磨或共沉淀。",
      "(3) 验证方法：测定包合率与释放度。"
    ]);
  });

  it("renders long choice content without duplicating option labels", () => {
    const longQuestion = {
      ...choiceQuestion,
      stem: "下列关于药物制剂稳定性的叙述，正确的是（ ）。".repeat(8),
      options: [
        { label: "A", text: "长选项".repeat(35), imagePath: null, isCorrect: false },
        { label: "B", text: "长选项".repeat(35), imagePath: null, isCorrect: true },
        { label: "C", text: "长选项".repeat(35), imagePath: null, isCorrect: false },
        { label: "D", text: "长选项".repeat(35), imagePath: null, isCorrect: false }
      ]
    };
    const model = buildExportSheetModel({
      kind: "question",
      questions: [longQuestion, { ...longQuestion, id: "q2" }, { ...longQuestion, id: "q3" }, { ...longQuestion, id: "q4" }],
      subjectId: "pharmaceutics",
      publishDate: "2026-05-20",
      examDate: "2026-12-19",
      theme: getExportTheme("pharmaceutics")
    });

    render(<ExportSheet model={model} />);

    expect(screen.getAllByText("A")).toHaveLength(4);
  });

  it("renders image options with one visible label per option", () => {
    const imageQuestion: QuestionDto = {
      ...choiceQuestion,
      options: [
        { label: "A", text: null, imagePath: "D:\\images\\a.webp", isCorrect: true },
        { label: "B", text: null, imagePath: "D:\\images\\b.png", isCorrect: false },
        { label: "C", text: "文字选项", imagePath: null, isCorrect: false }
      ]
    };
    const model = buildExportSheetModel({
      kind: "question",
      questions: [imageQuestion],
      subjectId: "pharmaceutics",
      publishDate: "2026-05-20",
      examDate: "2026-12-19",
      theme: getExportTheme("pharmaceutics")
    });

    render(<ExportSheet model={model} />);

    expect(screen.getAllByText("A")).toHaveLength(1);
    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("renders dense real-world mixed question content on a native sheet", () => {
    const model = buildExportSheetModel({
      kind: "question",
      questions: longChoiceQuestions,
      subjectId: "pharmaceutics",
      publishDate: "2026-05-20",
      examDate: "2026-12-19",
      theme: getExportTheme("pharmaceutics")
    });

    render(<ExportSheet model={model} scale="native" />);

    expect(screen.getByTestId("export-sheet")).toHaveClass("export-sheet-scale-native");
    expect(screen.getByText(model.title)).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === `${model.theme.englishTitle} · DAILY PRACTICE`)).toBeInTheDocument();
    expect(screen.getAllByText(model.questions[0].typeLabel).length).toBeGreaterThan(0);
    expect(screen.getAllByText(model.questions[2].typeLabel).length).toBeGreaterThanOrEqual(2);
  });
});

describe("assertExportSheetFits", () => {
  it("rejects a sheet that has visible scroll overflow", () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "scrollHeight", { value: 2000 });
    Object.defineProperty(element, "clientHeight", { value: 1920 });
    Object.defineProperty(element, "scrollWidth", { value: 1080 });
    Object.defineProperty(element, "clientWidth", { value: 1080 });

    expect(() => assertExportSheetFits(element)).toThrow("export sheet overflows");
  });

  it("accepts a sheet without overflow", () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "scrollHeight", { value: 1920 });
    Object.defineProperty(element, "clientHeight", { value: 1920 });
    Object.defineProperty(element, "scrollWidth", { value: 1080 });
    Object.defineProperty(element, "clientWidth", { value: 1080 });

    expect(() => assertExportSheetFits(element)).not.toThrow();
  });
});
