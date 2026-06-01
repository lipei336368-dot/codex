export function defaultPathInDirectory(directory: string, fileName: string) {
  const trimmed = directory.trim();
  if (!trimmed) {
    return fileName;
  }

  const separator = trimmed.includes("\\") ? "\\" : "/";
  return `${trimmed.replace(/[\\/]+$/, "")}${separator}${fileName}`;
}
