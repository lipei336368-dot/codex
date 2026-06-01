import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClipboardEvent } from "react";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import "../../shared/design-system/bank.css";
import type { SubjectId } from "../../app/store";
import { useAppStore } from "../../app/store";
import { apiClient } from "../../shared/api/client";
import type { QuestionTypeDto } from "../../shared/api/contracts";
import { Button } from "../../shared/components/Button";
import { Select } from "../../shared/components/Select";
import { SegmentedControl } from "../../shared/components/SegmentedControl";
import { TextArea } from "../../shared/components/TextArea";
import { ChoiceOptionCard } from "./components/ChoiceOptionCard";
import { QuestionAssetPicker } from "./components/QuestionAssetPicker";
import { buildQuestionPayload, validateQuestionDraft, type QuestionDraft } from "../question-draft/questionDraft";

type EntryPageProps = {
  subjectId: SubjectId;
};

type OptionDraft = {
  label: string;
  text: string;
  imagePath: string | null;
  imagePreviewUrl: string | null;
};

type ImageDraft = {
  path: string | null;
  previewUrl: string | null;
};

const questionTypes: Array<{ label: string; value: QuestionTypeDto }> = [
  { label: "选择题", value: "single_choice" },
  { label: "多选题", value: "multiple_choice" },
  { label: "简答论述题", value: "short_answer" }
];

const typeLabels: Record<QuestionTypeDto, string> = {
  single_choice: "选择题",
  multiple_choice: "多选题",
  short_answer: "简答论述题",
  essay: "简答论述题"
};

function createInitialOptions(): OptionDraft[] {
  return ["A", "B", "C", "D"].map((label) => ({ label, text: "", imagePath: null, imagePreviewUrl: null }));
}

const emptyImage: ImageDraft = { path: null, previewUrl: null };

