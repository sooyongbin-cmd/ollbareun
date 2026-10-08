"use client";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaveIcon } from "@/components/icons/save-icon";
import ProcessingModal from "@/components/modals/processing-modal";
export default function HolidayNewPage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [holidayType, setHolidayType] = useState("custom");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/manager/holidays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ holiday_date: date, name: name.trim(), holiday_type: holidayType }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push("/manager/employee/holidays");
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); setBusy(false); }
  }
  return (
    <section className="space-y-[1.5rem]">
      <header>
        <h1 className="text-[1.75rem] leading-[1.2]">휴일추가</h1>
      </header>

      <section className="manager-section rounded-xl border border-border/50 bg-muted/40">
        <form onSubmit={save} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="holiday-name" className="text-[0.875rem] font-semibold text-muted-foreground ml-1">휴일명</label>
              <Input className="w-full" id="holiday-name" type="text" maxLength={100} required value={name} disabled={busy} onChange={e => setName(e.target.value)} aria-describedby="holiday-name-help" placeholder="휴일명을 입력하세요." />
              <p id="holiday-name-help" className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground">테이블에 표시할 휴일명을 입력하세요.</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="holiday-date" className="text-[0.875rem] font-semibold text-muted-foreground ml-1">날짜</label>
              <Input className="w-full" id="holiday-date" type="date" min="1900-01-01" max="9998-12-31" required value={date} disabled={busy} onChange={e => setDate(e.target.value)} aria-describedby="holiday-date-help" />
              <p id="holiday-date-help" className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground">추가한 날짜는 휴일로 선택됩니다.</p>
            </div>
          </div>
          <label className="block space-y-2 text-sm font-medium">휴일 구분
            <NativeSelect aria-label="휴일 구분" value={holidayType} onChange={event => setHolidayType(event.target.value)} disabled={busy}>
              <NativeSelectOption value="custom">회사 지정 휴일 (휴무)</NativeSelectOption>
              <NativeSelectOption value="public">국공휴일 (직원별 공휴일 설정 적용)</NativeSelectOption>
            </NativeSelect>
          </label>
          <div className="flex flex-col gap-3 md:flex-row">
            <Button
              aria-label={busy ? "저장중" : "저장"}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
              type="submit"
              disabled={busy}
            >
              <SaveIcon size={20} />
            </Button>
            <Button aria-label="목록" type="button" variant="outline" onClick={() => router.push("/manager/employee/holidays")} className="min-h-10 w-full md:ml-auto md:w-auto">
              목록
            </Button>
          </div>
        </form>
        <ProcessingModal isOpen={busy} message="저장처리중입니다..." />
        {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mt-6 text-center">{error}</p>}
      </section>
    </section>
  );
}
