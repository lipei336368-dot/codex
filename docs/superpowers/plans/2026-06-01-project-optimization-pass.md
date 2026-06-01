# Project Optimization Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make YiYan Daily Question Studio easier to maintain, safer to release, and more reliable for daily question export without changing the user's core workflow.

**Architecture:** This is a staged optimization pass. Start with repository metadata and CI because those changes reduce future confusion, then isolate shared question form rules, thin the bank page through small helpers, harden image export, and finally tighten desktop security settings. Each task is independently testable and should be committed separately.

**Tech Stack:** Tauri v2, React 19, TypeScript, Vite, TanStack Query, Vitest, Playwright, Rust 2021, SQLite/rusqlite, GitHub Actions.

---

## Scope

This plan covers the first optimization pass only:

1. Update repository identity from the old public repository name to `lipei336368-dot/yiyan-daily-question-studio`.
2. Add CI checks for TypeScript, Vitest, and Rust tests.
3. Share question validation and draft mapping between entry and edit flows.
4. Extract bank page selection and import/export helpers from `BankPage.tsx`.
5. Make image export results clearer and prevent marking questions drawn after partial failures.
6. Add a conservative Tauri CSP and verify local image/export flows.

Search upgrade with SQLite FTS5 and settings unification are intentionally left for a second plan because they change data behavior and migration strategy.

## Working Rules

- Start every task with `git status --short --branch`.
- Do not stage unrelated changes, especially existing Tauri schema diffs:
  - `apps/desktop/src-tauri/gen/schemas/desktop-schema.json`
  - `apps/desktop/src-tauri/gen/schemas/windows-schema.json`
- Do not commit private files, databases, original OCR/PDF/Word material, release artifacts, or local executables.
- Use UTF-8-aware reads for Chinese files when checking content from PowerShell:

```powershell
node -e "const fs=require('fs'); console.log(fs.readFileSync('README.md','utf8'))"
```

## File Structure

Files to create:

- `.github/workflows/ci.yml`  
  Runs install, typecheck, Vitest, and Rust tests on pushes and pull requests.

- `apps/desktop/src/features/question-draft/questionDraft.ts`  
  Shared draft types, validation, and conversion helpers for entry/edit forms.

- `apps/desktop/src/features/question-draft/questionDraft.test.ts`  
  Unit tests for single choice, multiple choice, and short-answer validation.

- `apps/desktop/src/features/bank/bankSelection.ts`  
  Pure helper functions for selected IDs, available IDs, and selected preview questions.

- `apps/desktop/src/features/bank/bankSelection.test.ts`  
  Unit tests for bank selection behavior.

- `apps/desktop/src/features/bank/useBankImportExport.ts`  
  Hook containing bank JSON import, JSON export, Word export, duplicate lookup, and task progress state.

- `apps/desktop/src/features/bank/useBankImportExport.test.tsx`  
  Unit tests for import report merging and export cancellation messaging.

- `apps/desktop/src/features/preview/exportBatchReport.ts`  
  Builds user-facing batch export success/failure messages.

- `apps/desktop/src/features/preview/exportBatchReport.test.ts`  
  Unit tests for export reporting.

Files to modify:

- `.git/config` through `git remote set-url`, not by direct editing.
- `HANDOFF_PRIVATE.md`
- `README.md`
- `docs/release.md`
- `RELEASE_NOTES.md`
- `apps/desktop/src/features/entry/EntryPage.tsx`
- `apps/desktop/src/features/entry/EntryPage.test.tsx`
- `apps/desktop/src/features/bank/BankPage.tsx`
- `apps/desktop/src/features/bank/BankPage.test.tsx`
- `apps/desktop/src/features/bank/components/BankEditPanel.tsx` only if prop names need cleanup after moving draft helpers.
- `apps/desktop/src/features/preview/useImageExport.ts`
- `apps/desktop/src/features/preview/PreviewPage.test.tsx`
- `apps/desktop/src-tauri/tauri.conf.json`
- `apps/desktop/src/shared/components/design-system.test.tsx` if CSP or drag-region checks need a test assertion update.

---

## Task 1: Repository Identity Cleanup

**Files:**
- Modify remote: `.git/config` via `git remote set-url`
- Modify: `HANDOFF_PRIVATE.md`
- Modify: `README.md`
- Modify: `docs/release.md`
- Modify: `RELEASE_NOTES.md`

- [ ] **Step 1: Inspect current state**

Run:

```powershell
git status --short --branch
git remote -v
rg -n "codex/releases/tag|codex.git|yiyan-daily-question-studio" .
```

