import type { SubjectId } from "../../app/store";
import type { ExportSheetTheme } from "./types";

const themes: Record<SubjectId, ExportSheetTheme> = {
  pharmaceutics: {
    id: "pharmaceutics",
    subjectId: "pharmaceutics",
    subjectName: "药剂学",
    shortTitle: "药剂学",
    englishTitle: "YIYAN PHARMACY",
    icon: "mortarboard",
    className: "export-theme-pharmaceutics",
    colors: {
      ink: "#24342f",
      muted: "#7f9690",
      primary: "#5f9085",
      primarySoft: "#e7f2ef",
      line: "#cfe0dc",
      paper: "#fbfdfc",
      wash: "#eef7f4",
      accent: "#d8b56d"
    }
  },
  pharmacology: {
    id: "pharmacology",
    subjectId: "pharmacology",
    subjectName: "药理学",
    shortTitle: "药理学",
    englishTitle: "YIYAN PHARMACOLOGY",
    icon: "pulse",
    className: "export-theme-pharmacology",
    colors: {
      ink: "#242a3d",
      muted: "#838ba8",
      primary: "#6574b8",
      primarySoft: "#eceffd",
      line: "#d4d9ef",
      paper: "#fcfcff",
      wash: "#f0f3ff",
      accent: "#7bb7c7"
    }
  },
  medicinal_chemistry: {
    id: "medicinal_chemistry",
    subjectId: "medicinal_chemistry",
    subjectName: "药物化学",
    shortTitle: "药物化学",
    englishTitle: "YIYAN MEDICINAL CHEMISTRY",
    icon: "molecule",
    className: "export-theme-medicinal-chemistry",
    colors: {
      ink: "#342d27",
      muted: "#9b8876",
      primary: "#b66f45",
      primarySoft: "#fbefe8",
      line: "#ecd8cb",
      paper: "#fffdfb",
      wash: "#fff4ec",
      accent: "#5f9d92"
    }
  },
  pharmaceutical_analysis: {
    id: "pharmaceutical_analysis",
    subjectId: "pharmaceutical_analysis",
    subjectName: "药物分析",
    shortTitle: "药物分析",
    englishTitle: "YIYAN PHARMACEUTICAL ANALYSIS",
    icon: "analysis",
    className: "export-theme-pharmaceutical-analysis",
    colors: {
      ink: "#22323e",
      muted: "#7892a2",
      primary: "#4f94b7",
      primarySoft: "#e9f5fa",
      line: "#cfe4ee",
      paper: "#fbfdff",
      wash: "#edf8fc",
      accent: "#7da36a"
    }
  }
};

export function getExportTheme(subjectId: SubjectId): ExportSheetTheme {
  return themes[subjectId];
}
