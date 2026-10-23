"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadListWorkbook, readListFilters, readListTable, type ExportFilter, type ExportTable } from "@/lib/list-export";

/** Exports the enclosing list's rendered values so Excel matches its visible columns and formatting. */
export default function ListResults({ count, disabled = false, getTable, filters }: {
  count: number;
  disabled?: boolean;
  getTable?: () => ExportTable | Promise<ExportTable>;
  filters?: ExportFilter[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (!ref.current) return;
    let list: HTMLElement | null = ref.current.parentElement;
    while (list && !list.querySelector("table")) list = list.parentElement;
    if (!list) return;
    let page: Element = list;
    while (page.parentElement && !page.querySelector("h1")) page = page.parentElement;
    const title = page.querySelector("h1")?.textContent?.trim() ?? document.title;
    setExporting(true);
    setError("");
    try {
      const tableRoot = list;
      await downloadListWorkbook({ title, filters: filters ?? readListFilters(page, list),
        getTable: getTable ?? (() => readListTable(tableRoot)) });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError"))
        setError(cause instanceof Error ? cause.message : "엑셀 다운로드에 실패했습니다.");
    } finally { setExporting(false); }
  }
  return (
    <div ref={ref} className="flex w-full flex-wrap items-center justify-end gap-3 text-sm font-normal text-muted-foreground">
      <span>조회 결과 {count}</span>
      <Button type="button" variant="outline" className="h-9" disabled={disabled || !count || exporting} onClick={() => void download()}>
        {exporting ? "다운로드 중..." : "엑셀"}
      </Button>
      {error ? <p role="alert" className="w-full text-right text-destructive">{error}</p> : null}
    </div>
  );
}