Expected:

- `origin` may still point to the old public repository URL.
- Some docs may contain the old repository URL.
- Existing schema diffs may appear and must not be staged.

- [ ] **Step 2: Update local remote**

Run:

```powershell
git remote set-url origin https://github.com/lipei336368-dot/yiyan-daily-question-studio.git
git remote -v
```

Expected:

```text
origin  https://github.com/lipei336368-dot/yiyan-daily-question-studio.git (fetch)
origin  https://github.com/lipei336368-dot/yiyan-daily-question-studio.git (push)
```

- [ ] **Step 3: Replace old repository references in docs**

Edit the docs so every public GitHub URL uses:

```text
https://github.com/lipei336368-dot/yiyan-daily-question-studio
```

Specific replacements:

```text
the old repository homepage
the old repository git remote URL
the old repository release URL
```

become:

```text
https://github.com/lipei336368-dot/yiyan-daily-question-studio
https://github.com/lipei336368-dot/yiyan-daily-question-studio.git
https://github.com/lipei336368-dot/yiyan-daily-question-studio/releases/tag/v0.1.0
```

- [ ] **Step 4: Verify no stale public URL remains**

Run:

```powershell
rg -n "codex/releases/tag|codex.git" .
```

Expected:

```text
<no output>
```

- [ ] **Step 5: Commit only repository identity files**

Run:

```powershell
git status --short
git add HANDOFF_PRIVATE.md README.md docs/release.md RELEASE_NOTES.md
git diff --cached --stat
git commit -m "docs: update repository identity"
```

Expected:

- Commit includes docs only.
- Tauri schema diffs are not staged.

---

## Task 2: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the CI workflow**

Create `.github/workflows/ci.yml` with exactly this content:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
  workflow_dispatch:

jobs:
  desktop:
    name: Desktop checks
    runs-on: windows-latest
    defaults:
      run:
        working-directory: apps/desktop

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: apps/desktop/package-lock.json

      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable

      - name: Install frontend dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Frontend tests
        run: npm test -- --run

      - name: Rust tests
        run: cargo test
        working-directory: apps/desktop/src-tauri
```

- [ ] **Step 2: Run the same checks locally**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm run typecheck
npm test -- --run
cd src-tauri
cargo test
```

Expected:

- `npm run typecheck` exits with code 0.
- `npm test -- --run` exits with code 0.
- `cargo test` exits with code 0.

- [ ] **Step 3: Commit CI**

Run:

```powershell
git status --short
git add .github/workflows/ci.yml
git commit -m "ci: add desktop validation workflow"
```

Expected:

- Commit contains only `.github/workflows/ci.yml`.

---

## Task 3: Shared Question Draft Validation

**Files:**
- Create: `apps/desktop/src/features/question-draft/questionDraft.ts`
- Create: `apps/desktop/src/features/question-draft/questionDraft.test.ts`
- Modify: `apps/desktop/src/features/entry/EntryPage.tsx`
- Modify: `apps/desktop/src/features/entry/EntryPage.test.tsx`
- Modify: `apps/desktop/src/features/bank/BankPage.tsx`
- Modify: `apps/desktop/src/features/bank/BankPage.test.tsx`

- [ ] **Step 1: Add failing validation tests**

