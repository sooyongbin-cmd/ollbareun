"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState, useCallback, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import ManagerLoadingMessage from "../../manager-loading-message";

type AdminUser = {
  id: string;
  user_id: string | null;
  email: string;
  role: "admin" | "super_admin";
  created_by: string | null;
  first_login_at: string | null;
  created_at: string;
  updated_at: string;
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export default function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Registration form state
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");
  const [registering, setRegistering] = useState(false);

  const loadAdmins = useCallback(async () => {
    try {
      const response = await fetch("/api/manager/admin-users");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "관리자 목록을 불러오지 못했습니다.");
      }

      setAdmins(payload.admins ?? []);

      // Determine current logged-in user
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const matchingAdmin = (payload.admins ?? []).find(
          (a: AdminUser) => a.user_id === user.id || a.email.toLowerCase() === user.email?.toLowerCase(),
        );
        if (matchingAdmin) {
          setCurrentAdmin(matchingAdmin);
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "관리자 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    if (!ignore) {
      Promise.resolve().then(() => {
        void loadAdmins();
      });
    }

    return () => {
      ignore = true;
    };
  }, [loadAdmins]);

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setRegistering(true);

    try {
      const response = await fetch("/api/manager/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, role: newRole }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "관리자 등록을 실패했습니다.");
      }

      setNewEmail("");
      setNewRole("admin");
      setSuccessMessage("새로운 관리자가 성공적으로 사전 등록되었습니다.");
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "관리자 등록을 처리하지 못했습니다.");
    } finally {
      setRegistering(false);
    }
  }

  async function handleChangeRole(id: string, role: "admin" | "super_admin") {
    setError("");
    setSuccessMessage("");
    setActionLoadingId(id);

    try {
      const response = await fetch(`/api/manager/admin-users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "직군 변경에 실패했습니다.");
      }

      setSuccessMessage("관리자 직군이 변경되었습니다.");
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "직군 변경을 처리하지 못했습니다.");
    } finally {
      setActionLoadingId("");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("정말로 이 관리자를 삭제하시겠습니까?")) return;

    setError("");
    setSuccessMessage("");
    setActionLoadingId(id);

    try {
      const response = await fetch(`/api/manager/admin-users/${id}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "관리자 삭제에 실패했습니다.");
      }

      setSuccessMessage("관리자가 삭제되었습니다.");
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "관리자 삭제를 처리하지 못했습니다.");
    } finally {
      setActionLoadingId("");
    }
  }

  const isSuperAdmin = currentAdmin?.role === "super_admin";

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">관리자관리</h1>
          <p className="max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
            사전 등록된 관리자 목록을 조회하고 새 관리자를 사전에 등록하거나 권한을 설정합니다.
          </p>
        </div>
      </header>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {successMessage ? <p className="font-semibold text-primary">{successMessage}</p> : null}

      {/* Admin registration form (Visible & interactive only for super_admin) */}
      <section className="rounded-xl border border-border/50 bg-muted/40 p-[2rem]">
        <h2 className="text-[1.25rem] font-semibold mb-4">새 관리자 사전 등록</h2>
        {isSuperAdmin ? (
          <form onSubmit={handleRegister} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label htmlFor="new-admin-email" className="text-[0.875rem] font-semibold text-muted-foreground">
                관리자 Google 이메일
              </label>
              <Input
                id="new-admin-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full w-full"
                disabled={registering}
              />
            </div>
            <div className="w-full sm:w-[11.25rem] space-y-2">
              <label htmlFor="new-admin-role" className="text-[0.875rem] font-semibold text-muted-foreground">
                직군 설정
              </label>
              <NativeSelect
                id="new-admin-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "admin" | "super_admin")}
                className="w-full w-full"
                disabled={registering}
              >
                <NativeSelectOption value="admin">일반 관리자 (admin)</NativeSelectOption>
                <NativeSelectOption value="super_admin">최고 관리자 (super_admin)</NativeSelectOption>
              </NativeSelect>
            </div>
            <Button
              type="submit"
              disabled={registering}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 h-11 px-6 justify-center disabled:opacity-60"
            >
              {registering ? "등록 중..." : "사전 등록 추가"}
            </Button>
          </form>
        ) : (
          <p className="text-[0.875rem] text-muted-foreground italic">
            * 새로운 관리자 사전 등록은 최고 관리자(super_admin) 권한을 가진 계정으로만 수행할 수 있습니다.
          </p>
        )}
      </section>

      {/* Admin list table */}
      <section className="rounded-xl border border-border/50 bg-muted/40 p-[2rem]">
        {loading ? (
          <ManagerLoadingMessage />
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">이메일</TableHead>
                  <TableHead className="text-left">직군</TableHead>
                  <TableHead className="text-left">활성화 여부</TableHead>
                  <TableHead className="text-left">최초 로그인 시각</TableHead>
                  <TableHead className="text-left">등록일</TableHead>
                  {isSuperAdmin ? <TableHead className="text-right">작업</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={isSuperAdmin ? 6 : 5} className="p-8 text-center text-muted-foreground italic">
                      등록된 관리자가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell data-label="이메일" className="font-semibold">{admin.email}</TableCell>
                      <TableCell data-label="직군">
                        {isSuperAdmin ? (
                          <NativeSelect
                            value={admin.role}
                            onChange={(e) =>
                              void handleChangeRole(admin.id, e.target.value as "admin" | "super_admin")
                            }
                            disabled={actionLoadingId === admin.id}
                            className="bg-transparent border-0 font-medium text-[0.875rem] text-primary focus:ring-0 p-0 cursor-pointer"
                          >
                            <NativeSelectOption value="admin">일반 관리자</NativeSelectOption>
                            <NativeSelectOption value="super_admin">최고 관리자</NativeSelectOption>
                          </NativeSelect>
                        ) : (
                          admin.role === "super_admin" ? "최고 관리자" : "일반 관리자"
                        )}
                      </TableCell>
                      <TableCell data-label="활성화 여부">
                        {admin.user_id ? (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-[0.75rem] font-medium text-primary ring-1 ring-inset ring-primary/20">
                            활성화됨
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-[0.75rem] font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                            대기 중
                          </span>
                        )}
                      </TableCell>
                      <TableCell data-label="최초 로그인 시각">{formatDateTime(admin.first_login_at)}</TableCell>
                      <TableCell data-label="등록일">{formatDateTime(admin.created_at)}</TableCell>
                      {isSuperAdmin ? (
                        <TableCell data-label="작업" className="text-right">
                          <Button
                            aria-label="삭제"
                            className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto text-destructive hover:text-destructive/80"
                            disabled={actionLoadingId === admin.id}
                            onClick={() => void handleDelete(admin.id)}
                            type="button"
                            variant="outline"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M10 11v6"></path>
                              <path d="M14 11v6"></path>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                              <path d="M3 6h18"></path>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </section>
  );
}
