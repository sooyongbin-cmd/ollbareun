"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildAdminSubscriptionRows, type AdminSubscriptionRow } from "@/lib/admin-subscription-rows";
import ManagerLoadingMessage from "../../manager-loading-message";
import ConfirmModal from "@/components/modals/confirm-modal";
import AlertModal from "@/components/modals/alert-modal";

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-";
}

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminSubscriptionRow[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminSubscriptionRow | null>(null);
  const [error, setError] = useState("");

  const loadAdmins = useCallback(async () => {
    const response = await fetch("/api/manager/admin-users", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "관리자 목록을 불러오지 못했습니다.");
    setRows(buildAdminSubscriptionRows(payload.admins ?? [], payload.subscriptions ?? []));
    setIsSuperAdmin(payload.currentRole === "super_admin");
  }, []);
  useEffect(() => {
    void Promise.resolve().then(loadAdmins).catch((err) => setError(err instanceof Error ? err.message : "조회에 실패했습니다."))
      .finally(() => setLoading(false));
  }, [loadAdmins]);

  async function runAction(action: () => Promise<Response>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const response = await action();
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "처리에 실패했습니다.");
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다.");
    } finally {
      setDeleteTarget(null);
      busyRef.current = false;
      setBusy(false);
    }
  }

  return <section className="space-y-6">
    <header className="space-y-3">
      <h1 className="text-[1.75rem] leading-[1.2]">관리자관리</h1>
    </header>
    <section className="manager-section rounded-xl border border-border/50 bg-muted/40">
      {isSuperAdmin && !busy ? <Button asChild><Link href="/manager/system/admin-users/new">관리자등록</Link></Button> : <Button disabled>관리자등록</Button>}
    </section>
    <section aria-label="관리자 목록" className="manager-section rounded-xl border border-border/50 bg-muted/40">
      <div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
        <span>조회 결과 {rows.length}</span>
      </div>
      {loading ? <ManagerLoadingMessage className="mt-6" /> : (
        <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
          <Table className="w-full">
            <TableHeader><TableRow><TableHead>이메일</TableHead><TableHead>직군</TableHead><TableHead>최근접속일</TableHead><TableHead className="text-right">구독삭제</TableHead></TableRow></TableHeader>
            <TableBody>{rows.length === 0 ? <TableRow><TableCell data-responsive-empty colSpan={4} className="p-8 text-center text-muted-foreground italic">등록된 관리자가 없습니다.</TableCell></TableRow> : rows.map((row, index) => (
              <TableRow key={row.subscription?.id ?? row.admin.id} className="hover:bg-muted/40 transition-colors">
                <TableCell data-label="이메일" className="font-semibold">{index === 0 || rows[index - 1].admin.email !== row.admin.email ? <Link className="text-primary hover:underline" href={`/manager/system/admin-users/save/${row.admin.id}`}>{row.admin.email}</Link> : ""}</TableCell>
                <TableCell data-label="직군" className="text-muted-foreground">{row.admin.role === "super_admin" ? "최고 관리자" : "일반 관리자"}</TableCell>
                <TableCell data-label="최근접속일" className="whitespace-nowrap text-muted-foreground">{formatDateTime(row.subscription?.updated_at)}</TableCell>
                <TableCell data-label="구독삭제" className="text-right">{row.subscription ? <Button type="button" variant="outline" disabled={!isSuperAdmin || busy}
                  aria-label={`${row.admin.email} ${formatDateTime(row.subscription.updated_at)} 구독삭제`} onClick={() => setDeleteTarget(row)}>삭제</Button> : "-"}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      )}
    </section>
    <ConfirmModal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="구독삭제"
      description={`이메일(${deleteTarget?.admin.email ?? ""}) 최근접속일(${formatDateTime(deleteTarget?.subscription?.updated_at)}) 에 해당하는 구독을 삭제하시겠습니까? 삭제하시면 푸시알림을 받을 수 없습니다.`}
      loading={busy} loadingLabel="삭제처리중입니다..." onConfirm={() => {
        const target = deleteTarget;
        if (target?.subscription) {
          const url = `/api/manager/admin-users/${target.admin.id}/subscriptions/${target.subscription.id}`;
          void runAction(() => fetch(url, { method: "DELETE" }));
        }
      }} />
    <AlertModal isOpen={Boolean(error)} onClose={() => setError("")} title="오류" description={error} />
  </section>;
}
