export type SubjectThemeKey = "pharmaceutics" | "pharmacology" | "medicinalChemistry" | "pharmaceuticalAnalysis";

export type SubjectTheme = {
  key: SubjectThemeKey;
  accent: string;
  accentDeep: string;
  accentSoft: string;
};

export const subjectThemes: Record<SubjectThemeKey, SubjectTheme> = {
  pharmaceutics: {
    key: "pharmaceutics",
    accent: "#2b8c78",
    accentDeep: "#176b5a",
    accentSoft: "#d9eee8"
  },
  pharmacology: {
    key: "pharmacology",
    accent: "#5366c7",
    accentDeep: "#38489a",
    accentSoft: "#e2e6fb"
  },
  medicinalChemistry: {
    key: "medicinalChemistry",
    accent: "#264f7a",
    accentDeep: "#17375a",
    accentSoft: "#e2edf7"
  },
  pharmaceuticalAnalysis: {
    key: "pharmaceuticalAnalysis",
    accent: "#2f536c",
    accentDeep: "#20394b",
    accentSoft: "#e3edf2"
  }
};

export const SHEET_THEMES = {
  pharmaceutics: {
    className: "sheet-theme-pharmaceutics",
    icon: "capsule",
    primary: "#3f8f8a",
    soft: "#e5f3f1"
  },
  pharmacology: {
    className: "sheet-theme-pharmacology",
    icon: "activity",
    primary: "#7467b7",
    soft: "#ece9f8"
  },
  medicinal_chemistry: {
    className: "sheet-theme-medicinal-chemistry",
    icon: "flask",
    primary: "#c7784f",
    soft: "#f8ebe4"
  },
  pharmaceutical_analysis: {
    className: "sheet-theme-pharmaceutical-analysis",
    icon: "scan",
    primary: "#3d8caf",
    soft: "#e5f2f7"
  }
} as const;
