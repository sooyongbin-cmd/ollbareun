"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ConfirmModal from "@/components/modals/confirm-modal";

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
  return <section className="space-y-6">
    <header><h1 className="text-[1.75rem] leading-[1.2]">공휴일관리</h1></header>
    <section className="rounded-xl border border-border/50 bg-muted/40 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="space-y-2"><label htmlFor="holiday-year" className="text-sm font-semibold">연도</label>
          <Input id="holiday-year" type="number" min={1900} max={9998} value={year} disabled={busy || !!saving} onChange={e => { setYear(e.target.value); setError(""); setMessage(""); }} className="md:w-40" />
        </div>
        <Button className={actionClass} disabled={!valid || busy || !!saving} onClick={() => setConfirmYear(year)}>{busy ? "공휴일 가져오는 중..." : "공휴일가져오기"}<ArrowRightIcon size={18} /></Button>
        <Link href="/manager/employee/holidays/new" className={actionClass}>휴일추가<ArrowRightIcon size={18} /></Link>
      </div>
    </section>
    {!valid && <p className="text-destructive">연도는 1900~9998 사이로 입력해주세요.</p>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {message && <p role="status">{message}</p>}
    <div className="rounded-xl border overflow-hidden"><Table>
      <TableHeader><TableRow><TableHead>공휴일 날짜</TableHead><TableHead>휴일명</TableHead><TableHead className="text-center">선택</TableHead></TableRow></TableHeader>
      <TableBody>{loading ? <TableRow><TableCell colSpan={3} className="text-center">조회중입니다...</TableCell></TableRow> : rows.length ? rows.map(row => <TableRow key={row.id}>
        <TableCell>{row.holiday_date}</TableCell><TableCell>{row.name || "-"}</TableCell>
        <TableCell className="text-center"><Checkbox aria-label={row.holiday_date + " 휴일 선택"} checked={row.selected === "Y"} disabled={busy || !!saving} onCheckedChange={checked => void toggle(row, checked === true)} /></TableCell>
      </TableRow>) : <TableRow><TableCell colSpan={3} className="text-center">등록된 공휴일이 없습니다.</TableCell></TableRow>}</TableBody>
    </Table></div>
    <ConfirmModal isOpen={confirmYear !== null} onClose={() => { if (!busy) setConfirmYear(null); }} onConfirm={() => void importYear()} loading={busy} title={(confirmYear ?? year) + " 년도의 공공데이터포털의 한국천문연구원 특일정보를 가져올까요?"} description="이미 등록된 날짜는 건너뛰며 기존 선택값은 유지됩니다." />
  </section>;
}
