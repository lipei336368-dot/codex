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
