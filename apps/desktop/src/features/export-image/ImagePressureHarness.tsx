import { useEffect, useMemo, useRef, useState } from "react";
import "../../shared/design-system/preview.css";
import "../../shared/design-system/export-image.css";
import "../../shared/design-system/bank.css";
import type { PreviewBatch, SubjectId } from "../../app/store";
import type { ChapterDto, QuestionOptionInput } from "../../shared/api/contracts";
import { VirtualQuestionList } from "../../shared/components/VirtualQuestionList";
import { exportSheetToPngBytes } from "./exportImage";
import { buildImagePressureScenarios, type ImagePressureScenario } from "./__fixtures__/imagePressureQuestions";
import { imagePressureManifest } from "./__fixtures__/imagePressureManifest.generated";
import { BankEditPanel } from "../bank/components/BankEditPanel";
import { ChoiceOptionCard } from "../entry/components/ChoiceOptionCard";
import { QuestionAssetPicker } from "../entry/components/QuestionAssetPicker";
import { PreviewSheets, type BatchSheetElements } from "../preview/PreviewSheets";

type ExportKind = "question" | "answer";
type HarnessSurface = "preview" | "edit" | "entry" | "bank";

declare global {
  interface Window {
    __IMAGE_PRESSURE_EXPORT__?: (kind: ExportKind) => Promise<{
      width: number;
      height: number;
      pngWidth: number;
      pngHeight: number;
      byteLength: number;
    }>;
    __IMAGE_PRESSURE_SCENARIOS__?: Array<{ id: string; expectedValid: boolean }>;
  }
}

const subjectId: SubjectId = "pharmaceutics";

export function ImagePressureHarness() {
  const batchSheetRefs = useRef<Record<string, BatchSheetElements>>({});

  const scenarios = useMemo(() => {
    const assetPathById = Object.fromEntries(imagePressureManifest.assets.map((asset) => [asset.id, asset.path]));
    return buildImagePressureScenarios(assetPathById);
  }, []);

  const selectedScenario = useMemo(() => selectScenario(scenarios), [scenarios]);
  const selectedSurface = useMemo(() => selectSurface(), []);
  const batch = useMemo(() => scenarioToBatch(selectedScenario), [selectedScenario]);

  useEffect(() => {
    window.__IMAGE_PRESSURE_SCENARIOS__ = scenarios.map((scenario) => ({
      id: scenario.id,
      expectedValid: scenario.expectedValid
    }));
    window.__IMAGE_PRESSURE_EXPORT__ = async (kind: ExportKind) => {
      if (!batch) {
        throw new Error("image pressure scenario is not ready");
      }
      const element = batchSheetRefs.current[batch.id]?.[kind];
      if (!element) {
        throw new Error(`missing ${kind} export sheet`);
      }
      const result = await exportSheetToPngBytes(element);
      const pngSize = readPngSize(result.bytes);
      return {
        width: result.width,
        height: result.height,
        pngWidth: pngSize.width,
        pngHeight: pngSize.height,
        byteLength: result.bytes.byteLength
      };
    };

    return () => {
      window.__IMAGE_PRESSURE_EXPORT__ = undefined;
      window.__IMAGE_PRESSURE_SCENARIOS__ = undefined;
    };
  }, [batch, scenarios]);

  function registerCaptureRef(batchId: string, kind: keyof BatchSheetElements, element: HTMLElement | null) {
    batchSheetRefs.current[batchId] = {
      question: batchSheetRefs.current[batchId]?.question ?? null,
      answer: batchSheetRefs.current[batchId]?.answer ?? null,
      [kind]: element
    };
  }

  if (!batch || !selectedScenario) {
    return <main data-testid="image-pressure-loading">Loading image pressure harness</main>;
  }

  return (
    <main className="preview-page image-pressure-harness" data-testid="image-pressure-ready">
      <header className="image-pressure-header">
        <strong>{selectedScenario.title}</strong>
        <span>
          {selectedSurface} / {selectedScenario.expectedValid ? "valid" : "invalid"}
        </span>
      </header>
      {selectedSurface === "preview" ? (
        <PreviewSheets
          subjectId={subjectId}
          examDate="2026-12-19"
          activeBatch={batch}
          captureBatches={[batch]}
          registerCaptureRef={registerCaptureRef}
          onOpenLightbox={() => undefined}
        />
      ) : null}
      {selectedSurface === "edit" ? <ImagePressureEditSurface scenario={selectedScenario} /> : null}
      {selectedSurface === "entry" ? <ImagePressureEntrySurface scenario={selectedScenario} /> : null}
      {selectedSurface === "bank" ? <ImagePressureBankSurface scenarios={scenarios} /> : null}
    </main>
  );
}

function selectScenario(scenarios: ImagePressureScenario[]) {
  const requestedId = new URLSearchParams(window.location.search).get("scenario");
  return scenarios.find((scenario) => scenario.id === requestedId) ?? scenarios[0] ?? null;
}

function selectSurface(): HarnessSurface {
  const requestedSurface = new URLSearchParams(window.location.search).get("surface");
  return requestedSurface === "edit" || requestedSurface === "entry" || requestedSurface === "bank" ? requestedSurface : "preview";
}

function scenarioToBatch(scenario: ImagePressureScenario | null): PreviewBatch | null {
  if (!scenario) {
    return null;
  }

  return {
    id: scenario.id,
    title: scenario.title,
    publishDate: "2026-05-28",
    questions: [scenario.question]
  };
}

function readPngSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20)
  };
}

const chapters: ChapterDto[] = [
  {
    id: "chapter-1",
    subjectId,
    order: 1,
    name: "Chapter 1 image pressure",
    noRequirement: false
  }
];

