"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { educationTypeLabels, educationTypes } from "@/lib/education-periods";
import type { EducationCompletionRow } from "@/lib/education-completions";

const subscribe = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
const snapshot = () => window.location.search;
const emptySnapshot = () => "";

type EducationHistoryFilters = {
  name: string;
  from: string;
  to: string;
  educationType: string;
  resourceId: string;
  employeeId: string;
};

export default function EducationHistoryTable() {
  const search = useSyncExternalStore(subscribe, snapshot, emptySnapshot);
  const defaults = useMemo<EducationHistoryFilters>(() => {
    const params = new URLSearchParams(search);
    return {
      name: params.get("name") ?? "",
      from: params.get("from") ?? "",
      to: params.get("to") ?? "",
      educationType: params.get("educationType") ?? "",
      resourceId: params.get("resourceId") ?? "",
      employeeId: params.get("employeeId") ?? "",
    };
  }, [search]);
  const [override, setOverride] = useState<EducationHistoryFilters | null>(null);
  const filters = override ?? defaults;
  const [applied, setApplied] = useState<EducationHistoryFilters | null>(null);
  const active = applied ?? defaults;
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<EducationCompletionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resources, setResources] = useState<{ id: string; title: string }[]>([]);
  const [reload, setReload] = useState(0);
  const query = useMemo(
    () => new URLSearchParams({ ...active, view: "history", page: String(page) }).toString(),
    [active, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/education/resources", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        if (!controller.signal.aborted) setResources(result.resources ?? []);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/education/completions?${query}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "교육이수 목록을 불러오지 못했습니다.");
        if (!controller.signal.aborted) {
          setRecords(result.completions ?? []);
          setTotal(result.total ?? 0);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "조회에 실패했습니다.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [query, reload]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setApplied({ ...filters });
    setPage(1);
    setReload((value) => value + 1);
  }

  function update(key: keyof EducationHistoryFilters, value: string) {
    setOverride({ ...filters, [key]: value });
  }

  function showAllHistory() {
    const all = { ...defaults, name: "", from: "", to: "", educationType: "", resourceId: "", employeeId: "" };
    setOverride(all);
    setApplied(all);
    setPage(1);
    setReload((value) => value + 1);
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-[1.75rem]">교육이수상세</h1>
        <p className="mt-2 text-sm text-muted-foreground">한국시간 날짜별 교육 이력을 조회합니다. 지난 날짜의 미이수는 이후 이수하더라도 유지됩니다.</p>
      </header>
      <form onSubmit={submit} aria-label="교육이수 검색" className="rounded-xl border border-border/50 bg-muted/40 p-6">
        <fieldset className="grid min-w-0 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-2 text-sm">직원 이름<Input value={filters.name} onChange={(event) => update("name", event.target.value)} /></label>
          <label className="space-y-2 text-sm">시작일<Input type="date" value={filters.from} onChange={(event) => update("from", event.target.value)} /></label>
          <label className="space-y-2 text-sm">종료일<Input type="date" value={filters.to} onChange={(event) => update("to", event.target.value)} /></label>
          <label className="space-y-2 text-sm">교육구분<NativeSelect value={filters.educationType} onChange={(event) => update("educationType", event.target.value)}>
            <NativeSelectOption value="">전체</NativeSelectOption>
            {educationTypes.map((type) => <NativeSelectOption key={type} value={type}>{educationTypeLabels[type]}</NativeSelectOption>)}
          </NativeSelect></label>
          <label className="space-y-2 text-sm">교재<NativeSelect value={filters.resourceId} onChange={(event) => update("resourceId", event.target.value)}>
            <NativeSelectOption value="">전체</NativeSelectOption>
            {filters.resourceId && !resources.some((resource) => resource.id === filters.resourceId) && <NativeSelectOption value={filters.resourceId}>선택한 교재</NativeSelectOption>}
            {resources.map((resource) => <NativeSelectOption key={resource.id} value={resource.id}>{resource.title}</NativeSelectOption>)}
          </NativeSelect></label>
        </fieldset>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="submit">조회</Button>
          <Button variant="outline" type="button" onClick={showAllHistory}>전체 이력</Button>
        </div>
        {(active.resourceId || active.employeeId) && <p className="mt-3 text-sm text-muted-foreground">선택한 교재 또는 직원의 이력을 조회 중입니다. ‘전체 이력’으로 조건을 해제할 수 있습니다.</p>}
      </form>
      {error ? <p role="alert" className="text-destructive">{error}</p> : loading ? <p role="status">교육이수 목록을 불러오는 중입니다.</p> : <>
        <p className="text-right text-sm text-muted-foreground">조회 결과 {total}건</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader><TableRow>
              {["근무자", "날짜", "안전교육", "교육구분", "이수여부", "완료일시"].map((heading) => <TableHead key={heading}>{heading}</TableHead>)}
            </TableRow></TableHeader>
            <TableBody>
              {records.map((record) => <TableRow key={record.id}>
                <TableCell data-label="근무자">{record.employee_name}</TableCell>
                <TableCell data-label="날짜">{record.education_date ?? "날짜 미상"}</TableCell>
                <TableCell data-label="안전교육">{record.resource_title}</TableCell>
                <TableCell data-label="교육구분">{educationTypeLabels[record.education_type]}</TableCell>
                <TableCell data-label="이수여부">{record.is_completed ? "이수" : "미이수"}</TableCell>
                <TableCell data-label="완료일시">{record.completed_at ? new Date(record.completed_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}</TableCell>
              </TableRow>)}
              {!records.length && <TableRow><TableCell colSpan={6} className="p-8 text-center">조회 결과에 해당하는 교육이수 기록이 없습니다.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <nav aria-label="교육이수 페이지" className="flex items-center justify-center gap-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</Button>
          <span>{page} / {Math.max(1, Math.ceil(total / 50))}</span>
          <Button variant="outline" disabled={page * 50 >= total} onClick={() => setPage(page + 1)}>다음</Button>
        </nav>
      </>}
    </section>
  );
}
