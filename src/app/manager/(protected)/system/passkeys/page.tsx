"use client";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
          <h1 className="text-[28px] leading-[1.2]">패스키 요청 관리</h1>
          <p className="max-w-[640px] text-[14px] font-normal leading-relaxed text-muted-foreground">
            경비원이 요청한 패스키 등록을 승인하거나 거절합니다.
          </p>
        </div>
      </header>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <section className="rounded-xl border border-border/50 bg-muted/40 p-[32px]">
        {loading ? (
          <ManagerLoadingMessage />
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">경비원</TableHead>
                  <TableHead className="text-left">연락처</TableHead>
                  <TableHead className="text-left">요청일</TableHead>
                  <TableHead className="text-left">상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={5} className="p-8 text-center text-muted-foreground italic">
                      패스키 요청 목록이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell data-label="경비원" className="font-semibold">
                        <div>
                          {request.employeeName}
                          {request.employeeRetired ? <span className="ml-2 text-[12px] text-destructive">퇴직</span> : null}
                        </div>
                      </TableCell>
                      <TableCell data-label="연락처">{request.employeePhone}</TableCell>
                      <TableCell data-label="요청일">{formatDateTime(request.requestedAt)}</TableCell>
                      <TableCell data-label="상태">{getStatusLabel(request.status)}</TableCell>
                      <TableCell data-label="작업" className="text-right">
                        <div className="inline-flex gap-2">
                          {request.status === "pending" ? (
                            <>
                              <Button
                                className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 px-3 py-2 text-[13px]"
                                disabled={actionLoadingId === request.id}
                                onClick={() => void runAction(request.id, "approve")}
                                type="button"
                              >
                                승인
                              </Button>
                              <Button
                                className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 px-3 py-2 text-[13px]"
                                disabled={actionLoadingId === request.id}
                                onClick={() => void runAction(request.id, "reject")}
                                type="button"
                                variant="outline"
                              >
                                거절
                              </Button>
                            </>
                          ) : null}
                          {request.status === "registered" || request.status === "approved" ? (
                            <Button
                              className="inline-flex min-h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 px-3 py-2 text-[13px]"
                              disabled={actionLoadingId === request.id}
                              onClick={() => void runAction(request.id, "revoke")}
                              type="button"
                              variant="outline"
                            >
                              해제
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
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
