import { open, save } from "@tauri-apps/plugin-dialog";
import { apiClient } from "../api/client";

type SaveTextFileOptions = {
  title: string;
  defaultPath: string;
  filters: Array<{ name: string; extensions: string[] }>;
};

export async function saveTextFile(options: SaveTextFileOptions, content: string): Promise<string | null> {
  const path = await save(options);
  if (!path) {
    return null;
  }

  await apiClient.writeTextFile(path, content);
  return path;
}

export async function chooseSavePath(options: SaveTextFileOptions): Promise<string | null> {
  return save(options);
}

export async function chooseDirectory(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false
  });
  return typeof selected === "string" ? selected : null;
}
