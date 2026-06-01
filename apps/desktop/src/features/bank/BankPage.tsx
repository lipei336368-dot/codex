import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEffect, useMemo, useRef, useState } from "react";
import "../../shared/design-system/bank.css";
import type { SubjectId } from "../../app/store";
import { useAppStore } from "../../app/store";
import { apiClient } from "../../shared/api/client";
import type {
  ChapterDto,
  DuplicateQuestionGroupDto,
  ImportReportDto,
  QuestionDto,
  QuestionOptionInput,
  QuestionTypeDto,
  UpdateQuestionInput
} from "../../shared/api/contracts";
import { Button } from "../../shared/components/Button";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog";
import { FilterRail } from "../../shared/components/FilterRail";
import { ImageLightbox } from "../../shared/components/ImageLightbox";
import { ReportDrawer } from "../../shared/components/ReportDrawer";
import { TaskProgressDialog } from "../tasks/TaskProgressDialog";
import { BankEditPanel } from "./components/BankEditPanel";
import { BankQuestionListPane } from "./components/BankQuestionListPane";
import { BankToolbar } from "./components/BankToolbar";
import { buildQuestionUpdatePayload, validateQuestionDraft, type QuestionDraft } from "../question-draft/questionDraft";
import {
  availableQuestionIds as getAvailableQuestionIds,
  getSelectedAvailableQuestions,
  reconcileSelectedIds
} from "./bankSelection";
import { useBankImportExport } from "./useBankImportExport";

type BankPageProps = {
  subjectId: SubjectId;
};

const emptySummary = {
  total: 0,
  available: 0,
  byType: { singleChoice: 0, multipleChoice: 0, shortAnswer: 0, essay: 0 },
  availableByType: { singleChoice: 0, multipleChoice: 0, shortAnswer: 0, essay: 0 }
};

const BANK_PAGE_SIZE = 80;