Create `apps/desktop/src/features/question-draft/questionDraft.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildQuestionPayload, validateQuestionDraft, type QuestionDraft } from "./questionDraft";

const baseDraft: QuestionDraft = {
  subjectId: "pharmaceutics",
  chapterId: "pharmaceutics-chapter-1",
  questionType: "single_choice",
  stem: "片剂崩解时限检查的意义是什么？",
  answer: "",
  analysis: "解析内容",
  stemImagePath: null,
  answerImagePath: null,
  analysisImagePath: null,
  sourceSchool: null,
  sourceYear: null,
  options: [
    { label: "A", text: "检查释药前置质量", imagePath: null, isCorrect: true },
    { label: "B", text: "检查包装质量", imagePath: null, isCorrect: false }
  ]
};

describe("question draft validation", () => {
  it("requires one correct option for single choice", () => {
    const draft = {
      ...baseDraft,
      options: baseDraft.options.map((option) => ({ ...option, isCorrect: false }))
    };

    expect(validateQuestionDraft(draft)).toEqual({ ok: false, message: "单选题必须选择一个正确答案" });
  });

  it("requires at least two correct options for multiple choice", () => {
    const draft: QuestionDraft = {
      ...baseDraft,
      questionType: "multiple_choice",
      options: [
        { label: "A", text: "正确项", imagePath: null, isCorrect: true },
        { label: "B", text: "干扰项", imagePath: null, isCorrect: false }
      ]
    };

    expect(validateQuestionDraft(draft)).toEqual({ ok: false, message: "多选题至少选择两个正确答案" });
  });

  it("requires answer text for short answer questions", () => {
    const draft: QuestionDraft = {
      ...baseDraft,
      questionType: "short_answer",
      answer: "   ",
      options: []
    };

    expect(validateQuestionDraft(draft)).toEqual({ ok: false, message: "简答论述题必须填写答案" });
  });

  it("builds a choice payload with answer letters from correct options", () => {
    const payload = buildQuestionPayload(baseDraft);

    expect(payload.answer).toBe("A");
    expect(payload.options).toHaveLength(2);
  });

  it("builds a short-answer payload without options or analysis", () => {
    const draft: QuestionDraft = {
      ...baseDraft,
      questionType: "short_answer",
      answer: "应从处方、工艺和质量控制角度作答。",
      analysis: "不会保存到简答论述题",
      options: []
    };

    const payload = buildQuestionPayload(draft);

    expect(payload.answer).toBe("应从处方、工艺和质量控制角度作答。");
    expect(payload.analysis).toBeNull();
    expect(payload.options).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm test -- src/features/question-draft/questionDraft.test.ts --run
```

Expected:

- FAIL because `questionDraft.ts` does not exist.

- [ ] **Step 3: Implement shared draft helper**

Create `apps/desktop/src/features/question-draft/questionDraft.ts`:

```ts
import type { NewQuestionInput, QuestionOptionInput, QuestionTypeDto } from "../../shared/api/contracts";

export type QuestionDraft = {
  subjectId: string;
  chapterId: string;
  questionType: QuestionTypeDto;
  stem: string;
  answer: string;
  analysis: string;
  stemImagePath: string | null;
  answerImagePath: string | null;
  analysisImagePath: string | null;
  sourceSchool: string | null;
  sourceYear: string | null;
  options: QuestionOptionInput[];
};

export type DraftValidationResult = { ok: true } | { ok: false; message: string };

export function validateQuestionDraft(draft: QuestionDraft): DraftValidationResult {
  if (!draft.chapterId) {
    return { ok: false, message: "请选择章节" };
  }

  if (!draft.stem.trim() && !draft.stemImagePath) {
    return { ok: false, message: "请填写题干或添加题干图片" };
  }

  if (draft.questionType === "single_choice") {
    const correctCount = correctLabels(draft).length;
    return correctCount === 1 ? { ok: true } : { ok: false, message: "单选题必须选择一个正确答案" };
  }

  if (draft.questionType === "multiple_choice") {
    const correctCount = correctLabels(draft).length;
    return correctCount >= 2 ? { ok: true } : { ok: false, message: "多选题至少选择两个正确答案" };
  }

  return draft.answer.trim() || draft.answerImagePath
    ? { ok: true }
    : { ok: false, message: "简答论述题必须填写答案" };
}

export function buildQuestionPayload(draft: QuestionDraft): NewQuestionInput {
  const isChoice = draft.questionType === "single_choice" || draft.questionType === "multiple_choice";

  return {
    subjectId: draft.subjectId,
    chapterId: draft.chapterId,
    questionType: draft.questionType,
    stem: draft.stem.trim(),
    answer: isChoice ? correctLabels(draft).join("") || null : textOrNull(draft.answer),
    analysis: isChoice ? textOrNull(draft.analysis) : null,
    stemImagePath: draft.stemImagePath,
    answerImagePath: draft.answerImagePath,
    analysisImagePath: draft.analysisImagePath,
    sourceSchool: draft.sourceSchool,
    sourceYear: draft.sourceYear,
    options: isChoice ? draft.options : []
  };
}

function correctLabels(draft: QuestionDraft) {
  return draft.options.filter((option) => option.isCorrect).map((option) => option.label).sort();
}

function textOrNull(value: string) {
  const text = value.trim();
  return text ? text : null;
}
```

