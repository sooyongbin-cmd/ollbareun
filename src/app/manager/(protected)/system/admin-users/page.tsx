"use client";

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
        throw new Error(payload.error ?? "역할 변경에 실패했습니다.");
      }

      setSuccessMessage("관리자 역할이 변경되었습니다.");
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "역할 변경을 처리하지 못했습니다.");
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
    <section className="space-y-[24px]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold leading-[1.1]">관리자 관리</h1>
          <p className="max-w-[640px] text-[21px] font-normal text-ink-muted-48">
            사전 등록된 관리자 목록을 조회하고 새 관리자를 사전에 등록하거나 권한을 설정합니다.
          </p>
        </div>
      </header>

      {error ? <p className="status-warn">{error}</p> : null}
      {successMessage ? <p className="status-success text-green-600 font-semibold">{successMessage}</p> : null}

      {/* Admin registration form (Visible & interactive only for super_admin) */}
      <section className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[32px]">
        <h2 className="text-[20px] font-semibold mb-4">새 관리자 사전 등록</h2>
        {isSuperAdmin ? (
          <form onSubmit={handleRegister} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <label htmlFor="new-admin-email" className="text-[14px] font-semibold text-ink-muted-48">
                관리자 Google 이메일
              </label>
              <input
                id="new-admin-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="admin@example.com"
                className="field w-full"
                disabled={registering}
              />
            </div>
            <div className="w-full sm:w-[180px] space-y-2">
              <label htmlFor="new-admin-role" className="text-[14px] font-semibold text-ink-muted-48">
                역할 설정
              </label>
              <select
                id="new-admin-role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "admin" | "super_admin")}
                className="field w-full"
                disabled={registering}
              >
                <option value="admin">일반 관리자 (admin)</option>
                <option value="super_admin">최고 관리자 (super_admin)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={registering}
              className="button-primary h-11 px-6 justify-center disabled:opacity-60"
            >
              {registering ? "등록 중..." : "사전 등록 추가"}
            </button>
          </form>
        ) : (
          <p className="text-[14px] text-ink-muted-48 italic">
            * 새로운 관리자 사전 등록은 최고 관리자(super_admin) 권한을 가진 계정으로만 수행할 수 있습니다.
          </p>
        )}
      </section>

      {/* Admin list table */}
      <section className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[32px]">
        {loading ? (
          <ManagerLoadingMessage />
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">이메일</th>
                  <th className="text-left">역할</th>
                  <th className="text-left">활성화 여부</th>
                  <th className="text-left">최초 로그인 시각</th>
                  <th className="text-left">등록일</th>
                  {isSuperAdmin ? <th className="text-right">작업</th> : null}
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} className="p-8 text-center text-ink-muted-48 italic">
                      등록된 관리자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  admins.map((admin) => (
                    <tr key={admin.id}>
                      <td className="font-semibold">{admin.email}</td>
                      <td>
                        {isSuperAdmin ? (
                          <select
                            value={admin.role}
                            onChange={(e) =>
                              void handleChangeRole(admin.id, e.target.value as "admin" | "super_admin")
                            }
                            disabled={actionLoadingId === admin.id}
                            className="bg-transparent border-0 font-medium text-[14px] text-primary focus:ring-0 p-0 cursor-pointer"
                          >
                            <option value="admin">일반 관리자</option>
                            <option value="super_admin">최고 관리자</option>
                          </select>
                        ) : (
                          admin.role === "super_admin" ? "최고 관리자" : "일반 관리자"
                        )}
                      </td>
                      <td>
                        {admin.user_id ? (
                          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-[12px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            활성화됨
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-[12px] font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                            대기 중
                          </span>
                        )}
                      </td>
                      <td>{formatDateTime(admin.first_login_at)}</td>
                      <td>{formatDateTime(admin.created_at)}</td>
                      {isSuperAdmin ? (
                        <td className="text-right">
                          <button
                            aria-label="삭제"
                            className="button-secondary w-full md:w-auto text-red-600 hover:text-red-700"
                            disabled={actionLoadingId === admin.id}
                            onClick={() => void handleDelete(admin.id)}
                            type="button"
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
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
