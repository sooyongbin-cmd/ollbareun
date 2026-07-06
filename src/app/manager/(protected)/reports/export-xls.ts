"use client";

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

function escapeCell(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function saveRowsAsXls(input: {
  fileName: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${input.headers
    .map((header) => `<th>${escapeCell(header)}</th>`)
    .join("")}</tr></thead><tbody>${input.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeCell(cell)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const fileName = input.fileName.endsWith(".xls") ? input.fileName : `${input.fileName}.xls`;
  const pickerWindow = window as SaveFilePickerWindow;

  if (pickerWindow.showSaveFilePicker) {
    const handle = await pickerWindow.showSaveFilePicker({
      suggestedName: fileName,
      types: [
        {
          description: "Excel 97-2003 Workbook",
          accept: { "application/vnd.ms-excel": [".xls"] },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
