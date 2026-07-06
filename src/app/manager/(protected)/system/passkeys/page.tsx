"use client";

import { useEffect, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";

type PasskeyRequestRow = {
  id: string;
  employeeName: string;
  employeePhone: string;
  employeeRetired: boolean;
  status: "pending" | "approved" | "rejected" | "registered" | "revoked";
  requestedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  registeredAt: string | null;
  revokedAt: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function getStatusLabel(status: PasskeyRequestRow["status"]) {
  if (status === "pending") return "승인 대기";
  if (status === "approved") return "승인됨";
  if (status === "registered") return "등록 완료";
  if (status === "rejected") return "거절됨";
  return "해제됨";
}

export default function ManagerPasskeyRequestsPage() {
  const [requests, setRequests] = useState<PasskeyRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");

  async function loadRequests() {
    try {
      const response = await fetch("/api/manager/guard-passkey-requests");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "패스키 요청 목록을 불러오지 못했습니다.");
      }

      setRequests(payload.requests ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "패스키 요청 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialRequests() {
      try {
        const response = await fetch("/api/manager/guard-passkey-requests");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "패스키 요청 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setRequests(payload.requests ?? []);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "패스키 요청 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadInitialRequests();

    return () => {
      ignore = true;
    };
  }, []);

  async function runAction(requestId: string, action: "approve" | "reject" | "revoke") {
    try {
      setActionLoadingId(requestId);
      setError("");
      const response = await fetch(`/api/manager/guard-passkey-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewedBy: "manager" }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "패스키 요청 작업을 처리하지 못했습니다.");
      }

      await loadRequests();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "패스키 요청 작업을 처리하지 못했습니다.");
    } finally {
      setActionLoadingId("");
    }
  }

  return (
    <section className="space-y-[24px]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold leading-[1.1]">패스키 요청 관리</h1>
          <p className="max-w-[640px] text-[21px] font-normal text-ink-muted-48">
            경비원이 요청한 패스키 등록을 승인하거나 거절합니다.
          </p>
        </div>
      </header>

      {error ? <p className="status-warn">{error}</p> : null}

      <section className="rounded-[18px] border border-hairline/50 bg-canvas-parchment p-[32px]">
        {loading ? (
          <ManagerLoadingMessage />
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">경비원</th>
                  <th className="text-left">연락처</th>
                  <th className="text-left">요청일</th>
                  <th className="text-left">상태</th>
                  <th className="text-right">작업</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-ink-muted-48 italic">
                      패스키 요청 목록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id}>
                      <td className="font-semibold">
                        {request.employeeName}
                        {request.employeeRetired ? <span className="ml-2 text-[12px] text-status-warn">퇴직</span> : null}
                      </td>
                      <td>{request.employeePhone}</td>
                      <td>{formatDateTime(request.requestedAt)}</td>
                      <td>{getStatusLabel(request.status)}</td>
                      <td className="text-right">
                        <div className="inline-flex gap-2">
                          {request.status === "pending" ? (
                            <>
                              <button
                                className="button-primary px-3 py-2 text-[13px]"
                                disabled={actionLoadingId === request.id}
                                onClick={() => void runAction(request.id, "approve")}
                                type="button"
                              >
                                승인
                              </button>
                              <button
                                className="button-secondary px-3 py-2 text-[13px]"
                                disabled={actionLoadingId === request.id}
                                onClick={() => void runAction(request.id, "reject")}
                                type="button"
                              >
                                거절
                              </button>
                            </>
                          ) : null}
                          {request.status === "registered" || request.status === "approved" ? (
                            <button
                              className="button-secondary px-3 py-2 text-[13px]"
                              disabled={actionLoadingId === request.id}
                              onClick={() => void runAction(request.id, "revoke")}
                              type="button"
                            >
                              해제
                            </button>
                          ) : null}
                        </div>
                      </td>
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
