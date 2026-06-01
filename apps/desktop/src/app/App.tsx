import { lazy, Suspense, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { SubjectSelectPage } from "../features/subject/SubjectSelectPage";
import { useAppStore } from "./store";
import { AppChrome } from "../shared/components/AppChrome";

const WorkbenchPage = lazy(async () => {
  const module = await import("./WorkbenchPage");
  return { default: module.WorkbenchPage };
});

const ImagePressureHarness = lazy(async () => {
  const module = await import("../features/export-image/ImagePressureHarness");
  return { default: module.ImagePressureHarness };
});

export function App() {
  const selectedSubjectId = useAppStore((state) => state.selectedSubjectId);

  if (isImagePressureHarnessRoute()) {
    return (
      <Suspense fallback={<main className="app-route-loading" aria-label="Loading image pressure harness" />}>
        <ImagePressureHarness />
      </Suspense>
    );
  }

  if (!selectedSubjectId) {
    return (
      <AppChrome>
        <WindowReadySignal />
        <SubjectSelectPage />
      </AppChrome>
    );
  }

  return (
    <AppChrome>
      <WindowReadySignal />
      <Suspense fallback={<main className="app-route-loading" aria-label="正在加载工作台" />}>
        <WorkbenchPage subjectId={selectedSubjectId} />
      </Suspense>
    </AppChrome>
  );
}

function WindowReadySignal() {
  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        void showWindowWhenReady();
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, []);

  return null;
}

async function showWindowWhenReady() {
  try {
    await getCurrentWindow().show();
  } catch {
    // Browser-based tests and previews do not provide Tauri window APIs.
  }
}

function isImagePressureHarnessRoute() {
  const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env;
  return Boolean(env?.DEV) && new URLSearchParams(window.location.search).get("harness") === "image-pressure";
}
