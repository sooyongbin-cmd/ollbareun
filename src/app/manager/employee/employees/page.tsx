"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";
import { SortableHeader } from "@/components/sortable-header";

type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
  is_retired: boolean;
};

type Bootstrap = {
  employees: EmployeeRow[];
  worksites: {
    id: string;
    name: string;
  }[];
  assignments: {
    employee_id: string;
    worksite_id: string;
  }[];
  summary: {
    totalEmployees: number;
    currentlyClockedIn: number;
  };
};

const emptyBootstrap: Bootstrap = {
  employees: [],
  worksites: [],
  assignments: [],
  summary: {
    totalEmployees: 0,
    currentlyClockedIn: 0,
  },
};

export default function EmployeeRosterPage() {
  const [data, setData] = useState<Bootstrap>(emptyBootstrap);
  const [nameQuery, setNameQuery] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [showRetired, setShowRetired] = useState(false);
  const [sortKey, setSortKey] = useState<"name" | "phone" | "worksite" | "status">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadBootstrap() {
      try {
        const response = await fetch("/api/bootstrap");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "직원 목록을 불러오지 못했습니다.");
        }

        if (!ignore) {
          setData({
            employees: payload.employees ?? [],
            worksites: payload.worksites ?? [],
            assignments: payload.assignments ?? [],
            summary: payload.summary ?? emptyBootstrap.summary,
          });
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "직원 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadBootstrap();

    return () => {
      ignore = true;
    };
  }, []);



  const availableEmployees = useMemo(() => {
    return data.employees.filter((e) => e.is_retired === showRetired);
  }, [data.employees, showRetired]);

  const uniqueNames = useMemo(() => {
    const names = availableEmployees.map((e) => e.name);
    return Array.from(new Set(names)).sort();
  }, [availableEmployees]);

  const uniquePhones = useMemo(() => {
    const phones = availableEmployees.map((e) => e.phone);
    return Array.from(new Set(phones)).sort();
  }, [availableEmployees]);

  const filteredEmployees = useMemo(() => {
    const normalizedNameQuery = nameQuery.trim().toLowerCase();
    const normalizedPhoneQuery = phoneQuery.trim().toLowerCase();
    const digitPhoneQuery = normalizedPhoneQuery.replace(/\D/g, "");

    return availableEmployees.filter((employee) => {
      if (normalizedNameQuery && !employee.name.toLowerCase().includes(normalizedNameQuery)) {
        return false;
      }

      if (normalizedPhoneQuery) {
        const matchesPhone = employee.phone.toLowerCase().includes(normalizedPhoneQuery);
        const matchesNormalizedPhone =
          digitPhoneQuery.length > 0 && employee.phone_normalized.includes(digitPhoneQuery);
        if (!matchesPhone && !matchesNormalizedPhone) {
          return false;
        }
      }

      return true;
    });
  }, [availableEmployees, nameQuery, phoneQuery]);

  const worksiteById = useMemo(() => {
    return new Map(data.worksites.map((worksite) => [worksite.id, worksite.name]));
  }, [data.worksites]);

  const worksiteByEmployeeId = useMemo(() => {
    return new Map(data.assignments.map((assignment) => [assignment.employee_id, assignment.worksite_id]));
  }, [data.assignments]);

  const sortedEmployees = useMemo(() => {
    return [...filteredEmployees].sort((left, right) => {
      if (sortKey === "name") {
        return sortDirection === "asc"
          ? left.name.localeCompare(right.name, "ko-KR")
          : right.name.localeCompare(left.name, "ko-KR");
      } else if (sortKey === "phone") {
        return sortDirection === "asc"
          ? left.phone.localeCompare(right.phone, "ko-KR")
          : right.phone.localeCompare(left.phone, "ko-KR");
      } else if (sortKey === "worksite") {
        const leftWorksite = worksiteById.get(worksiteByEmployeeId.get(left.id) ?? "") ?? "";
        const rightWorksite = worksiteById.get(worksiteByEmployeeId.get(right.id) ?? "") ?? "";
        if (leftWorksite === rightWorksite) {
          return left.name.localeCompare(right.name, "ko-KR");
        }
        return sortDirection === "asc"
          ? leftWorksite.localeCompare(rightWorksite, "ko-KR")
          : rightWorksite.localeCompare(leftWorksite, "ko-KR");
      } else {
        const leftVal = left.is_retired ? 1 : 0;
        const rightVal = right.is_retired ? 1 : 0;
        if (leftVal === rightVal) {
          return left.name.localeCompare(right.name, "ko-KR");
        }
        return sortDirection === "asc" ? leftVal - rightVal : rightVal - leftVal;
      }
    });
  }, [filteredEmployees, sortKey, sortDirection, worksiteById, worksiteByEmployeeId]);

  const handleSort = (key: "name" | "phone" | "worksite" | "status") => {
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
          <h1 className="text-[40px] font-semibold leading-[1.1]">직원명부관리</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            등록된 직원의 이름과 연락처를 검색해 확인합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="직원 검색"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            <div className="space-y-2 flex-1">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="employee-roster-name-search">
                이름
              </label>
              <select
                className="field appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] bg-no-repeat pr-10"
                id="employee-roster-name-search"
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
              >
                <option value="">전체 이름</option>
                {uniqueNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 flex-1">
              <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="employee-roster-phone-search">
                연락처
              </label>
              <select
                className="field appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] bg-no-repeat pr-10"
                id="employee-roster-phone-search"
                value={phoneQuery}
                onChange={(event) => setPhoneQuery(event.target.value)}
              >
                <option value="">전체 연락처</option>
                {uniquePhones.map((phone) => (
                  <option key={phone} value={phone}>
                    {phone}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex h-[48px] items-center gap-2 text-[15px] font-semibold text-ink-muted-80 md:mb-0">
            <input
              checked={showRetired}
              className="h-4 w-4 accent-primary"
              onChange={(event) => {
                setShowRetired(event.target.checked);
                setNameQuery("");
                setPhoneQuery("");
              }}
              type="checkbox"
            />
            퇴직
          </label>

          <Link
            className="button-primary w-full text-center md:w-auto gap-2"
            href="/manager/employee/employees/new"
          >
            <span>직원 등록</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      <section
        aria-label="직원 목록"
        className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>전체 직원 {data.employees.length}</span>
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
                    이름
                  </SortableHeader>
                  <SortableHeader
                    sortKey="phone"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    연락처
                  </SortableHeader>
                  <SortableHeader
                    sortKey="worksite"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    근무지
                  </SortableHeader>
                  <SortableHeader
                    sortKey="status"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-right"
                  >
                    상태
                  </SortableHeader>
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
                  sortedEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-canvas-parchment transition-colors">
                      <td className="font-semibold">
                        <Link
                          className="text-primary hover:underline"
                          href={`/manager/employee/employees/save/${employee.id}`}
                        >
                          {employee.name}
                        </Link>
                      </td>
                      <td className="text-ink-muted-48">{employee.phone}</td>
                      <td className="text-ink-muted-48">
                        {worksiteById.get(worksiteByEmployeeId.get(employee.id) ?? "") ?? "-"}
                      </td>
                      <td className="text-right">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-[12px] font-semibold ${
                            employee.is_retired
                              ? "bg-ink/10 text-ink-muted-48"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {employee.is_retired ? "퇴직" : "현직"}
                        </span>
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