- [ ] **Step 4: Verify draft tests pass**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm test -- src/features/question-draft/questionDraft.test.ts --run
```

Expected:

- PASS.

- [ ] **Step 5: Wire `EntryPage` through the helper**

In `apps/desktop/src/features/entry/EntryPage.tsx`:

1. Import helpers:

```ts
import { buildQuestionPayload, validateQuestionDraft, type QuestionDraft } from "../question-draft/questionDraft";
```

2. Replace local save validation inside the save handler with:

```ts
const draft: QuestionDraft = {
  subjectId,
  chapterId,
  questionType,
  stem,
  answer,
  analysis,
  stemImagePath: stemImage.path,
  answerImagePath: answerImage.path,
  analysisImagePath: analysisImage.path,
  sourceSchool: null,
  sourceYear: null,
  options: options.map((option) => ({
    label: option.label,
    text: option.text,
    imagePath: option.image.path,
    isCorrect:
      questionType === "single_choice"
        ? option.label === singleCorrectLabel
        : multipleCorrectLabels.has(option.label)
  }))
};

const validation = validateQuestionDraft(draft);
if (!validation.ok) {
  setErrorMessage(validation.message);
  return;
}

createQuestionMutation.mutate(buildQuestionPayload(draft));
```

3. Keep the existing reset-after-save behavior unchanged.

- [ ] **Step 6: Wire bank editing through the helper**

In `apps/desktop/src/features/bank/BankPage.tsx`:

1. Import helpers:

```ts
import { buildQuestionPayload, validateQuestionDraft, type QuestionDraft } from "../question-draft/questionDraft";
```

2. In `saveEditing`, build this draft:

```ts
const draft: QuestionDraft = {
  subjectId: editingQuestion.subjectId,
  chapterId: editingChapterId || editingQuestion.chapterId,
  questionType: editingQuestion.questionType,
  stem: editingStem,
  answer: editingAnswer,
  analysis: editingAnalysis,
  stemImagePath: editingStemImagePath,
  answerImagePath: editingAnswerImagePath,
  analysisImagePath: editingAnalysisImagePath,
  sourceSchool: editingQuestion.sourceSchool,
  sourceYear: editingQuestion.sourceYear,
  options: editingOptions
};
```

3. Replace duplicated validation with:

```ts
const validation = validateQuestionDraft(draft);
if (!validation.ok) {
  setEditingError(validation.message);
  return;
}
```

4. Call the existing update mutation with the relevant fields from `buildQuestionPayload(draft)`:

```ts
const payload = buildQuestionPayload(draft);
updateQuestionMutation.mutate({
  id: editingQuestion.id,
  chapterId: payload.chapterId,
  stem: payload.stem,
  answer: payload.answer,
  analysis: payload.analysis,
  stemImagePath: payload.stemImagePath,
  answerImagePath: payload.answerImagePath,
  analysisImagePath: payload.analysisImagePath,
  options: payload.options
});
```

- [ ] **Step 7: Run focused tests**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm test -- src/features/question-draft/questionDraft.test.ts src/features/entry/EntryPage.test.tsx src/features/bank/BankPage.test.tsx --run
```

Expected:

- PASS.

- [ ] **Step 8: Commit shared draft validation**

Run:

```powershell
git add apps/desktop/src/features/question-draft/questionDraft.ts apps/desktop/src/features/question-draft/questionDraft.test.ts apps/desktop/src/features/entry/EntryPage.tsx apps/desktop/src/features/entry/EntryPage.test.tsx apps/desktop/src/features/bank/BankPage.tsx apps/desktop/src/features/bank/BankPage.test.tsx
git commit -m "refactor: share question draft validation"
```

Expected:

- Commit contains shared helper, tests, and the two call sites.

---

## Task 4: Bank Selection Helpers

**Files:**
- Create: `apps/desktop/src/features/bank/bankSelection.ts`
- Create: `apps/desktop/src/features/bank/bankSelection.test.ts`
- Modify: `apps/desktop/src/features/bank/BankPage.tsx`
- Modify: `apps/desktop/src/features/bank/BankPage.test.tsx`

- [ ] **Step 1: Add failing tests for pure selection behavior**