export function EntryPage({ subjectId }: EntryPageProps) {
  const queryClient = useQueryClient();
  const setPage = useAppStore((state) => state.setPage);
  const [chapterId, setChapterId] = useState("");
  const [questionType, setQuestionType] = useState<QuestionTypeDto>("single_choice");
  const [stem, setStem] = useState("");
  const [answer, setAnswer] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [options, setOptions] = useState<OptionDraft[]>(() => createInitialOptions());
  const [stemImage, setStemImage] = useState<ImageDraft>(emptyImage);
  const [answerImage, setAnswerImage] = useState<ImageDraft>(emptyImage);
  const [analysisImage, setAnalysisImage] = useState<ImageDraft>(emptyImage);
  const [singleCorrectLabel, setSingleCorrectLabel] = useState("");
  const [multipleCorrectLabels, setMultipleCorrectLabels] = useState<Set<string>>(() => new Set());
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { data: chapters = [] } = useQuery({
    queryKey: ["chapters", subjectId],
    queryFn: () => apiClient.listChapters(subjectId),
    retry: false
  });

  useEffect(() => {
    if (!chapterId && chapters[0]) {
      setChapterId(chapters[0].id);
    }
  }, [chapterId, chapters]);

  const isChoiceType = questionType === "single_choice" || questionType === "multiple_choice";

  const createQuestionMutation = useMutation({
    mutationFn: (question: ReturnType<typeof buildQuestionPayload>) => apiClient.createQuestion(question),
    onSuccess: async () => {
      setSaveMessage(`已保存：${typeLabels[questionType]}`);
      resetDraft();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bank-summary", subjectId] }),
        queryClient.invalidateQueries({ queryKey: ["bank-search", subjectId] })
      ]);
    }
  });

  function resetDraft() {
    setStem("");
    setAnswer("");
    setAnalysis("");
    setOptions(createInitialOptions());
    setStemImage(emptyImage);
    setAnswerImage(emptyImage);
    setAnalysisImage(emptyImage);
    setSingleCorrectLabel("");
    setMultipleCorrectLabels(new Set());
  }

  function changeQuestionType(nextType: string) {
    setQuestionType(nextType as QuestionTypeDto);
    setSaveMessage("");
    setErrorMessage("");
    resetDraft();
  }

  function updateOption(label: string, text: string) {
    setErrorMessage("");
    setOptions((current) => current.map((option) => (option.label === label ? { ...option, text } : option)));
  }

  function toggleMultipleCorrect(label: string) {
    setMultipleCorrectLabels((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  function addOption() {
    const usedLabels = new Set(options.map((option) => option.label));
    const nextLabel =
      Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index)).find((label) => !usedLabels.has(label)) ??
      String.fromCharCode(65 + options.length);
    setOptions((current) => [...current, { label: nextLabel, text: "", imagePath: null, imagePreviewUrl: null }]);
  }

  function removeOption(label: string) {
    setOptions((current) => {
      if (current.length <= 2) {
        return current;
      }
      const next = current.filter((option) => option.label !== label);
      if (singleCorrectLabel === label) {
        setSingleCorrectLabel("");
      }
      setMultipleCorrectLabels((currentLabels) => {
        return new Set([...currentLabels].filter((currentLabel) => currentLabel !== label));
      });
      return next;
    });
  }

  function saveQuestion() {
    const draft = buildDraft();
    const validation = validateQuestionDraft(draft);
    if (!validation.ok) {
      setSaveMessage("");
      setErrorMessage(validation.message);
      return;
    }
    setErrorMessage("");
    createQuestionMutation.mutate(buildQuestionPayload(draft));
  }

  function buildDraft(): QuestionDraft {
    return {
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
        imagePath: option.imagePath,
        isCorrect:
          questionType === "single_choice"
            ? option.label === singleCorrectLabel
            : multipleCorrectLabels.has(option.label)
      }))
    };
  }

  async function attachImage(file: File, setImage: (image: ImageDraft) => void) {
    if (!file.type.startsWith("image/")) {
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = await apiClient.saveQuestionAsset(subjectId, file.name || "pasted-image.png", bytes);
    setImage({ path, previewUrl });
    setErrorMessage("");
  }

  function pastedImage(event: ClipboardEvent<HTMLTextAreaElement>) {
    return Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"));
  }

  function pasteImageTo(event: ClipboardEvent<HTMLTextAreaElement>, setImage: (image: ImageDraft) => void) {
    const image = pastedImage(event);
    if (!image) {
      return;
    }
    event.preventDefault();
    void attachImage(image, setImage);
  }

  async function attachOptionImage(label: string, file: File) {
    if (!file.type.startsWith("image/")) {
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = await apiClient.saveQuestionAsset(subjectId, file.name || `${label}-option.png`, bytes);
    setOptions((current) =>
      current.map((option) => (option.label === label ? { ...option, imagePath: path, imagePreviewUrl: previewUrl } : option))
    );
    setErrorMessage("");
  }

  return (
    <section className="entry-workbench entry-edit-workbench">
      <div className="bank-edit-shell entry-edit-shell">
        <header className="bank-edit-header" data-tauri-drag-region>
          <div className="bank-edit-title" data-tauri-drag-region>
            <h2>录入题目</h2>
          </div>
          <div className="bank-edit-actions">
            <Button variant="ghost" onClick={() => setPage("bank")}>
              返回题库
            </Button>
            <Button variant="primary" onClick={saveQuestion}>
              保存后继续
            </Button>
          </div>
        </header>

        <div className="bank-edit-main-card entry-edit-card">
          {saveMessage ? <div className="selection-toolbar">{saveMessage}</div> : null}
          {errorMessage ? <div className="selection-toolbar entry-error" role="alert">{errorMessage}</div> : null}
          <div className="bank-edit-meta-row entry-edit-meta-row">
          <span className="bank-edit-row-label">所属章节</span>
          <div className="bank-edit-chapter-select">
          <Select
            label="章节"
            value={chapterId}
            options={chapters.map((chapter) => ({ label: chapter.name, value: chapter.id }))}
            onChange={setChapterId}
          />
          </div>
          <span className="question-type-badge">{typeLabels[questionType]}</span>
          <div className="entry-type-control">
          <SegmentedControl
            ariaLabel="题型"
            value={questionType}
            options={questionTypes}
            onChange={changeQuestionType}
          />
          </div>
          </div>
        <section className="bank-edit-field bank-edit-primary-field bank-edit-line entry-card">
          <span className="bank-edit-row-label">题目</span>
          <TextArea
            label="题干"
            value={stem}
            minRows={1}
            maxRows={8}
            placeholder="输入题干"
            onChange={setStem}
            onPaste={(event) => pasteImageTo(event, setStemImage)}
          />
          <QuestionAssetPicker
            label="题干图片"
            image={stemImage}
            compact
            onChoose={(file) => void attachImage(file, setStemImage)}
            onRemove={() => setStemImage(emptyImage)}
          />
        </section>
        {isChoiceType ? (
          <>
            <section className="bank-edit-field bank-edit-secondary-field bank-edit-options-section entry-card">
              <span className="bank-edit-row-label">选项</span>
              <div className="bank-edit-options-stack">
              <div className="option-grid option-grid-editing">
              {options.map((option) => (
                <ChoiceOptionCard
                  key={option.label}
                  option={option}
                  checked={
                    questionType === "single_choice"
                      ? singleCorrectLabel === option.label
                      : multipleCorrectLabels.has(option.label)
                  }
                  inputType="checkbox"
                  canRemove={options.length > 2}
                  onCorrectChange={() =>
                    questionType === "single_choice"
                      ? setSingleCorrectLabel((current) => (current === option.label ? "" : option.label))
                      : toggleMultipleCorrect(option.label)
                  }
                  onTextChange={(value) => updateOption(option.label, value)}
                  onImageChoose={(file) => void attachOptionImage(option.label, file)}
                  onImageRemove={() =>
                    setOptions((current) =>
                      current.map((item) =>
                        item.label === option.label ? { ...item, imagePath: null, imagePreviewUrl: null } : item
                      )
                    )
                  }
                  onRemove={() => removeOption(option.label)}
                />
              ))}
              </div>
              <button aria-label="添加选项" className="bank-edit-add-option" onClick={addOption} type="button">
                <Plus size={17} />
              </button>
              </div>
            </section>
            <section className="bank-edit-field bank-edit-primary-field bank-edit-line entry-card">
              <span className="bank-edit-row-label">解析</span>
              <TextArea
                label="解析"
                value={analysis}
                minRows={1}
                maxRows={16}
                placeholder="输入解析"
                onChange={setAnalysis}
                onPaste={(event) => pasteImageTo(event, setAnalysisImage)}
              />
              <QuestionAssetPicker
                label="解析图片"
                image={analysisImage}
                compact
                onChoose={(file) => void attachImage(file, setAnalysisImage)}
                onRemove={() => setAnalysisImage(emptyImage)}
              />
            </section>
          </>
        ) : (
          <section className="bank-edit-field bank-edit-primary-field bank-edit-line entry-card">
            <span className="bank-edit-row-label">答案</span>
            <TextArea
              label="答案"
              value={answer}
              minRows={1}
              maxRows={18}
              placeholder="输入答案"
              onChange={setAnswer}
              onPaste={(event) => pasteImageTo(event, setAnswerImage)}
            />
            <QuestionAssetPicker
              label="答案图片"
              image={answerImage}
              compact
              onChoose={(file) => void attachImage(file, setAnswerImage)}
              onRemove={() => setAnswerImage(emptyImage)}
            />
          </section>
        )}
        </div>
      </div>
    </section>
  );
}
