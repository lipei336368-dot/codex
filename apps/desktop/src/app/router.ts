import type { AppPage } from "./store";

export type NavigationItem = {
  page: AppPage;
  label: string;
};

export const navigationItems: NavigationItem[] = [
  { page: "bank", label: "题库" },
  { page: "entry", label: "录题" },
  { page: "settings", label: "设置" }
];