Create `apps/desktop/src/features/bank/bankSelection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { availableQuestionIds, getSelectedAvailableQuestions, reconcileSelectedIds } from "./bankSelection";
import type { QuestionDto } from "../../shared/api/contracts";

const questions = [
  question("q1", false),
  question("q2", true),
  question("q3", false)
];

describe("bank selection helpers", () => {
  it("returns only not-drawn IDs", () => {
    expect(availableQuestionIds(questions)).toEqual(["q1", "q3"]);
  });

  it("removes IDs that are drawn or no longer visible", () => {
    const selected = new Set(["q1", "q2", "missing"]);

    expect([...reconcileSelectedIds(selected, questions)]).toEqual(["q1"]);
  });

  it("returns selected available questions in visible order", () => {
    const selected = new Set(["q3", "q1", "q2"]);

    expect(getSelectedAvailableQuestions(questions, selected).map((item) => item.id)).toEqual(["q1", "q3"]);
  });
});

function question(id: string, drawn: boolean): QuestionDto {
  return {
    id,
    subjectId: "pharmaceutics",
    chapterId: "pharmaceutics-chapter-1",
    questionType: "single_choice",
    stem: id,
    answer: "A",
    analysis: null,
    stemImagePath: null,
    answerImagePath: null,
    analysisImagePath: null,
    options: [],
    sourceSchool: null,
    sourceYear: null,
    drawn
  };
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm test -- src/features/bank/bankSelection.test.ts --run
```

Expected:

- FAIL because `bankSelection.ts` does not exist.

- [ ] **Step 3: Implement helper**

Create `apps/desktop/src/features/bank/bankSelection.ts`:

```ts
import type { QuestionDto } from "../../shared/api/contracts";

export function availableQuestionIds(questions: QuestionDto[]) {
  return questions.filter((question) => !question.drawn).map((question) => question.id);
}

export function reconcileSelectedIds(selectedIds: Set<string>, questions: QuestionDto[]) {
  const visibleIds = new Set(questions.map((question) => question.id));
  const availableIds = new Set(availableQuestionIds(questions));
  return new Set([...selectedIds].filter((id) => visibleIds.has(id) && availableIds.has(id)));
}

export function getSelectedAvailableQuestions(questions: QuestionDto[], selectedIds: Set<string>) {
  return questions.filter((question) => selectedIds.has(question.id) && !question.drawn);
}
```

- [ ] **Step 4: Replace inline logic in `BankPage`**

In `apps/desktop/src/features/bank/BankPage.tsx`:

1. Import:

```ts
import {
  availableQuestionIds as getAvailableQuestionIds,
  getSelectedAvailableQuestions,
  reconcileSelectedIds
} from "./bankSelection";
```

2. Replace the `availableQuestionIds` `useMemo` body with:

```ts
const availableQuestionIds = useMemo(() => getAvailableQuestionIds(questions), [questions]);
```

3. Replace the selection cleanup effect with:

```ts
useEffect(() => {
  setSelectedIds((current) => {
    const next = reconcileSelectedIds(current, questions);
    return next.size === current.size ? current : next;
  });
}, [questions]);
```

4. Replace `openSelectedPreview` implementation with:

```ts
function openSelectedPreview() {
  const selectedQuestions = getSelectedAvailableQuestions(questions, selectedIds);
  openPreview(selectedQuestions.length > 0 ? selectedQuestions : undefined);
}
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm test -- src/features/bank/bankSelection.test.ts src/features/bank/BankPage.test.tsx --run
```

Expected:

- PASS.

- [ ] **Step 6: Commit bank selection extraction**

Run:

```powershell
git add apps/desktop/src/features/bank/bankSelection.ts apps/desktop/src/features/bank/bankSelection.test.ts apps/desktop/src/features/bank/BankPage.tsx apps/desktop/src/features/bank/BankPage.test.tsx
git commit -m "refactor: extract bank selection helpers"
```

Expected:

- Commit contains selection helper and related call-site changes.

---

## Task 5: Bank Import and Export Hook

**Files:**
- Create: `apps/desktop/src/features/bank/useBankImportExport.ts`
- Create: `apps/desktop/src/features/bank/useBankImportExport.test.tsx`
- Modify: `apps/desktop/src/features/bank/BankPage.tsx`

- [ ] **Step 1: Move report merging into exported helper**

In `apps/desktop/src/features/bank/useBankImportExport.ts`, create this helper first:

```ts
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../shared/api/client";
import type { DuplicateQuestionGroupDto, ImportReportDto, TaskProgressDto } from "../../shared/api/contracts";
import { chooseSavePath, saveTextFile } from "../../shared/platform/files";
import { defaultPathInDirectory } from "../../shared/platform/paths";

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
```

- [ ] **Step 2: Add tests for report merging**

Create `apps/desktop/src/features/bank/useBankImportExport.test.tsx`:

```ts
import { describe, expect, it } from "vitest";
import { mergeImportReports } from "./useBankImportExport";

describe("mergeImportReports", () => {
  it("sums added, skipped, and errors across imported files", () => {
    expect(
      mergeImportReports([
        { added: 2, skipped: 1, errorsCount: 1, errors: [{ index: 3, stem: "题干", message: "重复" }] },
        { added: 4, skipped: 0, errorsCount: 0, errors: [] }
      ])
    ).toEqual({
      added: 6,
      skipped: 1,
      errorsCount: 1,
      errors: [{ index: 3, stem: "题干", message: "重复" }]
    });
  });
});
```

