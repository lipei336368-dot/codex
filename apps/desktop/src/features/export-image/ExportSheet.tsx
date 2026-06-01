import { convertFileSrc } from "@tauri-apps/api/core";
import type { CSSProperties, Ref } from "react";
import { useCallback, useLayoutEffect, useRef } from "react";
import type { ExportQuestionBlock, ExportSheetModel } from "./types";

type ExportSheetProps = {
  model: ExportSheetModel;
  scale?: "native" | "preview";
  onClick?: () => void;
  sheetRef?: Ref<HTMLElement>;
};

export function ExportSheet({ model, scale = "native", onClick, sheetRef }: ExportSheetProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const setSheetRef = useCallback(
    (node: HTMLElement | null) => {
      rootRef.current = node;
      assignRef(sheetRef, node);
    },
    [sheetRef]
  );

  useExportSheetFit(rootRef, model.density, model.questions.length);

  return (
    <article
      className={`export-sheet ${model.theme.className} export-sheet-${model.kind} export-sheet-scale-${scale}`}
      data-density={model.density}
      data-testid="export-sheet"
      onClick={onClick}
      ref={setSheetRef}
      style={
        {
          "--sheet-ink": model.theme.colors.ink,
          "--sheet-muted": model.theme.colors.muted,
          "--sheet-primary": model.theme.colors.primary,
          "--sheet-primary-soft": model.theme.colors.primarySoft,
          "--sheet-line": model.theme.colors.line,
          "--sheet-paper": model.theme.colors.paper,
          "--sheet-wash": model.theme.colors.wash,
          "--sheet-accent": model.theme.colors.accent
        } as CSSProperties
      }
    >
      <div className="export-sheet-border" />
      <header className="export-sheet-header">
        <div className={`export-sheet-icon export-sheet-icon-${model.theme.icon}`} aria-hidden="true" />
        <div className="export-sheet-brand">
          <span />
          <strong>毅研为定药学考研</strong>
          <span />
        </div>
        <h1>{model.title}</h1>
        <p>{model.theme.englishTitle} · DAILY PRACTICE</p>
      </header>

      <section className="export-sheet-meta">
        <div className="export-meta-card">
          <span className="export-meta-symbol export-meta-calendar" aria-hidden="true" />
          <strong>{model.dateLabel}</strong>
        </div>
        <div className="export-meta-card">
          <span className="export-meta-symbol export-meta-clock" aria-hidden="true" />
          <strong>距离考研还有 {model.meta.daysUntilExam} 天</strong>
        </div>
      </section>

      <main className="export-sheet-content">
        {model.questions.map((question) =>
          model.kind === "answer" ? (
            <AnswerCard key={question.id} question={question} />
          ) : (
            <QuestionCard key={question.id} question={question} />
          )
        )}
      </main>

      <footer className="export-sheet-footer">
        <span>毅研为定832770398</span>
        <span>{model.theme.englishTitle}</span>
      </footer>
    </article>
  );
}

function useExportSheetFit(rootRef: { current: HTMLElement | null }, density: string, questionCount: number) {
  useLayoutEffect(() => {
    const element = rootRef.current;
    const content = element?.querySelector<HTMLElement>(".export-sheet-content");
    const footer = element?.querySelector<HTMLElement>(".export-sheet-footer");
    if (!element || !content || !footer) {
      return;
    }

    let frame = 0;
    const fit = () => {
      content.style.transform = "";
      content.style.transformOrigin = "";
      content.style.width = "";
      content.style.gap = "";

      const elementRect = element.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      const contentTop = contentRect.top - elementRect.top;
      const footerTop = footerRect.top - elementRect.top;
      const availableHeight = Math.max(footerTop - contentTop - 12, 1);
      const contentHeight = Math.max(contentRect.height, 1);

      if (contentHeight <= availableHeight + 2) {
        return;
      }

      const minimumScale = density === "micro" ? 0.34 : 0.48;
      const nextScale = Math.min(1, Math.max(minimumScale, availableHeight / contentHeight));
      content.style.transform = `scale(${nextScale})`;
      content.style.transformOrigin = "top left";
      content.style.width = `${100 / nextScale}%`;
      content.style.gap = nextScale < 0.72 ? "8px" : "";
    };

    fit();
    frame = window.requestAnimationFrame(fit);
    const images = Array.from(element.querySelectorAll("img"));
    images.forEach((image) => image.addEventListener("load", fit, { once: true }));

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            fit();
          });
    resizeObserver?.observe(element);
    resizeObserver?.observe(content);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      images.forEach((image) => image.removeEventListener("load", fit));
      resizeObserver?.disconnect();
    };
  }, [density, questionCount, rootRef]);
}

