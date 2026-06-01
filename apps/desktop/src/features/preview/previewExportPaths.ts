export function answerOutputPath(path: string) {
  if (/每日一题\.png$/i.test(path)) {
    return path.replace(/每日一题\.png$/i, "每日一题答案.png");
  }
  if (/\.png$/i.test(path)) {
    return path.replace(/\.png$/i, "-每日一题答案.png");
  }
  return `${path}-每日一题答案.png`;
}

export function dateCodeFromIsoDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) {
    return todayCode();
  }
  return `${match[2]}${match[3]}`;
}

export function folderFromPath(path: string) {
  const index = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  return index >= 0 ? path.slice(0, index) : "";
}

export function joinPath(folder: string, fileName: string) {
  if (!folder) {
    return fileName;
  }
  const separator = folder.includes("\\") ? "\\" : "/";
  return `${folder.replace(/[\\/]+$/, "")}${separator}${fileName}`;
}

function todayCode(date = new Date()) {
  return `${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}