- [ ] **Step 3: Run test**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm test -- src/features/bank/useBankImportExport.test.tsx --run
```

Expected:

- PASS after Step 1.

- [ ] **Step 4: Move import/export state and mutations into hook**

Extend `useBankImportExport.ts` with this hook:

```ts
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
        reports.push(await apiClient.importJsonText(subjectId, await file.text()));
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
    importJsonFile,
    exportSelectedQuestions,
    exportSelectedQuestionsWord,
    findDuplicates,
    keepDuplicateQuestion
  };
}
```

- [ ] **Step 5: Replace duplicated code in `BankPage`**

In `BankPage.tsx`:

1. Remove local state for:

```ts
importMessage
exportMessage
importReport
duplicateGroups
activeTask
```

2. Remove local mutations for:

```ts
duplicateMutation
exportSelectedMutation
exportSelectedWordMutation
```

3. Import hook:

```ts
import { useBankImportExport } from "./useBankImportExport";
```

4. Add hook usage after `deleteQuestionMutation` is declared:

```ts
const bankImportExport = useBankImportExport({
  subjectId,
  defaultExportDirectory,
  refreshBankData,
  onDeleteDuplicateQuestions: (questionIds, afterSuccess) => {
    deleteQuestionMutation.mutate(questionIds, {
      onSuccess: async () => {
        afterSuccess();
        await refreshBankData();
      }
    });
  }
});
```

5. Replace calls:

```ts
bankImportExport.importJsonFile
bankImportExport.exportSelectedQuestions([...selectedIds])
bankImportExport.exportSelectedQuestionsWord([...selectedIds])
bankImportExport.findDuplicates()
bankImportExport.keepDuplicateQuestion(group, keepId)
```

6. Replace props:

```tsx
importMessage={bankImportExport.importMessage}
exportMessage={bankImportExport.exportMessage}
importReport={bankImportExport.importReport}
duplicateGroups={bankImportExport.duplicateGroups}
activeTask={bankImportExport.activeTask}
```

- [ ] **Step 6: Run focused tests**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm test -- src/features/bank/useBankImportExport.test.tsx src/features/bank/BankPage.test.tsx --run
```

Expected:

- PASS.

- [ ] **Step 7: Commit import/export hook**

Run:

```powershell
git add apps/desktop/src/features/bank/useBankImportExport.ts apps/desktop/src/features/bank/useBankImportExport.test.tsx apps/desktop/src/features/bank/BankPage.tsx apps/desktop/src/features/bank/BankPage.test.tsx
git commit -m "refactor: move bank import export workflow"
```

Expected:

- `BankPage.tsx` is smaller.
- Import/export behavior remains covered by existing tests.

---

## Task 6: Image Export Reporting and Drawn Safety

**Files:**
- Create: `apps/desktop/src/features/preview/exportBatchReport.ts`
- Create: `apps/desktop/src/features/preview/exportBatchReport.test.ts`
- Modify: `apps/desktop/src/features/preview/useImageExport.ts`
- Modify: `apps/desktop/src/features/preview/PreviewPage.test.tsx`

- [ ] **Step 1: Add report builder tests**

Create `apps/desktop/src/features/preview/exportBatchReport.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildExportBatchReport } from "./exportBatchReport";

describe("buildExportBatchReport", () => {
  it("summarizes full batch success", () => {
    expect(
      buildExportBatchReport([
        { publishDate: "2026-06-01", ok: true },
        { publishDate: "2026-06-02", ok: true }
      ])
    ).toEqual({ ok: true, message: "已导出全部 2 天" });
  });

  it("summarizes partial failure with failed dates", () => {
    expect(
      buildExportBatchReport([
        { publishDate: "2026-06-01", ok: true },
        { publishDate: "2026-06-02", ok: false }
      ])
    ).toEqual({ ok: false, message: "导出失败：2026-06-02。成功的日期未标记为已抽取，请重新导出。" });
  });
});
```

- [ ] **Step 2: Implement report builder**

Create `apps/desktop/src/features/preview/exportBatchReport.ts`:

