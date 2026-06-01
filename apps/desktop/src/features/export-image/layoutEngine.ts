import type { ExportLayoutPlan, ExportQuestionBlock, SheetDensity, SheetKind } from "./types";

export function chooseLayoutPlan(questions: ExportQuestionBlock[], kind: SheetKind): ExportLayoutPlan {
  const textScore = questions.reduce((sum, question) => {
    const optionText = question.options.reduce((optionSum, option) => optionSum + (option.text?.length ?? 0), 0);
    const answerWeight = kind === "answer" ? (question.answer?.length ?? 0) * 1.1 : 0;
    const analysisWeight = kind === "answer" ? (question.analysis?.length ?? 0) * 1.25 : 0;
    return sum + question.stem.length * 1.15 + optionText * 0.9 + answerWeight + analysisWeight;
  }, 0);
  const imageScore = questions.reduce((sum, question) => {
    return (
      sum +
      (question.stemImagePath ? 2 : 0) +
      (question.answerImagePath ? 2 : 0) +
      (question.analysisImagePath ? 2 : 0) +
      question.options.filter((option) => option.imagePath).length
    );
  }, 0);
  const totalScore = textScore + imageScore * 180 + questions.length * (kind === "answer" ? 100 : 140);

  return {
    density: densityFromScore(totalScore, questions.length, kind),
    textScore,
    imageScore,
    totalScore,
    hasImages: imageScore > 0
  };
}

function densityFromScore(score: number, count: number, kind: SheetKind): SheetDensity {
  const answerOffset = kind === "answer" ? 260 : 0;
  if (score > 5200 + answerOffset || count >= 8) return "micro";
  if (score > 1900 + answerOffset) return "ultra";
  if (score > 1300 + answerOffset || count >= 5) return "dense";
  if (score > 850 || count >= 4) return "compact";
  if (score < 420 && count <= 2) return "roomy";
  return "normal";
}