function assignRef(ref: Ref<HTMLElement> | undefined, node: HTMLElement | null) {
  if (!ref) {
    return;
  }
  if (typeof ref === "function") {
    ref(node);
    return;
  }
  (ref as { current: HTMLElement | null }).current = node;
}

function QuestionCard({ question }: { question: ExportQuestionBlock }) {
  return (
    <section className="export-question-card">
      <div className="export-question-number">{question.index}</div>
      <div className="export-question-main">
        <div className="export-question-type">{question.typeLabel}</div>
        <h2>{question.stem}</h2>
        <InlineImage path={question.stemImagePath} alt={`第${question.index}题题干图片`} />
        {question.options.length > 0 ? (
          <div className={question.options.some((option) => option.imagePath) ? "export-options export-options-with-images" : "export-options"}>
            {question.options.map((option) => (
              <div className="export-option" key={option.label}>
                <span className="export-option-label">{option.label}</span>
                {option.text ? <span className="export-option-text">{option.text}</span> : null}
                <InlineImage path={option.imagePath} alt={`选项${option.label}图片`} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function AnswerCard({ question }: { question: ExportQuestionBlock }) {
  const answer = question.answer?.trim() || "暂无答案";
  const isOpenAnswer = question.questionType === "short_answer" || question.questionType === "essay";

  return (
    <section className="export-question-card export-answer-card">
      <div className="export-question-number">{question.index}</div>
      <div className="export-question-main">
        <div className="export-question-type">{question.typeLabel}</div>
        <h2>{question.stem}</h2>
        <div className="export-answer-pill">{isOpenAnswer ? "参考答案" : `答案：${answer}`}</div>
        {question.answerText ? <StructuredText className="export-answer-text" text={question.answerText} /> : null}
        <InlineImage path={question.answerImagePath} alt={`第${question.index}题答案图片`} />
        {question.analysis ? <StructuredText className="export-analysis" text={question.analysis} /> : null}
        <InlineImage path={question.analysisImagePath} alt={`第${question.index}题解析图片`} />
      </div>
    </section>
  );
}

function StructuredText({ className, text }: { className: string; text: string }) {
  const lines = splitStructuredLines(text);

  return (
    <div className={className}>
      {lines.map((line, index) => (
        <p className="export-structured-line" data-testid="export-structured-line" key={`${line}-${index}`}>
          {line}
        </p>
      ))}
    </div>
  );
}

function splitStructuredLines(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*([（(]\d+[）)])/g, "\n$1")
    .replace(/\s*(\d+[、.．]\s*)/g, "\n$1")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function InlineImage({ path, alt }: { path: string | null; alt: string }) {
  if (!path) {
    return null;
  }

  return <img className="export-inline-image" src={toImageSrc(path)} alt={alt} />;
}

function toImageSrc(path: string) {
  if (path.startsWith("blob:") || path.startsWith("data:") || path.startsWith("http:") || path.startsWith("https:") || path.startsWith("/")) {
    return path;
  }
  try {
    return convertFileSrc(path);
  } catch {
    return path;
  }
}