```ts
export type ExportBatchItemResult = {
  publishDate: string;
  ok: boolean;
};

export function buildExportBatchReport(results: ExportBatchItemResult[]) {
  const failedDates = results.filter((result) => !result.ok).map((result) => result.publishDate);

  if (failedDates.length === 0) {
    return { ok: true, message: `已导出全部 ${results.length} 天` };
  }

  return {
    ok: false,
    message: `导出失败：${failedDates.join("、")}。成功的日期未标记为已抽取，请重新导出。`
  };
}
```

- [ ] **Step 3: Verify report tests**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm test -- src/features/preview/exportBatchReport.test.ts --run
```

Expected:

- PASS.

- [ ] **Step 4: Harden `exportAllBatches`**

In `apps/desktop/src/features/preview/useImageExport.ts`:

1. Import:

```ts
import { buildExportBatchReport, type ExportBatchItemResult } from "./exportBatchReport";
```

2. Inside `exportAllBatches`, before the loop:

```ts
const results: ExportBatchItemResult[] = [];
```

3. Wrap each batch export body so every batch records success/failure:

```ts
try {
  const refs = getBatchRefs(batch.id);
  if (!refs?.question.current || !refs.answer.current) {
    throw new Error(`missing export sheets for ${batch.id}`);
  }

  const questionBytes = (await exportSheetToPngBytes(refs.question)).bytes;
  const answerBytes = (await exportSheetToPngBytes(refs.answer)).bytes;
  const questionPath = joinPath(outputFolder, `${dateCodeFromIsoDate(batch.publishDate)}-每日一题.png`);
  await apiClient.writeBinaryFile(questionPath, questionBytes);
  await apiClient.writeBinaryFile(answerOutputPath(questionPath), answerBytes);
  results.push({ publishDate: batch.publishDate, ok: true });
} catch {
  results.push({ publishDate: batch.publishDate, ok: false });
}
```

4. Replace unconditional `await onAfterExport()` with:

```ts
const report = buildExportBatchReport(results);
if (!report.ok) {
  setExportResult({ kind: "error", message: report.message });
  return;
}

await onAfterExport();
setExportResult({ kind: "success", message: report.message, path: outputPath });
```

This keeps the existing rule: questions are marked drawn only after all requested images are exported successfully.

- [ ] **Step 5: Add/adjust PreviewPage test**

In `apps/desktop/src/features/preview/PreviewPage.test.tsx`, add a test that simulates one failed batch write and asserts `markDrawn` is not called. Use the existing mocked `apiClient.writeBinaryFile` and `apiClient.markDrawn` pattern from the file.

Test body:

```ts
it("does not mark any batch drawn when exporting all days partially fails", async () => {
  apiClient.writeBinaryFile = vi
    .fn()
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("disk full"));

  renderPreviewWithTwoBatches();

  await userEvent.click(screen.getByRole("button", { name: /导出全部/ }));
  await chooseExportPath("D:\\exports\\0601-每日一题.png");

  await waitFor(() => {
    expect(apiClient.markDrawn).not.toHaveBeenCalled();
  });
  expect(await screen.findByText(/成功的日期未标记为已抽取/)).toBeInTheDocument();
});
```

If the file has different helper names, use the existing render/save-dialog helpers already defined in `PreviewPage.test.tsx`; do not introduce a second mocking style.

- [ ] **Step 6: Run focused tests**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm test -- src/features/preview/exportBatchReport.test.ts src/features/preview/PreviewPage.test.tsx --run
```

Expected:

- PASS.

- [ ] **Step 7: Commit export safety**

Run:

```powershell
git add apps/desktop/src/features/preview/exportBatchReport.ts apps/desktop/src/features/preview/exportBatchReport.test.ts apps/desktop/src/features/preview/useImageExport.ts apps/desktop/src/features/preview/PreviewPage.test.tsx
git commit -m "fix: report partial image export failures"
```

Expected:

- Partial batch export failure shows a clear message.
- Partial batch export failure does not mark questions drawn.

---

## Task 7: Conservative Tauri CSP

**Files:**
- Modify: `apps/desktop/src-tauri/tauri.conf.json`
- Modify: `apps/desktop/src/shared/components/design-system.test.tsx` only if needed

- [ ] **Step 1: Replace null CSP**

In `apps/desktop/src-tauri/tauri.conf.json`, replace:

```json
"csp": null
```

with:

```json
"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: http://asset.localhost data: blob:; font-src 'self' data:; connect-src 'self' http://127.0.0.1:* http://localhost:*; object-src 'none'; frame-ancestors 'none'"
```

