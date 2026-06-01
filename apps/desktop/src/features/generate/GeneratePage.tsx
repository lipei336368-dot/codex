import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { PreviewBatch, SubjectId } from "../../app/store";
import { useAppStore } from "../../app/store";
import { apiClient } from "../../shared/api/client";
import type { QuestionDto, QuestionTypeDto } from "../../shared/api/contracts";
import { ConfirmDialog } from "../../shared/components/ConfirmDialog";
import { FilterRail } from "../../shared/components/FilterRail";
import { Toolbar } from "../../shared/components/Toolbar";
import { QuestionPicker } from "./components/QuestionPicker";
import { SelectionBasket } from "./components/SelectionBasket";
import { SubjectCalendar } from "./components/SubjectCalendar";

type GeneratePageProps = {
  subjectId: SubjectId;
};

export function GeneratePage({ subjectId }: GeneratePageProps) {
  const queryClient = useQueryClient();
  const openPreviewQueue = useAppStore((state) => state.openPreviewQueue);
  const generationStartDate = useAppStore((state) => state.generationStartDate);
  const setGenerationStartDate = useAppStore((state) => state.setGenerationStartDate);
  const [query, setQuery] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<QuestionTypeDto | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedQuestionsById, setSelectedQuestionsById] = useState<Map<string, QuestionDto>>(() => new Map());
  const [resetDate, setResetDate] = useState<string | null>(null);
  const normalizedQuery = query.trim() || null;

  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", subjectId],
    queryFn: () => apiClient.listChapters(subjectId),
    retry: false
  });

  const { data: generatedDates = [] } = useQuery({
    queryKey: ["generated-dates", subjectId],
    queryFn: () => apiClient.listGeneratedDates(subjectId),
    retry: false
  });

  const { data: questions = [] } = useQuery({
    queryKey: ["generate-question-picker", subjectId, selectedChapterId, questionType, normalizedQuery],
    queryFn: () =>
      apiClient.searchQuestions({
        subjectId,
        chapterId: selectedChapterId,
        questionType,
        query: normalizedQuery,
        includeDrawn: false
      }),
    retry: false
  });

  const selectedQuestions = useMemo(() => [...selectedQuestionsById.values()], [selectedQuestionsById]);
  const selectedDate = parseIsoDate(generationStartDate) ?? new Date();
  const calendarDays = buildMonthCalendar(selectedDate, generationStartDate, new Set(generatedDates));
  const monthTitle = `${selectedDate.getFullYear()} 年 ${selectedDate.getMonth() + 1} 月`;

  function toggleQuestion(questionId: string) {
    const question = questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }

    const willSelect = !selectedIds.has(questionId);

    setSelectedIds((current) => {
      const next = new Set(current);
      if (willSelect) {
        next.add(questionId);
      } else {
        next.delete(questionId);
      }
      return next;
    });
    setSelectedQuestionsById((current) => {
      const next = new Map(current);
      if (willSelect) {
        next.set(questionId, question);
      } else {
        next.delete(questionId);
      }
      return next;
    });
  }

  function removeQuestion(questionId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(questionId);
      return next;
    });
    setSelectedQuestionsById((current) => {
      const next = new Map(current);
      next.delete(questionId);
      return next;
    });
  }

  function createPreviewBatch() {
    if (selectedQuestions.length === 0) {
      return;
    }
    openPreviewQueue(buildPreviewBatches(selectedQuestions, generationStartDate));
  }

  async function resetGeneratedDate(date: string) {
    await apiClient.resetGeneratedDates(subjectId, [date]);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["generated-dates", subjectId] }),
      queryClient.invalidateQueries({ queryKey: ["generate-question-picker", subjectId] }),
      queryClient.invalidateQueries({ queryKey: ["bank-search", subjectId] }),
      queryClient.invalidateQueries({ queryKey: ["bank-summary", subjectId] })
    ]);
    setResetDate(null);
  }

  return (
    <section className="page-frame generate-page">
      <div className="generate-workbench">
        <FilterRail
          title="生成筛选"
          chapters={chapters}
          selectedChapterId={selectedChapterId}
          onSelectChapter={setSelectedChapterId}
        />
        <section className="question-picker-pane glass-panel">
          <Toolbar title="选择题目" searchValue={query} searchPlaceholder="搜索题干" onSearchChange={setQuery} />
          <QuestionPicker
            questions={questions}
            selectedIds={selectedIds}
            onToggle={toggleQuestion}
            onOpen={toggleQuestion}
          />
        </section>
        <section className="generate-side-stack">
          <SubjectCalendar
            monthTitle={monthTitle}
            days={calendarDays}
            generatedDates={generatedDates}
            onSelectDate={setGenerationStartDate}
            onResetDate={setResetDate}
          />
          <SelectionBasket
            publishDate={generationStartDate}
            questions={selectedQuestions}
            onRemove={removeQuestion}
            onPreview={createPreviewBatch}
          />
        </section>
      </div>

      {resetDate ? (
        <ConfirmDialog
          title="重置生成记录"
          message={`将重置 ${dateCodeFromIsoDate(resetDate)} 的生成记录，相关题目会重新变为可用。`}
          confirmLabel="确认重置"
          onCancel={() => setResetDate(null)}
          onConfirm={() => void resetGeneratedDate(resetDate)}
        />
      ) : null}
    </section>
  );
}

function buildPreviewBatches(questions: QuestionDto[], publishDate: string): PreviewBatch[] {
  return [
    {
      id: `preview-${publishDate}`,
      title: publishDate,
      publishDate,
      questions
    }
  ];
}

function todayIsoDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

type CalendarDay = {
  date: string | null;
  day: number | "";
  generated: boolean;
  active: boolean;
};

function buildMonthCalendar(date: Date, activeDate: string, generatedDates: Set<string>): CalendarDay[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const days: CalendarDay[] = Array.from({ length: leadingBlanks }, () => ({
    date: null,
    day: "",
    generated: false,
    active: false
  }));

  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = todayIsoDate(new Date(year, month, day));
    days.push({
      date: current,
      day,
      generated: generatedDates.has(current),
      active: current === activeDate
    });
  }

  while (days.length % 7 !== 0) {
    days.push({ date: null, day: "", generated: false, active: false });
  }

  return days;
}

function dateCodeFromIsoDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return match ? `${match[2]}${match[3]}` : date;
}
