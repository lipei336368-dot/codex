import type { PointerEvent, ReactNode } from "react";
import { Minus, Square, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

type AppChromeProps = {
  children: ReactNode;
};

export function AppChrome({ children }: AppChromeProps) {
  return (
    <div className="app-chrome" onPointerDown={handleWindowDragPointerDown}>
      <header className="app-titlebar" data-tauri-drag-region>
        <div className="app-titlebar-brand" data-tauri-drag-region>
          <span className="app-titlebar-mark" aria-hidden="true">
            题
          </span>
          <span data-tauri-drag-region>毅研每日一题生成器</span>
        </div>
        <div className="app-titlebar-drag-region" data-tauri-drag-region />
        <div className="app-titlebar-window-controls">
          <button aria-label="最小化窗口" type="button" onClick={() => void invokeWindowCommand("app_window_minimize")}>
            <Minus size={15} />
          </button>
          <button
            aria-label="最大化窗口"
            type="button"
            onClick={() => void invokeWindowCommand("app_window_toggle_maximize")}
          >
            <Square size={13} />
          </button>
          <button
            aria-label="关闭窗口"
            className="app-titlebar-close"
            type="button"
            onClick={() => void invokeWindowCommand("app_window_close")}
          >
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="app-chrome-content">{children}</div>
    </div>
  );
}

async function handleWindowDragPointerDown(event: PointerEvent<HTMLElement>) {
  if (event.button !== 0) {
    return;
  }

  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (!target.closest("[data-tauri-drag-region]") || isInteractiveDragTarget(target)) {
    return;
  }

  event.preventDefault();
  try {
    await getCurrentWindow().startDragging();
  } catch {
    // Browser-based tests and previews do not provide Tauri window drag APIs.
  }
}

function isInteractiveDragTarget(target: HTMLElement) {
  return Boolean(
    target.closest(
      'button, input, textarea, select, option, a, label, [role="button"], [contenteditable="true"], [data-no-window-drag]'
    )
  );
}

async function invokeWindowCommand(command: "app_window_minimize" | "app_window_toggle_maximize" | "app_window_close") {
  try {
    await invoke(command);
  } catch {
    // Browser-based tests and previews do not provide Tauri window commands.
  }
}
