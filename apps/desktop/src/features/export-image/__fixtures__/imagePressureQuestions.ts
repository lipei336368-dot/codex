import type { QuestionDto } from "../../../shared/api/contracts";

export type ImagePressureScenario = {
  id: string;
  title: string;
  expectedValid: boolean;
  question: QuestionDto;
};

export type ImagePressureManifest = {
  generatedAt: string;
  assets: Array<{
    id: string;
    fileName: string;
    path: string;
    mime: string;
    width: number;
    height: number;
    expected: "valid" | "invalid" | "animated-static-export";
  }>;
};

type AssetPathById = Record<string, string>;

const longAnswer = [
  "1. Pharmaceutics studies dosage-form design, release behavior, stability, and manufacturability.",
  "2. A complete answer must remain readable when a stem image, answer image, and analysis image are all present.",
  "3. The layout must prefer fitting the sheet by reducing density and image height before any scrollbar appears.",
  "4. Extremely wide and tall diagrams should be contained without stretching or cropping.",
  "5. Exported PNG output must preserve the visible image content and remain exactly 1080 by 1920 pixels."
].join("\n");

export function buildImagePressureScenarios(assetPathById: AssetPathById): ImagePressureScenario[] {
  return [
    {
      id: "single-choice-images",
      title: "Single choice with stem and option images",
      expectedValid: true,
      question: baseQuestion({
        id: "pressure-single-choice",
        questionType: "single_choice",
        stem: "Which image handling strategy keeps a wide diagram visible without distortion?",
        stemImagePath: assetPathById["png-wide-4000x500"],
        answer: "C",
        analysis: "Use a bounded image box with object-fit contain, then verify the exported canvas.",
        options: [
          option("A", "Crop the diagram to fill the thumbnail.", assetPathById["png-transparent-128"], false),
          option("B", "Stretch the diagram to match the card.", assetPathById["jpg-normal-800x600"], false),
          option("C", "Fit the diagram inside a bounded box.", assetPathById["png-wide-4000x500"], true),
          option("D", "Ignore image decoding before export.", assetPathById["webp-normal-1200x800"], false)
        ]
      })
    },
    {
      id: "multiple-choice-images",
      title: "Multiple choice with mixed image formats",
      expectedValid: true,
      question: baseQuestion({
        id: "pressure-multiple-choice",
        questionType: "multiple_choice",
        stem: "Which files should decode and render in the editor before export?",
        stemImagePath: assetPathById["jpg-portrait-1080x1920"],
        answer: "A,C",
        analysis: "Valid PNG, JPG, WebP, GIF, and BMP files should decode; corrupt files must be blocked.",
        options: [
          option("A", "A valid PNG diagram.", assetPathById["png-tall-500x4000"], true),
          option("B", "A renamed text file pretending to be JPG.", null, false),
          option("C", "A valid WebP picture.", assetPathById["webp-normal-1200x800"], true),
          option("D", "A corrupt PNG byte stream.", null, false)
        ]
      })
    },
    {
      id: "short-answer-long-answer-image",
      title: "Short answer with long answer text and image",
      expectedValid: true,
      question: baseQuestion({
        id: "pressure-short-answer",
        questionType: "short_answer",
        stem: "Summarize how the system should handle a very large uploaded image.",
        stemImagePath: assetPathById["png-huge-6000x6000"],
        answer: longAnswer,
        answerImagePath: assetPathById["jpg-exif-rotated"],
        analysis: "The ideal path validates, decodes, normalizes only risky images, and exports after all images are ready.",
        analysisImagePath: assetPathById["bmp-normal"],
        options: []
      })
    },
    {
      id: "essay-extreme-mixed",
      title: "Essay with long text and several images",
      expectedValid: true,
      question: baseQuestion({
        id: "pressure-essay-extreme",
        questionType: "essay",
        stem:
          "Discuss the full image pipeline from upload to final daily question PNG output, including validation, decoding, layout, and failure messaging.",
        stemImagePath: assetPathById["png-tall-500x4000"],
        answer: `${longAnswer}\n${longAnswer}`,
        answerImagePath: assetPathById["png-wide-4000x500"],
        analysis: `${longAnswer}\nThe sheet should use dense or micro layout when needed, but it must not hide images behind a scrollbar.`,
        analysisImagePath: assetPathById["webp-normal-1200x800"],
        options: []
      })
    },
    {
      id: "animated-and-bmp",
      title: "Animated GIF and BMP compatibility",
      expectedValid: true,
      question: baseQuestion({
        id: "pressure-animated-bmp",
        questionType: "single_choice",
        stem: "Static PNG export should use a stable frame for GIF-like inputs and should not drop BMP images.",
        stemImagePath: assetPathById["gif-animated"],
        answer: "B",
        analysis: "A final PNG cannot animate; the important rule is to decode predictably and export visible pixels.",
        analysisImagePath: assetPathById["bmp-normal"],
        options: [
          option("A", "The exported PNG should animate.", assetPathById["gif-static"], false),
          option("B", "The exported PNG should contain a stable visible frame.", assetPathById["gif-animated"], true),
          option("C", "BMP images should silently disappear.", assetPathById["bmp-normal"], false),
          option("D", "The export should skip image preflight.", assetPathById["png-tiny-1"], false)
        ]
      })
    },
    {
      id: "invalid-corrupt-image",
      title: "Invalid corrupt image must fail export preflight",
      expectedValid: false,
      question: baseQuestion({
        id: "pressure-invalid-corrupt",
        questionType: "single_choice",
        stem: "This scenario intentionally uses a corrupt image and should not export successfully.",
        stemImagePath: assetPathById["corrupt-png"],
        answer: "A",
        analysis: "The correct behavior is a clear image load failure.",
        options: [
          option("A", "Fail before creating a misleading PNG.", null, true),
          option("B", "Export with a missing image.", null, false)
        ]
      })
    }
  ];
}

function baseQuestion(overrides: Partial<QuestionDto>): QuestionDto {
  return {
    id: "pressure-question",
    subjectId: "pharmaceutics",
    chapterId: "chapter-1",
    questionType: "single_choice",
    stem: "",
    answer: null,
    analysis: null,
    stemImagePath: null,
    answerImagePath: null,
    analysisImagePath: null,
    options: [],
    sourceSchool: null,
    sourceYear: null,
    drawn: false,
    ...overrides
  };
}

function option(label: string, text: string, imagePath: string | null, isCorrect: boolean) {
  return { label, text, imagePath, isCorrect };
}
