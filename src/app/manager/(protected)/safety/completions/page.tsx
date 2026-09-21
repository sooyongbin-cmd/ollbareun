"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ManagerLoadingMessage from "../../manager-loading-message";
import { SortableHeader } from "@/components/sortable-header";
import { Bell, CheckCircle2, AlertCircle } from "lucide-react";
import AlertModal from "@/components/modals/alert-modal";

type EducationCompletionRow = {
  employee_id: string;
  employee_name: string;
  resource_id: string;
  resource_title: string;
  resource_youtube_link: string;
  is_completed: boolean;
  completed_at: string | null;
};

type EducationResourceRow = {
  id: string;
  title: string;
};

type EmployeeRow = {
  id: string;
  name: string;
  is_retired: boolean;
};

type PushDeliveryStatus =
  | { status: "success" }
  | { status: "unregistered" }
  | { status: "failed"; reason: string };

export default function EducationCompletionsPage() {
  const [completions, setCompletions] = useState<EducationCompletionRow[]>([]);
  const [resources, setResources] = useState<EducationResourceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [subscribedEmployeeIds, setSubscribedEmployeeIds] = useState<Set<string>>(new Set());
  const [nameQuery, setNameQuery] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "completion">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingPush, setSendingPush] = useState(false);
  const [pushResult, setPushResult] = useState<{
    successCount: number;
    failedCount: number;
    unregisteredCount: number;
    notifiedEmployees: string[];
    notifiedEmployeeIds: string[];
    unregisteredEmployees: string[];
    unregisteredEmployeeIds: string[];
    failedEmployees: { employeeId?: string; employeeName: string; reason: string }[];
  } | null>(null);
  const [pushDeliveryStatusByEmployeeId, setPushDeliveryStatusByEmployeeId] = useState<
    Map<string, PushDeliveryStatus>
  >(new Map());
  const [showResultModal, setShowResultModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [completionsResponse, resourcesResponse, bootstrapResponse, subscriptionsResponse] = await Promise.all([
          fetch("/api/education/completions"),
          fetch("/api/education/resources"),
          fetch("/api/bootstrap"),
          fetch("/api/notifications/subscriptions"),
        ]);
        const completionsPayload = await completionsResponse.json();
        const resourcesPayload = await resourcesResponse.json();
        const bootstrapPayload = await bootstrapResponse.json();
        const subscriptionsPayload = await subscriptionsResponse.json();

        if (!completionsResponse.ok) {
          throw new Error(completionsPayload.error ?? "교육이수 목록을 불러오지 못했습니다.");
        }
        if (!resourcesResponse.ok) {
          throw new Error(resourcesPayload.error ?? "교육자료 목록을 불러오지 못했습니다.");
        }
        if (!bootstrapResponse.ok) {
          throw new Error(bootstrapPayload.error ?? "직원 목록을 불러오지 못했습니다.");
        }
        if (!subscriptionsResponse.ok) {
          throw new Error(subscriptionsPayload.error ?? "구독상태를 불러오지 못했습니다.");
        }

        if (!ignore) {
          setCompletions(completionsPayload.completions ?? []);
          setResources(resourcesPayload.resources ?? []);
          setEmployees(bootstrapPayload.employees ?? []);
          setSubscribedEmployeeIds(new Set(subscriptionsPayload.employeeIds ?? []));
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, []);

  const totalResourceCount = resources.length;

  const completedCountByEmployeeId = useMemo(() => {
    const counts = new Map<string, number>();
    completions.forEach((completion) => {
      if (completion.is_completed) {
        counts.set(completion.employee_id, (counts.get(completion.employee_id) ?? 0) + 1);
      }
    });
    return counts;
  }, [completions]);

  const filteredEmployees = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();
    const activeEmployees = employees.filter((employee) => !employee.is_retired);

    if (!query) {
      return activeEmployees;
    }

    return activeEmployees.filter((employee) => employee.name.toLowerCase().includes(query));
  }, [employees, nameQuery]);

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((left, right) => {
      if (sortKey === "name") {
        const comparison = left.name.localeCompare(right.name, "ko-KR");
        return sortDirection === "asc" ? comparison : -comparison;
      } else {
        const leftCount = completedCountByEmployeeId.get(left.id) ?? 0;
        const rightCount = completedCountByEmployeeId.get(right.id) ?? 0;
        if (leftCount === rightCount) {
          return left.name.localeCompare(right.name, "ko-KR");
        }
        return sortDirection === "asc" ? leftCount - rightCount : rightCount - leftCount;
      }
    });
  }, [filteredEmployees, sortKey, sortDirection, completedCountByEmployeeId]);

  const handleSendPushNotifications = useCallback(async () => {
    if (filteredEmployees.length === 0) {
      setAlertMessage("알림을 보낼 직원이 없습니다.");
      return;
    }

    setSendingPush(true);
    try {
      const response = await fetch("/api/education/reminders/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ employeeIds: filteredEmployees.map((employee) => employee.id) }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "알림 전송에 실패했습니다.");
      }

      setPushResult({
        successCount: data.successCount,
        failedCount: data.failedCount,
        unregisteredCount: data.unregisteredCount,
        notifiedEmployees: data.notifiedEmployees || [],
        notifiedEmployeeIds: data.notifiedEmployeeIds || [],
        unregisteredEmployees: data.unregisteredEmployees || [],
        unregisteredEmployeeIds: data.unregisteredEmployeeIds || [],
        failedEmployees: data.failedEmployees || [],
      });

      const nextDeliveryStatuses = new Map<string, PushDeliveryStatus>();
      (data.notifiedEmployeeIds || []).forEach((employeeId: string) => {
        nextDeliveryStatuses.set(employeeId, { status: "success" });
      });
      (data.unregisteredEmployeeIds || []).forEach((employeeId: string) => {
        nextDeliveryStatuses.set(employeeId, { status: "unregistered" });
      });
      (data.failedEmployees || []).forEach(
        (failed: { employeeId?: string; employeeName: string; reason: string }) => {
          if (failed.employeeId) {
            nextDeliveryStatuses.set(failed.employeeId, { status: "failed", reason: failed.reason });
          }
        },
      );
      setPushDeliveryStatusByEmployeeId(nextDeliveryStatuses);
      setShowResultModal(true);
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : "알림 전송 중 오류가 발생했습니다.");
    } finally {
      setSendingPush(false);
    }
  }, [filteredEmployees]);

  const handleSort = (key: "name" | "completion") => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return (
    <section className="space-y-[1.5rem]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">교육이수관리</h1>
          <p className="text-[0.875rem] font-normal leading-relaxed text-muted-foreground max-w-[40rem]">
            직원별 교육이수 현황을 확인합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="교육이수 검색"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            <div className="space-y-2 flex-1">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="completion-name-search">
                직원 이름
              </label>
              <div className="flex gap-2">
                <Input
                  className="w-full flex-1"
                  id="completion-name-search"
                  value={nameQuery}
                  onChange={(event) => setNameQuery(event.target.value)}
                  placeholder="검색할 직원 이름을 입력하세요."
                />
                <Button
                  type="button"
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 flex items-center justify-center gap-1.5 px-5 min-w-[7.5rem]"
                  onClick={handleSendPushNotifications}
                  disabled={sendingPush || filteredEmployees.length === 0}
                >
                  <Bell size={16} />
                  <span>{sendingPush ? "전송 중..." : "교육알림"}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="교육이수 목록"
        className="bg-muted/40 rounded-xl p-[2rem] border border-border/50"
      >
        <div className="flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <span>조회 결과 {filteredEmployees.length}</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage className="mt-6" />
        ) : error ? (
          <p className="mt-6 text-[1rem] text-destructive">{error}</p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <SortableHeader
                    sortKey="name"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    직원
                  </SortableHeader>
                  <SortableHeader
                    sortKey="completion"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    이수현황
                  </SortableHeader>
                  <TableHead className="text-left">구독상태</TableHead>
                  <TableHead className="text-left">알림결과</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={4} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 직원이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEmployees.map((employee) => {
                    const completedCount = completedCountByEmployeeId.get(employee.id) ?? 0;
                    const isSubscribed = subscribedEmployeeIds.has(employee.id);
                    const deliveryStatus = pushDeliveryStatusByEmployeeId.get(employee.id);
                    return (
                      <TableRow key={employee.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell data-label="직원" className="font-semibold">{employee.name}</TableCell>
                        <TableCell data-label="이수현황">
                          <Link
                            className="text-primary hover:underline font-semibold"
                            href={`/manager/safety/completions/detail?name=${encodeURIComponent(employee.name)}`}
                          >
                            {completedCount}/{totalResourceCount}
                          </Link>
                        </TableCell>
                        <TableCell data-label="구독상태">
                          <span
                            className={
                              isSubscribed
                                ? "inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[0.8125rem] font-semibold text-primary"
                                : "inline-flex items-center rounded-full bg-muted/40 px-3 py-1 text-[0.8125rem] font-semibold text-muted-foreground"
                            }
                          >
                            {isSubscribed ? "구독중" : "미구독"}
                          </span>
                        </TableCell>
                        <TableCell data-label="알림결과">
                          {deliveryStatus ? (
                            <span
                              className={
                                deliveryStatus.status === "success"
                                  ? "inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[0.8125rem] font-semibold text-primary"
                                  : deliveryStatus.status === "failed"
                                    ? "inline-flex items-center rounded-full bg-destructive/15 px-3 py-1 text-[0.8125rem] font-semibold text-destructive"
                                    : "inline-flex items-center rounded-full bg-muted/40 px-3 py-1 text-[0.8125rem] font-semibold text-muted-foreground"
                              }
                              title={deliveryStatus.status === "failed" ? deliveryStatus.reason : undefined}
                            >
                              {deliveryStatus.status === "success"
                                ? "성공"
                                : deliveryStatus.status === "failed"
                                  ? "실패"
                                  : "미구독"}
                            </span>
                          ) : (
                            <span className="text-[0.8125rem] font-semibold text-muted-foreground">대기</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* Push Notification Result Modal */}
      <Dialog open={showResultModal && Boolean(pushResult)} onOpenChange={setShowResultModal}>
        <DialogContent className="flex max-h-[85vh] max-w-[31.25rem] flex-col">
          <DialogHeader>
            <DialogTitle>교육 알림 전송 결과</DialogTitle>
            <DialogDescription>알림 전송 대상별 처리 결과입니다.</DialogDescription>
          </DialogHeader>

          {pushResult ? (
            <>
            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 bg-muted/40 p-4 rounded-[0.75rem] text-center border border-border/30">
                <div>
                  <p className="text-[0.75rem] text-muted-foreground">성공 건수</p>
                  <p className="text-[1.25rem] font-bold text-primary">{pushResult.successCount}건</p>
                </div>
                <div>
                  <p className="text-[0.75rem] text-muted-foreground">미등록 인원</p>
                  <p className="text-[1.25rem] font-bold text-foreground">{pushResult.unregisteredCount}명</p>
                </div>
                <div>
                  <p className="text-[0.75rem] text-muted-foreground">전송 실패</p>
                  <p className="text-[1.25rem] font-bold text-destructive">{pushResult.failedCount}건</p>
                </div>
              </div>

              {/* Notified list */}
              {pushResult.notifiedEmployees.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[0.875rem] font-semibold text-primary flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    알림 전송 완료 ({pushResult.notifiedEmployees.length}명)
                  </h3>
                  <div className="max-h-[7.5rem] overflow-y-auto rounded-[0.75rem] border border-border/30 bg-muted/50 p-3">
                    <p className="text-[0.875rem] text-muted-foreground leading-relaxed">
                      {pushResult.notifiedEmployees.join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Unregistered list */}
              {pushResult.unregisteredEmployees.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[0.875rem] font-semibold text-foreground flex items-center gap-1.5">
                    <AlertCircle size={16} className="text-muted-foreground" />
                    알림 미수신 대상 - 기기 미등록 ({pushResult.unregisteredEmployees.length}명)
                  </h3>
                  <p className="text-[0.75rem] text-muted-foreground">
                    ※ 모바일 웹 환경에서 알림 권한을 허용하지 않았거나 접속 이력이 없는 직원입니다.
                  </p>
                  <div className="max-h-[7.5rem] overflow-y-auto rounded-[0.75rem] border border-border/30 bg-muted/50 p-3">
                    <p className="text-[0.875rem] text-muted-foreground leading-relaxed">
                      {pushResult.unregisteredEmployees.join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Failed list */}
              {pushResult.failedEmployees.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[0.875rem] font-semibold text-destructive flex items-center gap-1.5">
                    <AlertCircle size={16} />
                    알림 전송 실패 ({pushResult.failedEmployees.length}명)
                  </h3>
                  <div className="max-h-[9.375rem] space-y-1.5 overflow-y-auto rounded-[0.75rem] border border-border/30 bg-muted/50 p-3">
                    {pushResult.failedEmployees.map((failed, idx) => (
                      <div key={idx} className="flex justify-between items-start text-[0.875rem]">
                        <span className="font-semibold text-foreground">{failed.employeeName}</span>
                        <span className="text-muted-foreground text-[0.75rem] text-right">{failed.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-border pt-4 flex justify-end">
              <Button
                className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 px-6"
                type="button"
                onClick={() => setShowResultModal(false)}
              >
                닫기
              </Button>
            </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Alert Modal for errors and warnings */}
      <AlertModal
        isOpen={Boolean(alertMessage)}
        onClose={() => setAlertMessage("")}
        title="알림"
        description={alertMessage}
      />
    </section>
  );
}