export function BankPage({ subjectId }: BankPageProps) {
  const queryClient = useQueryClient();
  const openPreview = useAppStore((state) => state.openPreview);
  const defaultExportDirectory = useAppStore((state) => state.defaultExportDirectory);
  const [query, setQuery] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<QuestionTypeDto | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editingQuestion, setEditingQuestion] = useState<QuestionDto | null>(null);
  const [editingChapterId, setEditingChapterId] = useState("");
  const [editingStem, setEditingStem] = useState("");
  const [editingAnswer, setEditingAnswer] = useState("");
  const [editingAnalysis, setEditingAnalysis] = useState("");
  const [editingStemImagePath, setEditingStemImagePath] = useState<string | null>(null);
  const [editingAnswerImagePath, setEditingAnswerImagePath] = useState<string | null>(null);
  const [editingAnalysisImagePath, setEditingAnalysisImagePath] = useState<string | null>(null);
  const [editingStemImagePreview, setEditingStemImagePreview] = useState<string | null>(null);
  const [editingAnswerImagePreview, setEditingAnswerImagePreview] = useState<string | null>(null);
  const [editingAnalysisImagePreview, setEditingAnalysisImagePreview] = useState<string | null>(null);
  const [editingOptions, setEditingOptions] = useState<QuestionOptionInput[]>([]);
  const [editingOptionImagePreviews, setEditingOptionImagePreviews] = useState<Record<string, string | null>>({});
  const [editingError, setEditingError] = useState("");
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const [pendingResetIds, setPendingResetIds] = useState<string[] | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedQuery = query.trim() || null;

  const { data: summary = emptySummary } = useQuery({
    queryKey: ["bank-summary", subjectId],
    queryFn: () => apiClient.getBankSummary(subjectId),
    retry: false
  });

  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", subjectId],
    queryFn: () => apiClient.listChapters(subjectId),
    retry: false
  });

  const chapterNameById = useMemo(
    () => new Map(chapters.map((chapter: ChapterDto) => [chapter.id, chapter.name])),
    [chapters]
  );

  const {
    data: questionPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["bank-search", subjectId, selectedChapterId, normalizedQuery, questionType],
    queryFn: ({ pageParam }) =>
      apiClient.searchQuestionsPaged({
        subjectId,
        chapterId: selectedChapterId,
        questionType,
        query: normalizedQuery,
        includeDrawn: true,
        offset: pageParam,
        limit: BANK_PAGE_SIZE
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    retry: false
  });

  const questions = useMemo(
    () => questionPages?.pages.flatMap((page) => page.items) ?? [],
    [questionPages]
  );
  const totalQuestionCount = questionPages?.pages[0]?.total ?? 0;

  const availableQuestionIds = useMemo(
    () => getAvailableQuestionIds(questions),
    [questions]
  );
  const visibleQuestions = useMemo(
    () => [...questions].sort((left, right) => Number(left.drawn) - Number(right.drawn)),
    [questions]
  );

  const refreshBankData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bank-search", subjectId] }),
      queryClient.invalidateQueries({ queryKey: ["bank-summary", subjectId] })
    ]);
  };

  const updateQuestionMutation = useMutation({
    mutationFn: (question: UpdateQuestionInput) => apiClient.updateQuestion(question),
    onSuccess: async (_data, variables) => {
      setEditingQuestion(null);
      await refreshBankData();
    }
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionIds: string[]) => apiClient.deleteQuestions(questionIds),
    onSuccess: async (_data, questionIds) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        questionIds.forEach((id) => next.delete(id));
        return next;
      });
      setEditingQuestion(null);
      await refreshBankData();
    }
  });

  const resetDrawnMutation = useMutation({
    mutationFn: (questionIds: string[]) => apiClient.resetDrawn(subjectId, questionIds),
    onSuccess: async (_data, questionIds) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        questionIds.forEach((id) => next.delete(id));
        return next;
      });
      await Promise.all([
        refreshBankData(),
        queryClient.invalidateQueries({ queryKey: ["generate-question-picker", subjectId] }),
        queryClient.invalidateQueries({ queryKey: ["generated-dates", subjectId] })
      ]);
    }
  });

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

  useEffect(() => {
    setSelectedIds((current) => {
      const next = reconcileSelectedIds(current, questions);
      return next.size === current.size ? current : next;
    });
  }, [questions]);

  function toggleQuestion(questionId: string) {
    const question = questions.find((item) => item.id === questionId);
    if (!question || question.drawn) {
      return;
    }
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  function selectAllAvailable() {
    setSelectedIds(new Set(availableQuestionIds));
  }

  function openSelectedPreview() {
    const selectedQuestions = getSelectedAvailableQuestions(questions, selectedIds);
    openPreview(selectedQuestions.length > 0 ? selectedQuestions : undefined);
  }

  function startEditingById(questionId: string) {
    const question = questions.find((item) => item.id === questionId);
    if (question && !question.drawn) {
      startEditing(question);
    }
  }

  function startEditing(question: QuestionDto) {
    setEditingQuestion(question);
    setEditingChapterId(question.chapterId);
    setEditingStem(question.stem);
    setEditingAnswer(question.answer ?? "");
    setEditingAnalysis(question.analysis ?? "");
    setEditingStemImagePath(question.stemImagePath);
    setEditingAnswerImagePath(question.answerImagePath);
    setEditingAnalysisImagePath(question.analysisImagePath);
    setEditingStemImagePreview(null);
    setEditingAnswerImagePreview(null);
    setEditingAnalysisImagePreview(null);
    setEditingOptions(question.options);
    setEditingOptionImagePreviews({});
    setEditingError("");
  }

  function saveEditing() {
    if (!editingQuestion) {
      return;
    }
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
    const validation = validateQuestionDraft(draft);
    if (!validation.ok) {
      setEditingError(validation.message);
      return;
    }

    setEditingError("");
    updateQuestionMutation.mutate(buildQuestionUpdatePayload(editingQuestion.id, draft));
  }

  async function attachEditingImage(
    file: File,
    setPath: (path: string | null) => void,
    setPreview: (path: string | null) => void
  ) {
    if (!file.type.startsWith("image/")) {
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = await apiClient.saveQuestionAsset(subjectId, file.name || "question-image.png", bytes);
    setPath(path);
    setPreview(previewUrl);
  }

  function openImagePreview(path: string, alt: string) {
    setLightboxImage({ src: toImageSrc(path), alt });
  }

  function deleteSelectedQuestions() {
    if (selectedIds.size > 0) {
      deleteQuestionMutation.mutate([...selectedIds]);
    }
  }

  function exportSelectedQuestions() {
    bankImportExport.exportSelectedQuestions([...selectedIds]);
  }

  function exportSelectedQuestionsWord() {
    bankImportExport.exportSelectedQuestionsWord([...selectedIds]);
  }

  function resetDrawnQuestion(questionId: string) {
    resetDrawnMutation.mutate([questionId]);
  }

  function confirmPendingReset() {
    if (!pendingResetIds) {
      return;
    }
    resetDrawnMutation.mutate(pendingResetIds);
    setPendingResetIds(null);
  }

  function formatImportError(error: ImportReportDto["errors"][number]) {
    const stem = error.stem ? `${error.stem} - ` : "";
    return `第 ${error.index} 条：${stem}${error.message}`;
  }

  const bankPrimaryActions = [
    { label: "导入 JSON", onClick: () => importInputRef.current?.click(), variant: "secondary" as const },
    { label: "查重", onClick: bankImportExport.findDuplicates, variant: "secondary" as const },
    { label: "全选可用", onClick: selectAllAvailable, variant: "ghost" as const, disabled: availableQuestionIds.length === 0 }
  ];

  const batchActions = [
    { label: "生成预览", onClick: openSelectedPreview, variant: "primary" as const },
    { label: "导出 JSON", onClick: exportSelectedQuestions, variant: "secondary" as const },
    { label: "导出 Word", onClick: exportSelectedQuestionsWord, variant: "secondary" as const },
    { label: "删除", onClick: deleteSelectedQuestions, variant: "danger" as const }
  ];

  if (editingQuestion) {
    return (
      <section className="page-frame bank-edit-page">
        <BankEditPanel
          question={editingQuestion}
          chapters={chapters}
          editingChapterId={editingChapterId}
          setEditingChapterId={setEditingChapterId}
          chapterName={chapterNameById.get(editingQuestion.chapterId) ?? editingQuestion.chapterId}
          editingStem={editingStem}
          setEditingStem={setEditingStem}
          editingAnswer={editingAnswer}
          setEditingAnswer={setEditingAnswer}
          editingAnalysis={editingAnalysis}
          setEditingAnalysis={setEditingAnalysis}
          editingStemImagePath={editingStemImagePath}
          editingStemImagePreview={editingStemImagePreview}
          setEditingStemImagePath={setEditingStemImagePath}
          setEditingStemImagePreview={setEditingStemImagePreview}
          editingAnswerImagePath={editingAnswerImagePath}
          editingAnswerImagePreview={editingAnswerImagePreview}
          setEditingAnswerImagePath={setEditingAnswerImagePath}
          setEditingAnswerImagePreview={setEditingAnswerImagePreview}
          editingAnalysisImagePath={editingAnalysisImagePath}
          editingAnalysisImagePreview={editingAnalysisImagePreview}
          setEditingAnalysisImagePath={setEditingAnalysisImagePath}
          setEditingAnalysisImagePreview={setEditingAnalysisImagePreview}
          editingOptions={editingOptions}
          setEditingOptions={setEditingOptions}
          editingOptionImagePreviews={editingOptionImagePreviews}
          setEditingOptionImagePreviews={setEditingOptionImagePreviews}
          attachEditingImage={attachEditingImage}
          setLightboxImage={setLightboxImage}
          errorMessage={editingError}
          onCancel={() => setEditingQuestion(null)}
          onSave={saveEditing}
          immersive
        />
        {lightboxImage ? (
          <ImageLightbox src={lightboxImage.src} alt={lightboxImage.alt} onClose={() => setLightboxImage(null)} />
        ) : null}
      </section>
    );
  }

  return (
    <section className="page-frame bank-page">
      <div className="bank-workbench">
        <FilterRail
          title="题库筛选"
          chapters={chapters}
          selectedChapterId={selectedChapterId}
          onSelectChapter={setSelectedChapterId}
        />

        <section className="bank-list-pane glass-panel">
          <BankToolbar query={query} actions={bankPrimaryActions} onQueryChange={setQuery} />
          <input
            accept=".json,application/json"
            aria-label="导入 JSON 文件"
            hidden
            multiple
            onChange={(event) => {
              void bankImportExport.importJsonFile(event.target.files);
              event.target.value = "";
            }}
            ref={importInputRef}
            type="file"
          />
          <BankQuestionListPane
            summary={summary}
            selectedType={questionType}
            onSelectType={setQuestionType}
            importMessage={bankImportExport.importMessage}
            exportMessage={bankImportExport.exportMessage}
            selectedIds={selectedIds}
            batchActions={batchActions}
            questions={visibleQuestions}
            totalCount={totalQuestionCount}
            hasMore={Boolean(hasNextPage)}
            isLoadingMore={isFetchingNextPage}
            onLoadMore={() => {
              if (!isFetchingNextPage && hasNextPage) {
                void fetchNextPage();
              }
            }}
            onClearSelection={() => setSelectedIds(new Set())}
            onToggleQuestion={toggleQuestion}
            onOpenQuestion={startEditingById}
            renderActions={(question) =>
              question.drawn ? (
                <button className="question-row-action" type="button" onClick={() => resetDrawnQuestion(question.id)}>
                  重置
                </button>
              ) : (
                <>
                  <button className="question-row-action" type="button" onClick={() => startEditing(question)}>
                    编辑
                  </button>
                  <button
                    className="question-row-action question-row-action-danger"
                    type="button"
                    onClick={() => deleteQuestionMutation.mutate([question.id])}
                  >
                    删除
                  </button>
                </>
              )
            }
          />
        </section>

        {bankImportExport.duplicateGroups ? (
          <section className="bank-duplicate-panel glass-panel" aria-label="重复题目处理">
            <DuplicatePanel
              groups={bankImportExport.duplicateGroups}
              onClose={() => bankImportExport.setDuplicateGroups(null)}
              onKeep={bankImportExport.keepDuplicateQuestion}
            />
          </section>
        ) : null}
      </div>

      {bankImportExport.importReport ? (
        <ReportDrawer
          title="导入报告"
          summary={[
            { label: "已导入", value: bankImportExport.importReport.added },
            { label: "跳过", value: bankImportExport.importReport.skipped },
            { label: "错误", value: bankImportExport.importReport.errorsCount }
          ]}
          details={bankImportExport.importReport.errors.map(formatImportError)}
          onClose={() => bankImportExport.setImportReport(null)}
        />
      ) : null}
      {lightboxImage ? (
        <ImageLightbox src={lightboxImage.src} alt={lightboxImage.alt} onClose={() => setLightboxImage(null)} />
      ) : null}
      {pendingResetIds ? (
        <ConfirmDialog
          title="确认重置已抽题目"
          message={`将重置 ${pendingResetIds.length} 道已抽题目，重置后它们会重新变为可用。`}
          confirmLabel="确认重置"
          countdownSeconds={3}
          onCancel={() => setPendingResetIds(null)}
          onConfirm={confirmPendingReset}
        />
      ) : null}
      <TaskProgressDialog
        open={Boolean(bankImportExport.activeTask)}
        task={bankImportExport.activeTask}
        onClose={() => bankImportExport.setActiveTask(null)}
      />
    </section>
  );
}

function DuplicatePanel({
  groups,
  onClose,
  onKeep
}: {
  groups: DuplicateQuestionGroupDto[];
  onClose: () => void;
  onKeep: (group: DuplicateQuestionGroupDto, keepId: string) => void;
}) {
  return (
    <section className="question-editor">
      <header className="inspector-header">
        <span className="question-type-badge">查重</span>
        <Button variant="ghost" onClick={onClose}>
          关闭
        </Button>
      </header>
      {groups.length === 0 ? (
        <div className="inspector-empty">未发现重复题目</div>
      ) : (
        <div className="question-list compact">
          {groups.map((group) => (
            <div className="duplicate-card" key={group.key}>
              <strong>{group.key}</strong>
              {group.questions.map((question) => (
                <div className="duplicate-question-row" key={question.id}>
                  <span>{question.stem}</span>
                  <Button
                    variant="secondary"
                    aria-label={`保留 ${question.stem}`}
                    onClick={() => onKeep(group, question.id)}
                  >
                    保留
                  </Button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function toImageSrc(path: string) {
  if (path.startsWith("blob:")) {
    return path;
  }

  try {
    return convertFileSrc(path);
  } catch {
    return path;
  }
}
