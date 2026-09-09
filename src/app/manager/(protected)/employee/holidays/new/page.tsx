"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export default function HolidayNewPage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/manager/holidays", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ holiday_date: date }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push("/manager/employee/holidays");
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); setBusy(false); }
  }
  return <section className="space-y-6">
    <header><h1 className="text-[1.75rem] leading-[1.2]">휴일추가</h1></header>
    <form onSubmit={save} className="space-y-6 rounded-xl border border-border/50 bg-muted/40 p-8">
      <div className="space-y-2"><label htmlFor="holiday-date" className="text-sm font-semibold">날짜</label>
        <Input id="holiday-date" type="date" min="1900-01-01" max="9998-12-31" required value={date} disabled={busy} onChange={e => setDate(e.target.value)} />
      </div>
      <p className="text-sm text-muted-foreground">선택 상태(Y)로 등록됩니다.</p>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      <div className="flex gap-3"><Button type="submit" disabled={busy}>{busy ? "저장중..." : "저장"}</Button><Link href="/manager/employee/holidays" className="inline-flex items-center text-sm">목록</Link></div>
    </form>
  </section>;
}
