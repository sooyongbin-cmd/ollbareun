"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import ConfirmModal from "@/components/modals/confirm-modal";
import { educationToday, educationTypes, educationTypeLabels } from "@/lib/education-periods";
import type { EducationCompletionRow, EducationDayRow } from "@/lib/education-completions";

const subscribe = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};
const snapshot = () => window.location.search;
const emptySnapshot = () => "";

function oneMonthBefore(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 2, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

function formatEducationPeriod(type: EducationDayRow["items"][number]["education_type"], date: string | null) {
  if (!date) return "";
  const [year, month] = date.split("-").map(Number);
  if (type === "monthly") return `${year}년${month}월`;
  if (type === "quarterly") return `${year}년${Math.ceil(month / 3)}분기`;
  if (type === "semiannual") return `${year}년${month <= 6 ? "상반기" : "하반기"}`;
  return date;
}

export default function EducationHistoryTable({ detail = false, employeeId, employeeName, employeeDetail = false }: { detail?: boolean; employeeId?: string; employeeName?: string; employeeDetail?: boolean }) {
  const search = useSyncExternalStore(subscribe, snapshot, emptySnapshot);
  const defaults = useMemo(() => {
    const p = new URLSearchParams(search);
    const selectedDate = p.get("date") ?? p.get("from") ?? p.get("to") ?? "";
    const today = educationToday();
    return { name: employeeName ?? p.get("name") ?? "", from: employeeDetail ? selectedDate : detail ? p.get("from") ?? "" : p.get("from") ?? p.get("date") ?? oneMonthBefore(today),
      to: employeeDetail ? selectedDate : detail ? p.get("to") ?? "" : p.get("to") ?? p.get("date") ?? today, educationType: p.get("educationType") ?? "",
      resourceId: p.get("resourceId") ?? "", employeeId: employeeId ?? p.get("employeeId") ?? "" };
  }, [search, detail, employeeId, employeeName, employeeDetail]);
  const [override, setOverride] = useState<typeof defaults | null>(null);
  const filters = override ?? defaults;
  const [applied, setApplied] = useState<typeof defaults | null>(null);
  const active = employeeDetail ? filters : detail ? applied ?? defaults : filters;
  const [page, setPage] = useState(1);
  const [days, setDays] = useState<EducationDayRow[]>([]);
  const [records, setRecords] = useState<EducationCompletionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [resources, setResources] = useState<{ id: string; title: string }[]>([]);
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [employeeNamesError, setEmployeeNamesError] = useState("");
  const [reload, setReload] = useState(0);
  const query = useMemo(() => new URLSearchParams({ ...active, view: detail ? "history" : "days", page: String(page) }).toString(), [active, detail, page]);

  useEffect(() => {
    if (detail) return;
    const controller = new AbortController();
    fetch("/api/bootstrap", { signal: controller.signal }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "직원 목록을 불러오지 못했습니다.");
      if (!controller.signal.aborted) {
        const names = (result.employees ?? [])
          .filter((employee: { is_retired?: boolean }) => !employee.is_retired)
          .map((employee: { name: string }) => employee.name);
        setEmployeeNames(Array.from(new Set<string>(names)).sort((left, right) => left.localeCompare(right, "ko-KR")));
      }
    }).catch((cause) => {
      if (!controller.signal.aborted) setEmployeeNamesError(cause instanceof Error ? cause.message : "직원 목록을 불러오지 못했습니다.");
    });
    return () => controller.abort();
  }, [detail]);

  useEffect(() => {
    if (!detail || employeeDetail) return;
    const controller = new AbortController();
    fetch("/api/education/resources", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json();
      if (!controller.signal.aborted) setResources(result.resources ?? []);
    }).catch(() => {});
    return () => controller.abort();
  }, [detail, employeeDetail]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (employeeDetail && !active.from) {
        setDays([]);
        setRecords([]);
        setTotal(0);
        setError("");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/education/completions?${query}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "교육이수 목록을 불러오지 못했습니다.");
        if (!controller.signal.aborted) {
          setDays(result.rows ?? []);
          setRecords(result.completions ?? []);
          setTotal(result.total ?? 0);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "조회에 실패했습니다.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    const timeout = window.setTimeout(() => void load(), detail ? 0 : 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, reload, detail, employeeDetail, active.from]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setApplied({ ...filters });
    setPage(1);
    setReload((value) => value + 1);
  }
  function update(key: keyof typeof defaults, value: string) {
    if (filters[key] === value) return;
    setOverride({ ...filters, [key]: value, ...(employeeDetail && key === "from" ? { to: value } : {}), ...(!detail && key === "name" ? { employeeId: "" } : {}) });
    if (!detail) {
      setPage(1);
      setLoading(true);
    }
    if ((employeeDetail || !detail) && (key === "from" || key === "to")) {
      setPage(1);
      setNotice("");
    }
  }
  async function completeEmployeeDate() {
    if (!employeeId || !active.from) return;
    setSending(true);
    setNotice("");
    try {
      const response = await fetch("/api/manager/education/completions/complete-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, educationDate: active.from }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "교육이수 처리에 실패했습니다.");
      setNotice(result.updatedCount ? `안전교육 ${result.updatedCount}건을 이수 처리했습니다.` : "이수 처리할 미이수 안전교육이 없습니다.");
      setConfirmOpen(false);
      setReload((value) => value + 1);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "교육이수 처리에 실패했습니다.");
      setConfirmOpen(false);
    } finally {
      setSending(false);
    }
  }
  async function deleteSelectedCompletion() {
    if (!active.resourceId || records.length !== 1) return;
    setSending(true);
    setNotice("");
    try {
      const response = await fetch(`/api/manager/education/completions/${encodeURIComponent(records[0].id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "안전교육 자료 삭제에 실패했습니다.");
      setNotice("안전교육 자료를 삭제했습니다.");
      setDeleteConfirmOpen(false);
      setReload((value) => value + 1);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "안전교육 자료 삭제에 실패했습니다.");
      setDeleteConfirmOpen(false);
    } finally {
      setSending(false);
    }
  }
  async function sendReminders() {
    setSending(true);
    setNotice("");
    try {
      const employeeIds = new Set<string>();
      for (let index = 1; ; index++) {
        const params = new URLSearchParams({ ...active, view: "days", page: String(index) });
        const response = await fetch(`/api/education/completions?${params}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "알림 대상 조회 실패");
        (payload.rows as EducationDayRow[]).forEach((day) => {
          if (day.items.some((item) => !item.is_completed)) employeeIds.add(day.employee_id);
        });
        if (index * payload.pageSize >= payload.total) break;
      }
      if (!employeeIds.size) { setNotice("조회 조건에 해당하는 미이수 직원이 없습니다."); return; }
      const response = await fetch("/api/education/reminders/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeIds: [...employeeIds] }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "알림 전송 실패");
      const failed = (result.failedEmployees ?? []).map((entry: { employeeName: string; reason: string }) => `${entry.employeeName}: ${entry.reason}`).join(", ");
      setNotice(`전송 ${result.successCount ?? 0}명 / 실패 ${result.failedCount ?? 0}명 / 미등록 ${result.unregisteredCount ?? 0}명${failed ? ` (${failed})` : ""}`);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "알림 전송 실패");
    } finally { setSending(false); }
  }
  const itemCells = (day: EducationDayRow, render: (item: EducationDayRow["items"][number]) => ReactNode) =>
    day.items.map((item) => <div className="py-1" key={item.id}>{render(item)}</div>);
  return <section className="space-y-6">
    <header><h1 className="text-[1.75rem]">{detail ? "교육이수상세" : "교육이수관리"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{employeeDetail ? "선택한 직원의 날짜별 안전교육 이력을 조회합니다." : "한국시간 날짜별 교육 이력을 조회합니다. 지난 날짜의 미이수는 이후 이수하더라도 유지됩니다."}</p></header>
    <form onSubmit={detail && !employeeDetail ? submit : (event) => event.preventDefault()} aria-label="교육이수 검색" className="rounded-xl border border-border/50 bg-muted/40 p-6">
      <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-2 text-sm">{detail ? "직원 이름" : "이름"}<Input value={filters.name} disabled={employeeDetail} list={detail ? undefined : "education-employee-name-options"} placeholder={detail ? undefined : "이름을 입력하세요."} onChange={(e) => update("name", e.target.value)} />
          {!detail && <datalist id="education-employee-name-options">{employeeNames.map((name) => <option key={name} value={name} />)}</datalist>}
        </label>
        {employeeDetail ? <label className="space-y-2 text-sm">날짜<Input type="date" value={filters.from} onChange={(e) => update("from", e.target.value)} /></label> : !detail ? <fieldset className="space-y-2 text-sm"><legend>출근기간</legend><div className="flex items-center gap-2"><Input aria-label="출근 시작일" type="date" value={filters.from} onChange={(e) => update("from", e.target.value)} /><span>~</span><Input aria-label="출근 종료일" type="date" value={filters.to} onChange={(e) => update("to", e.target.value)} /></div></fieldset> : <>
          <label className="space-y-2 text-sm">시작일<Input type="date" value={filters.from} onChange={(e) => update("from", e.target.value)} /></label>
          <label className="space-y-2 text-sm">종료일<Input type="date" value={filters.to} onChange={(e) => update("to", e.target.value)} /></label>
        </>}
        {!employeeDetail && <label className="space-y-2 text-sm">교육구분<NativeSelect value={filters.educationType} onChange={(e) => update("educationType", e.target.value)}>
          <NativeSelectOption value="">전체</NativeSelectOption>
          {educationTypes.map((type) => <NativeSelectOption key={type} value={type}>{educationTypeLabels[type]}</NativeSelectOption>)}
        </NativeSelect></label>}
        {detail && !employeeDetail && <label className="space-y-2 text-sm">교재<NativeSelect value={filters.resourceId} onChange={(e) => update("resourceId", e.target.value)}>
          <NativeSelectOption value="">전체</NativeSelectOption>
          {filters.resourceId && !resources.some((resource) => resource.id === filters.resourceId) && <NativeSelectOption value={filters.resourceId}>선택한 교재</NativeSelectOption>}
          {resources.map((resource) => <NativeSelectOption key={resource.id} value={resource.id}>{resource.title}</NativeSelectOption>)}
        </NativeSelect></label>}
        {employeeDetail && <Button type="button" disabled={sending || loading || !employeeId || !active.from} onClick={() => setConfirmOpen(true)}>교육이수처리</Button>}
        {employeeDetail && <Button type="button" variant="destructive" disabled={sending || loading || !active.resourceId || records.length !== 1} onClick={() => setDeleteConfirmOpen(true)}>삭제</Button>}
        {!detail && <Button type="button" variant="outline" disabled={sending || loading} onClick={() => void sendReminders()}>{sending ? "전송 중…" : "미이수 알림 전송"}</Button>}
      </div>
      {detail && !employeeDetail && <div className="mt-4 flex flex-wrap gap-3">
        {detail && !employeeDetail && <Button type="submit">조회</Button>}
        {detail && !employeeDetail && <Button variant="outline" type="button" onClick={() => { const all = { ...defaults, name: "", from: "", to: "", educationType: "", resourceId: "", employeeId: "" }; setOverride(all); setApplied(all); setPage(1); }}>전체 이력</Button>}
      </div>}
      {detail && !employeeDetail && (active.resourceId || active.employeeId) && <p className="mt-3 text-sm text-muted-foreground">선택한 교재 또는 직원의 이력을 조회 중입니다. ‘전체 이력’으로 조건을 해제할 수 있습니다.</p>}
      {employeeNamesError && <p role="alert" className="mt-3 text-sm text-destructive">{employeeNamesError} 이름을 직접 입력하여 조회할 수 있습니다.</p>}
    </form>
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {employeeDetail && !active.from && <p className="text-sm text-muted-foreground">조회할 날짜를 선택하세요.</p>}
    {employeeDetail && !active.from ? null : error ? <p role="alert" className="text-destructive">{error}</p> : loading ? <p role="status">교육이수 목록을 불러오는 중입니다.</p> : <>
      <p className="text-right text-sm text-muted-foreground">조회 결과 {total}건</p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table><TableHeader><TableRow>
          {(detail ? ["근무자", "날짜", "안전교육", "교육구분", "이수여부", "완료일시"] : ["출근자", "날짜", "안전교육", "구분", "이수여부"]).map((heading, index) => <TableHead key={index}>{heading}</TableHead>)}
        </TableRow></TableHeader><TableBody>
          {detail ? records.map((record) => <TableRow key={record.id}>
            <TableCell data-label="근무자">{record.employee_name}</TableCell><TableCell data-label="날짜">{record.education_date ?? "날짜 미상"}</TableCell>
            <TableCell data-label="안전교육">{record.resource_title}</TableCell><TableCell data-label="교육구분">{educationTypeLabels[record.education_type]}</TableCell>
            <TableCell data-label="이수여부">{record.is_completed ? "이수" : "미이수"}</TableCell>
            <TableCell data-label="완료일시">{record.completed_at ? new Date(record.completed_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}</TableCell>
          </TableRow>) : days.map((day) => <TableRow key={`${day.employee_id}:${day.education_date}`}>
            <TableCell data-label="출근자">{day.employee_name}</TableCell>
            <TableCell data-label="날짜">{itemCells(day, (item) => <Link className="text-primary hover:underline" href={`/manager/safety/completions/${encodeURIComponent(day.employee_id)}?${new URLSearchParams({ date: day.education_date ?? "", resourceId: item.resource_id })}`}>{formatEducationPeriod(item.education_type, day.education_date)}</Link>)}</TableCell>
            <TableCell data-label="안전교육">{itemCells(day, (item) => item.resource_title)}</TableCell>
            <TableCell data-label="구분">{itemCells(day, (item) => educationTypeLabels[item.education_type])}</TableCell>
            <TableCell data-label="이수여부">{itemCells(day, (item) => item.is_completed ? "이수" : "미이수")}</TableCell>
          </TableRow>)}
          {(detail ? !records.length : !days.length) && <TableRow><TableCell colSpan={detail ? 6 : 5} className="p-8 text-center">{detail ? "조회 결과에 해당하는 교육이수 기록이 없습니다." : "선택한 출근기간에 출근 기록이 없습니다."}</TableCell></TableRow>}
        </TableBody></Table>
      </div>
      <nav aria-label="교육이수 페이지" className="flex items-center justify-center gap-4">
        <Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</Button>
        <span>{page} / {Math.max(1, Math.ceil(total / 50))}</span>
        <Button variant="outline" disabled={page * 50 >= total} onClick={() => setPage(page + 1)}>다음</Button>
      </nav>
    </>}
    {employeeDetail && <ConfirmModal isOpen={confirmOpen} onClose={() => { if (!sending) setConfirmOpen(false); }} onConfirm={() => void completeEmployeeDate()} title={`근무자 ${filters.name} 의 ${active.from || "0000-00-00"} 일자의 안전교육을 모두 이수처리할까요?`} confirmLabel="이수처리" cancelLabel="취소" loading={sending} loadingLabel="교육이수 처리 중입니다..." />}
    {employeeDetail && <ConfirmModal isOpen={deleteConfirmOpen} onClose={() => { if (!sending) setDeleteConfirmOpen(false); }} onConfirm={() => void deleteSelectedCompletion()} title={`근무자 ${filters.name} 의 ${active.from || "0000-00-00"} 일자 안전교육 자료를 삭제할까요?`} confirmLabel="삭제" cancelLabel="취소" loading={sending} loadingLabel="삭제 중입니다..." />}
  </section>;
}
