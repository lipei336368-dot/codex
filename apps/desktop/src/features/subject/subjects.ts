import type { SubjectId } from "../../app/store";

export type SubjectDefinition = {
  id: SubjectId;
  name: string;
  shortName: string;
  themeKey: "pharmaceutics" | "pharmacology" | "medicinalChemistry" | "pharmaceuticalAnalysis";
};

export const SUBJECTS: SubjectDefinition[] = [
  { id: "pharmaceutics", name: "药剂学", shortName: "药剂", themeKey: "pharmaceutics" },
  { id: "pharmacology", name: "药理学", shortName: "药理", themeKey: "pharmacology" },
  { id: "medicinal_chemistry", name: "药物化学", shortName: "药化", themeKey: "medicinalChemistry" },
  { id: "pharmaceutical_analysis", name: "药物分析", shortName: "药分", themeKey: "pharmaceuticalAnalysis" }
];