function ImagePressureEditSurface({ scenario }: { scenario: ImagePressureScenario }) {
  const question = scenario.question;
  const [chapterId, setChapterId] = useState(question.chapterId);
  const [stem, setStem] = useState(question.stem);
  const [answer, setAnswer] = useState(question.answer ?? "");
  const [analysis, setAnalysis] = useState(question.analysis ?? "");
  const [stemImagePath, setStemImagePath] = useState(question.stemImagePath);
  const [answerImagePath, setAnswerImagePath] = useState(question.answerImagePath);
  const [analysisImagePath, setAnalysisImagePath] = useState(question.analysisImagePath);
  const [options, setOptions] = useState<QuestionOptionInput[]>(question.options);
  const optionPreviews = useMemo(
    () => Object.fromEntries(options.map((option) => [option.label, option.imagePath])),
    [options]
  );

  return (
    <BankEditPanel
      immersive
      question={question}
      chapters={chapters}
      editingChapterId={chapterId}
      setEditingChapterId={setChapterId}
      chapterName="Chapter 1 image pressure"
      editingStem={stem}
      setEditingStem={setStem}
      editingAnswer={answer}
      setEditingAnswer={setAnswer}
      editingAnalysis={analysis}
      setEditingAnalysis={setAnalysis}
      editingStemImagePath={stemImagePath}
      editingStemImagePreview={stemImagePath}
      setEditingStemImagePath={setStemImagePath}
      setEditingStemImagePreview={setStemImagePath}
      editingAnswerImagePath={answerImagePath}
      editingAnswerImagePreview={answerImagePath}
      setEditingAnswerImagePath={setAnswerImagePath}
      setEditingAnswerImagePreview={setAnswerImagePath}
      editingAnalysisImagePath={analysisImagePath}
      editingAnalysisImagePreview={analysisImagePath}
      setEditingAnalysisImagePath={setAnalysisImagePath}
      setEditingAnalysisImagePreview={setAnalysisImagePath}
      editingOptions={options}
      setEditingOptions={setOptions}
      editingOptionImagePreviews={optionPreviews}
      setEditingOptionImagePreviews={() => undefined}
      attachEditingImage={async (_file, setPath, setPreview) => {
        setPath(stemImagePath);
        setPreview(stemImagePath);
      }}
      setLightboxImage={() => undefined}
      onCancel={() => undefined}
      onSave={() => undefined}
    />
  );
}

function ImagePressureEntrySurface({ scenario }: { scenario: ImagePressureScenario }) {
  const question = scenario.question;
  const options = question.options.length > 0 ? question.options : defaultEntryOptions();

  return (
    <section className="bank-edit-shell image-pressure-entry">
      <header className="bank-edit-header">
        <div className="bank-edit-title">
          <h2>Entry image pressure</h2>
        </div>
      </header>
      <div className="question-editor-panel-body bank-edit-main-card">
        <div className="bank-edit-meta-row">
          <span className="bank-edit-row-label">Chapter</span>
          <span className="question-type-badge">{question.questionType}</span>
        </div>
        <div className="bank-edit-form-grid bank-edit-choice-grid">
          <section className="bank-edit-field bank-edit-primary-field bank-edit-line entry-card">
            <span className="bank-edit-row-label">Stem</span>
            <textarea aria-label="pressure entry stem" value={question.stem} readOnly />
            <QuestionAssetPicker
              label="stem image"
              image={{ path: question.stemImagePath, previewUrl: question.stemImagePath }}
              compact
              onChoose={() => undefined}
              onRemove={() => undefined}
            />
          </section>
          <section className="bank-edit-field bank-edit-secondary-field bank-edit-options-section entry-card">
            <span className="bank-edit-row-label">Options</span>
            <div className="bank-edit-options-stack">
              <div className="option-grid option-grid-editing">
                {options.map((option) => (
                  <ChoiceOptionCard
                    key={option.label}
                    option={{
                      label: option.label,
                      text: option.text ?? "",
                      imagePath: option.imagePath,
                      imagePreviewUrl: option.imagePath
                    }}
                    checked={option.isCorrect}
                    inputType="checkbox"
                    canRemove
                    onCorrectChange={() => undefined}
                    onTextChange={() => undefined}
                    onImageChoose={() => undefined}
                    onImageRemove={() => undefined}
                    onRemove={() => undefined}
                  />
                ))}
              </div>
            </div>
          </section>
          <section className="bank-edit-field bank-edit-primary-field bank-edit-line entry-card">
            <span className="bank-edit-row-label">Answer</span>
            <textarea aria-label="pressure entry answer" value={question.answer ?? question.analysis ?? ""} readOnly />
            <QuestionAssetPicker
              label="answer image"
              image={{ path: question.answerImagePath, previewUrl: question.answerImagePath }}
              compact
              onChoose={() => undefined}
              onRemove={() => undefined}
            />
          </section>
        </div>
      </div>
    </section>
  );
}

function ImagePressureBankSurface({ scenarios }: { scenarios: ImagePressureScenario[] }) {
  return (
    <section className="bank-workspace image-pressure-bank">
      <VirtualQuestionList
        questions={scenarios.map((scenario) => scenario.question)}
        selectedIds={new Set()}
        selectionMode="checkbox"
        onToggle={() => undefined}
        onOpen={() => undefined}
        renderActions={() => (
          <>
            <button className="row-action-button" type="button">
              Edit
            </button>
            <button className="row-action-button row-action-danger" type="button">
              Delete
            </button>
          </>
        )}
      />
    </section>
  );
}

function defaultEntryOptions(): QuestionOptionInput[] {
  return ["A", "B", "C", "D"].map((label) => ({ label, text: "", imagePath: null, isCorrect: label === "A" }));
}
