import type { QuestionDto } from "../../../shared/api/contracts";

const longSolubilityStem =
  "A formulation scientist is comparing weakly acidic drug candidates for an oral solid dosage form. " +
  "The lead compound shows pH-dependent solubility, hydrate formation after wet granulation, and a measurable " +
  "drop in dissolution after accelerated storage. Which interpretation best connects ionization, solid-state " +
  "conversion, and the expected in vivo absorption risk?";

const longOptionText =
  "This option is intentionally long enough to exercise wrapping inside the export sheet while still describing " +
  "a plausible pharmaceutics decision pathway involving solubility, dissolution rate, stability, and absorption.";

export const longChoiceQuestions: QuestionDto[] = [
  {
    id: "stress-single-choice",
    subjectId: "pharmaceutics",
    chapterId: "pharmaceutics-02",
    questionType: "single_choice",
    stem: longSolubilityStem,
    answer: "C",
    analysis:
      "The correct choice connects ionization with apparent solubility, then checks whether storage changes the crystal or hydrate form before assuming absorption will remain unchanged.",
    stemImagePath: null,
    answerImagePath: null,
    analysisImagePath: null,
    options: [
      { label: "A", text: `${longOptionText} It assumes hydrate conversion always improves dissolution.`, imagePath: null, isCorrect: false },
      { label: "B", text: `${longOptionText} It treats pH-dependent solubility as unrelated to absorption.`, imagePath: null, isCorrect: false },
      { label: "C", text: `${longOptionText} It evaluates ionization, solid form, dissolution, and absorption together.`, imagePath: null, isCorrect: true },
      { label: "D", text: `${longOptionText} It ignores storage because accelerated conditions are never informative.`, imagePath: null, isCorrect: false }
    ],
    sourceSchool: "Stress Fixture University",
    sourceYear: "2026",
    drawn: false
  },
  {
    id: "stress-multiple-choice",
    subjectId: "pharmaceutics",
    chapterId: "pharmaceutics-03",
    questionType: "multiple_choice",
    stem:
      "For a poorly soluble drug released from a matrix tablet, which observations would support a release mechanism controlled by both diffusion and matrix erosion?",
    answer: "A C D",
    analysis:
      "A mixed mechanism is supported when water penetration, tortuous diffusion paths, polymer relaxation, and mass loss all contribute to the observed release profile.",
    stemImagePath: null,
    answerImagePath: null,
    analysisImagePath: null,
    options: [
      { label: "A", text: "The hydrated gel layer thickness changes over time while drug concentration gradients remain measurable.", imagePath: null, isCorrect: true },
      { label: "B", text: "The tablet releases all drug immediately after contact with dissolution medium.", imagePath: null, isCorrect: false },
      { label: "C", text: "Polymer mass loss increases during the same interval in which diffusion path length changes.", imagePath: null, isCorrect: true },
      { label: "D", text: "Release kinetics are better described by a combined model than by a pure zero-order or pure diffusion model.", imagePath: null, isCorrect: true }
    ],
    sourceSchool: null,
    sourceYear: null,
    drawn: false
  },
  {
    id: "stress-short-answer",
    subjectId: "pharmaceutics",
    chapterId: "pharmaceutics-03",
    questionType: "short_answer",
    stem:
      "Briefly describe a practical workflow for investigating a dissolution slowdown observed after three months of accelerated storage.",
    answer:
      "Confirm the result with fresh dissolution runs; compare assay, moisture, particle size, polymorph or hydrate form, and tablet hardness; then adjust process or packaging based on the dominant cause.",
    analysis:
      "The workflow should separate analytical error from true product change and should connect physical characterization with a formulation or packaging decision.",
    stemImagePath: null,
    answerImagePath: null,
    analysisImagePath: null,
    options: [],
    sourceSchool: null,
    sourceYear: null,
    drawn: false
  },
  {
    id: "stress-essay",
    subjectId: "pharmaceutics",
    chapterId: "pharmaceutics-02",
    questionType: "essay",
    stem:
      "Discuss how salt selection, particle engineering, excipient compatibility, and packaging could be balanced when developing an oral dosage form for a moisture-sensitive weak base.",
    answer:
      "A strong answer should compare salt forms and free base behavior, evaluate particle size and surface area tradeoffs, screen hygroscopic excipients, and justify packaging that limits moisture without creating unnecessary manufacturing complexity.",
    analysis:
      "Essay responses should show a connected development strategy rather than listing isolated formulation tools.",
    stemImagePath: null,
    answerImagePath: null,
    analysisImagePath: null,
    options: [],
    sourceSchool: "Stress Fixture University",
    sourceYear: "2026",
    drawn: false
  }
];
