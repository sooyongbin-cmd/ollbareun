"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmModal from "@/components/modals/confirm-modal";
import ManagerLoadingMessage from "../../manager-loading-message";

type Holiday = { id: string; holiday_date: string; name: string | null; selected: "Y" | "N" };
const actionClass = "inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full gap-2 text-center md:w-auto";
export default function HolidaysPage() {
  const [year, setYear] = useState(() => new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Seoul" }).format(new Date()));
  const [rows, setRows] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmYear, setConfirmYear] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const valid = /^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= 9998;
  useEffect(() => {
    const controller = new AbortController();
    setRows([]);
    setLoading(valid);
    if (!valid) return () => controller.abort();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/manager/holidays?year=" + year, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) setRows(data.holidays);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "조회하지 못했습니다.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [year, revision, valid]);
  async function importYear() {
    if (!confirmYear || busy) return;
    const target = confirmYear;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/manager/holidays/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ year: target }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage(target + "년 공휴일 " + data.inserted + "건을 등록했습니다. 기존 " + data.skipped + "건은 건너뛰었습니다.");
      setRevision(v => v + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "가져오지 못했습니다."); }
    finally { setBusy(false); setConfirmYear(null); }
  }
  async function toggle(row: Holiday, checked: boolean) {
    setSaving(row.id); setError("");
    try {
      const selected = checked ? "Y" : "N";
      const response = await fetch("/api/manager/holidays", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, selected }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRows(current => current.map(item => item.id === row.id ? { ...item, selected } : item));
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); }
    finally { setSaving(null); }
  }
  return (
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">공휴일관리</h1>
          <p className="max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
            연도별 공휴일을 조회하고 휴일을 추가하거나 선택 상태를 변경합니다.
          </p>
        </div>
      </header>

      <section aria-label="공휴일 검색" className="rounded-xl border border-border/50 bg-muted/40 p-[1.5rem] md:p-[2rem]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            <div className="flex-1 space-y-2">
              <label htmlFor="holiday-year" className="text-[0.875rem] font-semibold text-muted-foreground ml-1">연도</label>
              <Input
                id="holiday-year"
                className="w-full"
                type="number"
                min={1900}
                max={9998}
                value={year}
                disabled={busy || !!saving}
                onChange={e => { setYear(e.target.value); setError(""); setMessage(""); }}
              />
            </div>
          </div>
          <Button className={actionClass} disabled={!valid || busy || !!saving} onClick={() => setConfirmYear(year)}>
            <span>{busy ? "공휴일 가져오는 중..." : "공휴일가져오기"}</span>
            <ArrowRightIcon size={18} />
          </Button>
          <Link href="/manager/employee/holidays/new" className={actionClass}>
            <span>휴일추가</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
        {!valid && <p role="alert" className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-center">연도는 1900~9998 사이로 입력해주세요.</p>}
        {error && <p role="alert" className="mt-6 whitespace-pre-wrap break-words rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive text-left">{error}</p>}
        {message && <p role="status" className="mt-6 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary text-center">{message}</p>}
      </section>

      <section aria-label="공휴일 목록" className="rounded-xl border border-border/50 bg-muted/40 p-[1.5rem] md:p-[2rem]">
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[0.75rem] font-normal text-muted-foreground">
          <span>{valid ? year + "년 공휴일" : "공휴일 목록"}</span>
          <span>검색 결과 {rows.length}</span>
        </div>
        {loading ? (
          <ManagerLoadingMessage className="mt-6" />
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>공휴일 날짜</TableHead>
                  <TableHead>휴일명</TableHead>
                  <TableHead className="text-right">선택</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={3} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 공휴일이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : rows.map(row => (
                  <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell data-label="공휴일 날짜" className="font-semibold whitespace-nowrap text-muted-foreground">{row.holiday_date}</TableCell>
                    <TableCell data-label="휴일명" className="text-muted-foreground">{row.name || "-"}</TableCell>
                    <TableCell data-label="선택" className="text-right">
                      <Checkbox aria-label={row.holiday_date + " 휴일 선택"} checked={row.selected === "Y"} disabled={busy || !!saving} onCheckedChange={checked => void toggle(row, checked === true)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
      <ConfirmModal
        isOpen={confirmYear !== null}
        onClose={() => { if (!busy) setConfirmYear(null); }}
        onConfirm={() => void importYear()}
        loading={busy}
        title={(confirmYear ?? year) + " 년도의 공공데이터포털의 한국천문연구원 특일정보를 가져올까요?"}
        description="이미 등록된 날짜는 건너뛰며 기존 선택값은 유지됩니다."
      />
    </section>
  );
}
