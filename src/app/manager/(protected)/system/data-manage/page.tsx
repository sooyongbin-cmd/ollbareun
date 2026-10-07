"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";
import { emptyYearDataCounts, yearDataTables, type YearDataSummary } from "@/lib/year-data-types";

async function loadSummary(year?: number) {
  const response = await fetch(`/api/system/data-manage${year == null ? "" : `?year=${year}`}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "자료를 조회하지 못했습니다.");
  return data as YearDataSummary;
}

export default function DataManagePage() {
  const [summary, setSummary] = useState<YearDataSummary>({ years: [], year: null, counts: emptyYearDataCounts });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const requestSequence = useRef(0);
  const deletionInProgress = useRef(false);

  useEffect(() => {
    let active = true;
    loadSummary().then((result) => { if (active) setSummary(result); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "자료 조회 실패"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function changeYear(year?: number) {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError("");
    try {
      const result = await loadSummary(year);
      if (sequence === requestSequence.current) setSummary(result);
    } catch (cause) {
      if (sequence === requestSequence.current) setError(cause instanceof Error ? cause.message : "자료 조회 실패");
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }

  async function deleteData() {
    if (summary.year == null || confirmStep !== 2 || deletionInProgress.current) return;
    deletionInProgress.current = true;
    setDeleting(true);
    setError("");
    const year = summary.year;
    try {
      const response = await fetch("/api/system/data-manage", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, confirmed: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "자료를 삭제하지 못했습니다.");
      setConfirmStep(0);
      setMessage(`${year} 년도의 자료를 삭제했습니다.`);
      try {
        setSummary(await loadSummary());
      } catch {
        setError("자료는 삭제되었습니다. 목록을 갱신하지 못했으니 화면을 새로고침해 주세요.");
      }
    } catch (cause) {
      setConfirmStep(0);
      setError(cause instanceof Error ? cause.message : "자료 삭제 실패");
    } finally {
      deletionInProgress.current = false;
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-6">
      <header><h1 className="text-[1.75rem] leading-[1.2]">자료관리</h1></header>
      <section aria-label="자료 조회" className="rounded-xl border border-border/50 bg-muted/40 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <label htmlFor="data-manage-year" className="block text-sm font-medium">연도</label>
            <select id="data-manage-year" className="h-10 min-w-36 rounded-md border border-input bg-background px-3 text-sm" value={summary.year ?? ""} disabled={loading || deleting || confirmStep !== 0} onChange={(event) => void changeYear(Number(event.target.value))}>
              {summary.years.length === 0 ? <option value="">자료 없음</option> : summary.years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <Button variant="destructive" disabled={loading || deleting || Boolean(error) || summary.year == null || confirmStep !== 0} onClick={() => setConfirmStep(1)}>자료삭제</Button>
        </div>
      </section>
      {error ? <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
        <p role="alert" className="text-sm text-destructive">{error}</p>
        <Button variant="outline" disabled={loading || deleting} onClick={() => void changeYear(summary.year ?? undefined)}>다시 조회</Button>
      </div> : null}
      <section aria-label="자료 목록" className="rounded-xl border border-border/50 bg-muted/40 p-6">
        {loading ? <p role="status">조회중입니다...</p> : <>
          <Table>
            <TableHeader><TableRow><TableHead>자료</TableHead><TableHead>테이블</TableHead><TableHead className="text-right">건수</TableHead></TableRow></TableHeader>
            <TableBody>{yearDataTables.map(({ table, label }) => <TableRow key={table}>
              <TableCell data-label="자료">{label}</TableCell><TableCell data-label="테이블">{table}</TableCell><TableCell data-label="건수" className="text-right tabular-nums">{summary.counts[table].toLocaleString("ko-KR")}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
          <p className="mt-4 text-sm text-muted-foreground">휴가는 시작일, 점검지는 점검일시, 특이사항은 보고일시(한국 시간)를 기준으로 조회합니다.</p>
        </>}
      </section>
      <ConfirmModal isOpen={confirmStep !== 0} onClose={() => { if (!deleting) setConfirmStep(0); }} onConfirm={() => { if (confirmStep === 1) setConfirmStep(2); else void deleteData(); }} title={confirmStep === 1 ? `${summary.year} 년도의 자료를 삭제하시겠습니까?` : `자료를 삭제하면 복구할 수 없습니다. ${summary.year} 년도의 자료를 삭제하시겠습니까?`} loading={deleting} loadingLabel="자료삭제중입니다..." />
      <AlertModal isOpen={Boolean(message)} title="자료삭제 완료" description={message} onClose={() => setMessage("")} />
    </section>
  );
}
