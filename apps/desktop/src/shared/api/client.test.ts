import { describe, expect, it, vi } from "vitest";
import { AppClientError, createApiClient, unwrapAppResult } from "./client";
import type { AppResult, SubjectDto } from "./contracts";

describe("api client", () => {
  it("unwraps successful app results", () => {
    const result: AppResult<string> = { ok: true, data: "药剂学" };

    expect(unwrapAppResult(result)).toBe("药剂学");
  });

  it("throws a typed error for failed app results", () => {
    const result: AppResult<string> = {
      ok: false,
      error: { code: "bank.search_failed", message: "查询失败" }
    };

    expect(() => unwrapAppResult(result)).toThrow(AppClientError);
  });

  it("calls the subjects command through the shared invoker", async () => {
    const subjects: SubjectDto[] = [{ id: "pharmaceutics", name: "药剂学", themeKey: "pharmaceutics" }];
    const invoke = vi.fn().mockResolvedValue({
      ok: true,
      data: [{ id: "pharmaceutics", name: "药剂学", theme_key: "pharmaceutics" }]
    });
    const client = createApiClient(invoke);

    await expect(client.listSubjects()).resolves.toEqual(subjects);
    expect(invoke).toHaveBeenCalledWith("subjects_list");
  });

  it("passes chapter command arguments in Tauri camelCase form", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: [] });
    const client = createApiClient(invoke);

    await client.listChapters("pharmaceutics");

    expect(invoke).toHaveBeenCalledWith("chapters_list", { subjectId: "pharmaceutics" });
  });

  it("loads bank summary through the shared command", async () => {
    const invoke = vi.fn().mockResolvedValue({
      ok: true,
      data: {
        total: 2,
        available: 1,
        by_type: { single_choice: 1, multiple_choice: 0, short_answer: 1, essay: 0 },
        available_by_type: { single_choice: 1, multiple_choice: 0, short_answer: 0, essay: 0 }
      }
    });
    const client = createApiClient(invoke);

    await expect(client.getBankSummary("pharmaceutics")).resolves.toEqual({
      total: 2,
      available: 1,
      byType: { singleChoice: 1, multipleChoice: 0, shortAnswer: 1, essay: 0 },
      availableByType: { singleChoice: 1, multipleChoice: 0, shortAnswer: 0, essay: 0 }
    });
    expect(invoke).toHaveBeenCalledWith("bank_summary", { subjectId: "pharmaceutics" });
  });

  it("maps bank search filters to the Rust search contract", async () => {
    const invoke = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        {
          id: "q1",
          subject_id: "pharmaceutics",
          chapter_id: "pharmaceutics-01",
          question_type: "single_choice",
          stem: "溶胶剂稳定性",
          answer: "A",
          analysis: "解析",
          stem_image_path: null,
          answer_image_path: null,
          analysis_image_path: null,
          options: [{ label: "A", text: "Right", image_path: "assets/a.png", is_correct: true }],
          source_school: null,
          source_year: null,
          drawn: false
        }
      ]
    });
    const client = createApiClient(invoke);

    await expect(
      client.searchQuestions({
        subjectId: "pharmaceutics",
        chapterId: null,
        questionType: "single_choice",
        query: "溶胶",
        includeDrawn: false
      })
    ).resolves.toEqual([
      {
        id: "q1",
        subjectId: "pharmaceutics",
        chapterId: "pharmaceutics-01",
        questionType: "single_choice",
        stem: "溶胶剂稳定性",
        answer: "A",
        analysis: "解析",
        stemImagePath: null,
        answerImagePath: null,
        analysisImagePath: null,
        options: [{ label: "A", text: "Right", imagePath: "assets/a.png", isCorrect: true }],
        sourceSchool: null,
        sourceYear: null,
        drawn: false
      }
    ]);
    expect(invoke).toHaveBeenCalledWith("bank_search", {
      search: {
        subject_id: "pharmaceutics",
        chapter_id: null,
        question_type: "single_choice",
        query: "溶胶",
        include_drawn: false
      }
    });
  });

  it("requests a paged question search for virtualized lists", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: { total: 0, items: [] } });
    const client = createApiClient(invoke);

    await expect(
      client.searchQuestionsPaged({
        subjectId: "pharmaceutics",
        chapterId: null,
        questionType: null,
        query: "",
        includeDrawn: true,
        offset: 0,
        limit: 50
      })
    ).resolves.toEqual({ total: 0, items: [] });

    expect(invoke).toHaveBeenCalledWith("bank_search_paged", {
      search: {
        subject_id: "pharmaceutics",
        chapter_id: null,
        question_type: null,
        query: "",
        include_drawn: true,
        offset: 0,
        limit: 50
      }
    });
  });

  it("maps question creation to the Rust create contract", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: "q1" });
    const client = createApiClient(invoke);

    await expect(
      client.createQuestion({
        subjectId: "pharmaceutics",
        chapterId: "pharmaceutics-01",
        questionType: "single_choice",
        stem: "Manual choice",
        answer: "B",
        analysis: "B is right.",
        stemImagePath: "assets/stem.png",
        answerImagePath: null,
        analysisImagePath: "assets/analysis.png",
        options: [
          { label: "A", text: "Wrong", imagePath: "assets/a.png", isCorrect: false },
          { label: "B", text: "Right", imagePath: null, isCorrect: true }
        ],
        sourceSchool: null,
        sourceYear: null
      })
    ).resolves.toBe("q1");

    expect(invoke).toHaveBeenCalledWith("bank_create", {
      question: {
        subject_id: "pharmaceutics",
        chapter_id: "pharmaceutics-01",
        question_type: "single_choice",
        stem: "Manual choice",
        answer: "B",
        analysis: "B is right.",
        stem_image_path: "assets/stem.png",
        answer_image_path: null,
        analysis_image_path: "assets/analysis.png",
        options: [
          { label: "A", text: "Wrong", image_path: "assets/a.png", is_correct: false },
          { label: "B", text: "Right", image_path: null, is_correct: true }
        ],
        source_school: null,
        source_year: null
      }
    });
  });

  it("maps question asset saves to the Rust file asset contract", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: "D:/app/assets/pharmaceutics/image.png" });
    const client = createApiClient(invoke);
    const bytes = new Uint8Array([1, 2, 3]);

    await expect(client.saveQuestionAsset("pharmaceutics", "paste.png", bytes)).resolves.toBe(
      "D:/app/assets/pharmaceutics/image.png"
    );

    expect(invoke).toHaveBeenCalledWith("save_question_asset", {
      subjectId: "pharmaceutics",
      fileName: "paste.png",
      bytes
    });
  });

  it("maps question updates to the Rust update contract", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: null });
    const client = createApiClient(invoke);

    await client.updateQuestion({
      id: "q1",
      chapterId: "pharmaceutics-02",
      stem: "更新后题干",
      answer: "B",
      analysis: "更新后解析",
      stemImagePath: "assets/stem.png",
      answerImagePath: null,
      analysisImagePath: "assets/analysis.png",
      options: [{ label: "A", text: "Updated", imagePath: "assets/option-a.png", isCorrect: true }]
    });

    expect(invoke).toHaveBeenCalledWith("bank_update", {
      question: {
        id: "q1",
        chapter_id: "pharmaceutics-02",
        stem: "更新后题干",
        answer: "B",
        analysis: "更新后解析",
        stem_image_path: "assets/stem.png",
        answer_image_path: null,
        analysis_image_path: "assets/analysis.png",
        options: [{ label: "A", text: "Updated", image_path: "assets/option-a.png", is_correct: true }]
      }
    });
  });
  it("maps question deletion to the Rust delete contract", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: null });
    const client = createApiClient(invoke);

    await client.deleteQuestions(["q1", "q2"]);

    expect(invoke).toHaveBeenCalledWith("bank_delete", { questionIds: ["q1", "q2"] });
  });

  it("maps drawn reset to the Rust reset contract", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: null });
    const client = createApiClient(invoke);

    await client.resetDrawn("pharmaceutics", ["q2"]);

    expect(invoke).toHaveBeenCalledWith("bank_reset_drawn", {
      subjectId: "pharmaceutics",
      questionIds: ["q2"]
    });
  });

  it("maps drawn marking to the Rust mark contract", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: null });
    const client = createApiClient(invoke);

    await client.markDrawn("pharmaceutics", ["q1", "q2"], "2026-05-06");

    expect(invoke).toHaveBeenCalledWith("bank_mark_drawn", {
      subjectId: "pharmaceutics",
      questionIds: ["q1", "q2"],
      publishDate: "2026-05-06"
    });
  });

  it("maps generated date listing to the Rust bank command", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: ["2026-05-06"] });
    const client = createApiClient(invoke);

    await expect(client.listGeneratedDates("pharmaceutics")).resolves.toEqual(["2026-05-06"]);

    expect(invoke).toHaveBeenCalledWith("bank_generated_dates", {
      subjectId: "pharmaceutics"
    });
  });

  it("maps generated date reset to the Rust bank command", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: null });
    const client = createApiClient(invoke);

    await client.resetGeneratedDates("pharmaceutics", ["2026-05-06"]);

    expect(invoke).toHaveBeenCalledWith("bank_reset_generated_dates", {
      subjectId: "pharmaceutics",
      publishDates: ["2026-05-06"]
    });
  });

  it("maps duplicate question lookup to the Rust bank command", async () => {
    const invoke = vi.fn().mockResolvedValue({
      ok: true,
      data: [
        {
          key: "溶胶剂稳定性",
          questions: [
            { id: "q1", stem: "溶胶剂稳定性？", chapter_id: "pharmaceutics-01", question_type: "single_choice" },
            { id: "q2", stem: "溶胶剂 稳定性", chapter_id: "pharmaceutics-01", question_type: "single_choice" }
          ]
        }
      ]
    });
    const client = createApiClient(invoke);

    await expect(client.findDuplicateQuestions("pharmaceutics")).resolves.toEqual([
      {
        key: "溶胶剂稳定性",
        questions: [
          { id: "q1", stem: "溶胶剂稳定性？", chapterId: "pharmaceutics-01", questionType: "single_choice" },
          { id: "q2", stem: "溶胶剂 稳定性", chapterId: "pharmaceutics-01", questionType: "single_choice" }
        ]
      }
    ]);
    expect(invoke).toHaveBeenCalledWith("bank_find_duplicates", { subjectId: "pharmaceutics" });
  });

  it("maps JSON import text to the Rust import contract", async () => {
    const invoke = vi.fn().mockResolvedValue({
      ok: true,
      data: { added: 1, skipped: 0, errors_count: 0, errors: [] }
    });
    const client = createApiClient(invoke);

    await expect(client.importJsonText("pharmaceutics", "[]")).resolves.toEqual({
      added: 1,
      skipped: 0,
      errorsCount: 0,
      errors: []
    });
    expect(invoke).toHaveBeenCalledWith("import_json", {
      subjectId: "pharmaceutics",
      jsonText: "[]"
    });
  });

  it("maps selected JSON export to the Rust export contract", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: "{\"questions\":[]}" });
    const client = createApiClient(invoke);

    await expect(client.exportSelectedQuestionsJson("pharmaceutics", ["q1"])).resolves.toBe("{\"questions\":[]}");

    expect(invoke).toHaveBeenCalledWith("export_json_by_ids", {
      subjectId: "pharmaceutics",
      questionIds: ["q1"]
    });
  });

  it("maps text file writes to the Rust file command", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: null });
    const client = createApiClient(invoke);

    await client.writeTextFile("D:/out/questions.json", "{}");

    expect(invoke).toHaveBeenCalledWith("write_text_file", {
      path: "D:/out/questions.json",
      content: "{}"
    });
  });

  it("maps binary file writes to the Rust file command", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: null });
    const client = createApiClient(invoke);
    const bytes = new Uint8Array([1, 2, 3]);

    await client.writeBinaryFile("D:/out/0506-每日一题.png", bytes);

    expect(invoke).toHaveBeenCalledWith("write_binary_file", {
      path: "D:/out/0506-每日一题.png",
      bytes
    });
  });

  it("maps file reveal requests to the Rust file command", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: null });
    const client = createApiClient(invoke);

    await client.revealPath("D:/out/0506-每日一题.png");

    expect(invoke).toHaveBeenCalledWith("reveal_path_in_file_manager", {
      path: "D:/out/0506-每日一题.png"
    });
  });

  it("maps app data directory lookup to the Rust app command", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: "D:/data" });
    const client = createApiClient(invoke);

    await expect(client.getDataDirectory()).resolves.toBe("D:/data");

    expect(invoke).toHaveBeenCalledWith("app_data_directory");
  });

  it("maps database backup to the Rust app command", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: null });
    const client = createApiClient(invoke);

    await client.backupDatabase("D:/backup/yiyan.sqlite");

    expect(invoke).toHaveBeenCalledWith("app_backup_database", {
      path: "D:/backup/yiyan.sqlite"
    });
  });

  it("maps data directory changes to the Rust app command", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: "D:/new-data" });
    const client = createApiClient(invoke);

    await expect(client.setDataDirectory("D:/new-data")).resolves.toBe("D:/new-data");

    expect(invoke).toHaveBeenCalledWith("app_set_data_directory", {
      path: "D:/new-data"
    });
  });

  it("maps selected Word export to the Rust docx export contract", async () => {
    const invoke = vi.fn().mockResolvedValue({ ok: true, data: null });
    const client = createApiClient(invoke);

    await client.exportSelectedQuestionsWord("pharmaceutics", ["q1"], "D:/out/questions.docx");

    expect(invoke).toHaveBeenCalledWith("export_docx_by_ids_to_path", {
      subjectId: "pharmaceutics",
      questionIds: ["q1"],
      path: "D:/out/questions.docx"
    });
  });
});
