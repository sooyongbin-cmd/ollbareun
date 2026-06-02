"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ManagerLoadingMessage from "../../manager-loading-message";
import { SortableHeader } from "@/components/sortable-header";
import { Bell, CheckCircle2, AlertCircle, X } from "lucide-react";
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
    const targets = filteredEmployees
      .map((employee) => {
        const completedCount = completedCountByEmployeeId.get(employee.id) ?? 0;
        const uncompletedCount = totalResourceCount - completedCount;
        return {
          employeeId: employee.id,
          employeeName: employee.name,
          uncompletedCount,
        };
      })
      .filter((target) => target.uncompletedCount >= 1);

    if (targets.length === 0) {
      setAlertMessage("알림을 보낼 미이수 직원이 없습니다.");
      return;
    }

    setSendingPush(true);
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notifications: targets }),
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
  }, [filteredEmployees, completedCountByEmployeeId, totalResourceCount]);

  const handleSort = (key: "name" | "completion") => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  return (
    <section className="space-y-[24px]">
      <header>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold leading-[1.1]">교육이수관리</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            직원별 교육이수 현황을 확인합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="교육이수 검색"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            <div className="space-y-2 flex-1">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="completion-name-search">
                직원 이름
              </label>
              <div className="flex gap-2">
                <input
                  className="field flex-1"
                  id="completion-name-search"
                  value={nameQuery}
                  onChange={(event) => setNameQuery(event.target.value)}
                  placeholder="검색할 직원 이름을 입력하세요."
                />
                <button
                  type="button"
                  className="button-primary flex items-center justify-center gap-1.5 px-5 min-w-[120px]"
                  onClick={handleSendPushNotifications}
                  disabled={sendingPush || filteredEmployees.length === 0}
                >
                  <Bell size={16} />
                  <span>{sendingPush ? "전송 중..." : "교육알림"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label="교육이수 목록"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>전체 직원 {employees.filter((e) => !e.is_retired).length}</span>
          <span>검색 결과 {filteredEmployees.length}</span>
        </div>

        {loading ? (
          <ManagerLoadingMessage className="mt-6" />
        ) : error ? (
          <p className="mt-6 text-[16px] text-status-warn">{error}</p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
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
                  <th className="text-left">구독상태</th>
                  <th className="text-left">알림결과</th>
                </tr>
              </thead>
              <tbody>
                {sortedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-ink-muted-48 italic">
                      조회 결과에 해당하는 직원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedEmployees.map((employee) => {
                    const completedCount = completedCountByEmployeeId.get(employee.id) ?? 0;
                    const isSubscribed = subscribedEmployeeIds.has(employee.id);
                    const deliveryStatus = pushDeliveryStatusByEmployeeId.get(employee.id);
                    return (
                      <tr key={employee.id} className="hover:bg-canvas-parchment transition-colors">
                        <td className="font-semibold">{employee.name}</td>
                        <td>
                          <Link
                            className="text-primary hover:underline font-semibold"
                            href={`/manager/safty/completions/detail?name=${encodeURIComponent(employee.name)}`}
                          >
                            {completedCount}/{totalResourceCount}
                          </Link>
                        </td>
                        <td>
                          <span
                            className={
                              isSubscribed
                                ? "inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary"
                                : "inline-flex items-center rounded-full bg-canvas-parchment px-3 py-1 text-[13px] font-semibold text-ink-muted-48"
                            }
                          >
                            {isSubscribed ? "구독중" : "미구독"}
                          </span>
                        </td>
                        <td>
                          {deliveryStatus ? (
                            <span
                              className={
                                deliveryStatus.status === "success"
                                  ? "inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[13px] font-semibold text-primary"
                                  : deliveryStatus.status === "failed"
                                    ? "inline-flex items-center rounded-full bg-status-warn/15 px-3 py-1 text-[13px] font-semibold text-status-warn"
                                    : "inline-flex items-center rounded-full bg-canvas-parchment px-3 py-1 text-[13px] font-semibold text-ink-muted-48"
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
                            <span className="text-[13px] font-semibold text-ink-muted-48">대기</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Push Notification Result Modal */}
      {showResultModal && pushResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-scrim px-5">
          <div className="w-full max-w-[500px] rounded-[18px] bg-canvas p-6 shadow-product border border-hairline animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-hairline pb-4 mb-4">
              <h2 className="text-[20px] font-semibold flex items-center gap-2">
                <span>교육 알림 전송 결과</span>
              </h2>
              <button 
                type="button" 
                onClick={() => setShowResultModal(false)}
                className="text-ink-muted-48 hover:text-ink transition-colors p-1"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 bg-canvas-parchment p-4 rounded-[12px] text-center border border-hairline/30">
                <div>
                  <p className="text-[12px] text-ink-muted-48">성공 건수</p>
                  <p className="text-[20px] font-bold text-primary">{pushResult.successCount}건</p>
                </div>
                <div>
                  <p className="text-[12px] text-ink-muted-48">미등록 인원</p>
                  <p className="text-[20px] font-bold text-ink">{pushResult.unregisteredCount}명</p>
                </div>
                <div>
                  <p className="text-[12px] text-ink-muted-48">전송 실패</p>
                  <p className="text-[20px] font-bold text-status-warn">{pushResult.failedCount}건</p>
                </div>
              </div>

              {/* Notified list */}
              {pushResult.notifiedEmployees.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[14px] font-semibold text-primary flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    알림 전송 완료 ({pushResult.notifiedEmployees.length}명)
                  </h3>
                  <div className="bg-canvas-parchment/50 border border-hairline/30 rounded-[12px] p-3 max-h-[120px] overflow-y-auto">
                    <p className="text-[14px] text-ink-muted-48 leading-relaxed">
                      {pushResult.notifiedEmployees.join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Unregistered list */}
              {pushResult.unregisteredEmployees.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[14px] font-semibold text-ink flex items-center gap-1.5">
                    <AlertCircle size={16} className="text-ink-muted-48" />
                    알림 미수신 대상 - 기기 미등록 ({pushResult.unregisteredEmployees.length}명)
                  </h3>
                  <p className="text-[12px] text-ink-muted-48">
                    ※ 모바일 웹 환경에서 알림 권한을 허용하지 않았거나 접속 이력이 없는 직원입니다.
                  </p>
                  <div className="bg-canvas-parchment/50 border border-hairline/30 rounded-[12px] p-3 max-h-[120px] overflow-y-auto">
                    <p className="text-[14px] text-ink-muted-48 leading-relaxed">
                      {pushResult.unregisteredEmployees.join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {/* Failed list */}
              {pushResult.failedEmployees.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-[14px] font-semibold text-status-warn flex items-center gap-1.5">
                    <AlertCircle size={16} />
                    알림 전송 실패 ({pushResult.failedEmployees.length}명)
                  </h3>
                  <div className="bg-canvas-parchment/50 border border-hairline/30 rounded-[12px] p-3 max-h-[150px] overflow-y-auto space-y-1.5">
                    {pushResult.failedEmployees.map((failed, idx) => (
                      <div key={idx} className="flex justify-between items-start text-[14px]">
                        <span className="font-semibold text-ink">{failed.employeeName}</span>
                        <span className="text-ink-muted-48 text-[12px] text-right">{failed.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-hairline pt-4 flex justify-end">
              <button
                className="button-primary px-6"
                type="button"
                onClick={() => setShowResultModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

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
