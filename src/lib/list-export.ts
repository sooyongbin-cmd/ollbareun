"use client";

export type ExportTable = { headers: string[]; rows: (string | number)[][] };
export type ExportFilter = { label: string; value: string };
type DirectoryHandle = {
  getFileHandle: (name: string, options?: { create: boolean }) => Promise<{
    createWritable: () => Promise<{ write: (blob: Blob) => Promise<void>; close: () => Promise<void> }>;
  }>;
};
type ExportWindow = Window & { showDirectoryPicker?: (options: { id: string; mode: "readwrite" }) => Promise<DirectoryHandle> };

const sessionSequences = new Map<string, number>();

const escape = (value: string | number) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildListWorkbook(title: string, filters: ExportFilter[], table: ExportTable) {
  const textCell = (value: string | number) => `<td style="mso-number-format:'\\@';white-space:pre-wrap">${escape(value)}</td>`;
  const rows = [[title], ...filters.map(({ label, value }) => [`${label} : ${value}`]), table.headers, ...table.rows];
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body><table>${rows.map((row) =>
    `<tr>${row.map(textCell).join("")}</tr>`).join("")}</table></body></html>`;
}

export async function downloadListWorkbook(input: {
  title: string;
  filters: ExportFilter[];
  getTable: () => ExportTable | Promise<ExportTable>;
}) {
  // Choose a directory while the click still has user activation. Where supported,
  // inspect real files in that directory and skip existing names without overwriting.
  const directory = await (window as ExportWindow).showDirectoryPicker?.({ id: "manager-excel", mode: "readwrite" });
  const table = await input.getTable();
  if (!table.rows.length) throw new Error("다운로드할 자료가 없습니다.");
  const blob = new Blob(["\ufeff", buildListWorkbook(input.title, input.filters, table)], { type: "application/vnd.ms-excel;charset=utf-8" });
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()).replaceAll("-", "");
  const title = input.title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_");
  const prefix = `${title}_${date}`;
  const key = `list-export:${prefix}`;
  const save = async () => {
    let sequence = 0;
    try { sequence = Number(localStorage.getItem(key)) || 0; } catch { /* Storage can be unavailable in private browsers. */ }
    if (!Number.isSafeInteger(sequence) || sequence < 0) sequence = 0;
    sequence = Math.max(sequence, sessionSequences.get(key) ?? 0);
    let fileName: string;
    do {
      sequence += 1;
      fileName = `${prefix}_${String(sequence).padStart(4, "0")}.xls`;
      if (!directory) break;
      try { await directory.getFileHandle(fileName); }
      catch (error) {
        if (error instanceof DOMException && error.name === "NotFoundError") break;
        throw error;
      }
    } while (true);
    if (directory) {
      const handle = await directory.getFileHandle(fileName, { create: true });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    sessionSequences.set(key, sequence);
    try { localStorage.setItem(key, String(sequence)); } catch { /* The browser still saves the file when storage is disabled. */ }
  };
  if (navigator.locks) await navigator.locks.request(key, save);
  else await save();
}

function displayText(element: Element) {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll("svg,script,style,[data-export-ignore]").forEach((node) => node.remove());
  clone.querySelectorAll("input,select,textarea").forEach((node, index) => {
    const original = element.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea")[index];
    const value = original instanceof HTMLSelectElement ? original.selectedOptions[0]?.text ?? ""
      : original instanceof HTMLInputElement && original.type === "checkbox" ? (original.checked ? "Y" : "N") : original.value;
    node.replaceWith(document.createTextNode(value));
  });
  clone.querySelectorAll("br").forEach((node) => node.replaceWith(document.createTextNode("\n")));
  return (clone.textContent ?? "").replace(/[\t ]+/g, " ").trim();
}

export function readListTable(root: Element): ExportTable {
  const table = root.querySelector("table");
  if (!table) throw new Error("목록을 불러온 뒤 다시 시도하세요.");
  const headings = Array.from(table.querySelectorAll("thead th"));
  const indices = headings.flatMap((heading, index) => heading.hasAttribute("data-export-ignore") ? [] : [index]);
  return {
    headers: indices.map((index) => displayText(headings[index])),
    rows: Array.from(table.querySelectorAll("tbody tr")).filter((row) => !row.querySelector("[colspan]")).map((row) => {
      const cells = row.querySelectorAll("td");
      return indices.map((index) => cells[index] ? displayText(cells[index]) : "");
    }),
  };
}

export function readListFilters(page: Element, list: Element): ExportFilter[] {
  return Array.from(page.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input,select,textarea"))
    .filter((control) => !list.contains(control) && !control.closest("[role=dialog]")
      && !["hidden", "submit", "button"].includes(control.type)
      && (!(control instanceof HTMLInputElement) || control.type !== "radio" || control.checked))
    .flatMap((control) => {
      const labelNode = control.labels?.[0]?.cloneNode(true) as Element | undefined;
      labelNode?.querySelectorAll("input,select,textarea,svg").forEach((node) => node.remove());
      const label = labelNode?.textContent?.trim() || control.getAttribute("aria-label");
      if (!label) return [];
      const value = control instanceof HTMLSelectElement ? control.selectedOptions[0]?.text || "전체"
        : control instanceof HTMLInputElement && control.type === "checkbox" ? (control.checked ? "Y" : "N")
        : control.value || (control.getAttribute("placeholder")?.includes("전체") ? control.getAttribute("placeholder")! : "전체");
      return [{ label, value }];
    });
}