- [ ] **Step 2: Run frontend and Rust checks**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm run typecheck
npm test -- --run
cd src-tauri
cargo test
```

Expected:

- All commands pass.

- [ ] **Step 3: Manually verify dev UI**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm run dev
```

Manual checks:

- App opens without a blank window.
- Subject selection renders.
- Imported/local question images still display through `convertFileSrc`.
- Image paste/attachment preview still displays.
- Preview sheets still render.
- Export still produces PNG files.

Expected:

- No CSP error blocks core image or export flows.

- [ ] **Step 4: Commit CSP**

Run:

```powershell
git add apps/desktop/src-tauri/tauri.conf.json
git commit -m "chore: add desktop content security policy"
```

Expected:

- Commit contains only `tauri.conf.json` unless a test assertion was required.

---

## Task 8: Full Verification Pass

**Files:**
- No planned file changes.

- [ ] **Step 1: Check working tree**

Run:

```powershell
git status --short --branch
```

Expected:

- Only known pre-existing schema diffs remain, or no diffs remain.
- No private data, release artifacts, or local binaries are staged.

- [ ] **Step 2: Run complete frontend checks**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm run typecheck
npm test -- --run
```

Expected:

- Both commands pass.

- [ ] **Step 3: Run Rust checks**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop\src-tauri
cargo test
```

Expected:

- Rust tests pass.

- [ ] **Step 4: Run image pressure test if export code changed**

Run:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm run test:image-pressure
```

Expected:

- Playwright image pressure scenarios pass.
- If Chrome is unavailable on the machine, record the exact failure and run `npm run e2e -- e2e/export-image.spec.ts` after installing the required browser.

- [ ] **Step 5: Review final diff**

Run:

```powershell
git log --oneline --decorate -n 8
git status --short
rg -n "codex/releases/tag|codex.git" E:\codex\daily-question-generator-commercial
```

Expected:

- Recent commits match the task commits.
- Old public repository URL search has no output.
- Working tree contains no unintended staged files.

---

## Task 9: Post-Optimization Notes

**Files:**
- Modify: `HANDOFF_PRIVATE.md`
- Modify: `README.md` only if CI badge or contributor notes are desired

- [ ] **Step 1: Update private handoff summary**

Add a short section to `HANDOFF_PRIVATE.md`:

```markdown
## 最近一次优化

- 已同步仓库地址为 `https://github.com/lipei336368-dot/yiyan-daily-question-studio`。
- 已加入 GitHub Actions CI，覆盖 TypeScript、Vitest、Rust tests。
- 题目录入和编辑共用 `questionDraft` 校验逻辑。
- 题库页选择逻辑和导入导出逻辑已拆出，降低 `BankPage.tsx` 复杂度。
- 批量图片导出遇到部分失败时不会标记已抽取。
- Tauri CSP 已从 `null` 收紧为桌面应用所需的白名单。
```

- [ ] **Step 2: Commit handoff update**

Run:

```powershell
git add HANDOFF_PRIVATE.md
git commit -m "docs: record optimization pass handoff"
```

Expected:

- Private handoff update is committed only if this repository intentionally tracks the file locally. If `HANDOFF_PRIVATE.md` remains excluded, keep the change local and do not force-add it.

---

## Success Criteria

- Local remote points to `https://github.com/lipei336368-dot/yiyan-daily-question-studio.git`.
- No old public repository URL remains in tracked docs.
- GitHub Actions workflow exists and mirrors local checks.
- Entry and bank editing use the same validation helper for:
  - single choice exactly one correct answer
  - multiple choice at least two correct answers
  - short answer requires answer text or answer image
- `BankPage.tsx` has fewer responsibilities because selection and import/export flows live outside the component.
- Batch image export does not mark drawn when any requested day fails.
- Tauri CSP is no longer `null`.
- Verification commands pass:

```powershell
cd E:\codex\daily-question-generator-commercial\apps\desktop
npm run typecheck
npm test -- --run
cd src-tauri
cargo test
```

## Self-Review

- Spec coverage: every requested optimization from the plain-language summary has a task except search upgrade and settings unification, which are explicitly deferred because they require separate data design.
- Placeholder scan: no unfinished markers or unspecified implementation steps remain.
- Type consistency: new helper names are consistent across tasks:
  - `QuestionDraft`
  - `validateQuestionDraft`
  - `buildQuestionPayload`
  - `availableQuestionIds`
  - `reconcileSelectedIds`
  - `getSelectedAvailableQuestions`
  - `mergeImportReports`
  - `buildExportBatchReport`
