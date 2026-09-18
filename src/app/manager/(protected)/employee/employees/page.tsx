"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ManagerLoadingMessage from "../../manager-loading-message";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";
import { SortableHeader } from "@/components/sortable-header";

type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  work_style: "0" | "1" | "2";
  phone_normalized: string;
  is_retired: boolean;
  role: "경비원" | "미화원" | "파견";
};

type AttendanceRow = {
  employee_id: string;
  intime_status: "0" | "1" | "2" | "3";
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
    start_date: string;
    end_date: string;
  }[];
  attendance: AttendanceRow[];
  summary: {
    totalEmployees: number;
    currentlyClockedIn: number;
  };
};

const emptyBootstrap: Bootstrap = {
  employees: [],
  worksites: [],
  assignments: [],
  attendance: [],
  summary: {
    totalEmployees: 0,
    currentlyClockedIn: 0,
  },
};

export default function EmployeeRosterPage() {
  const [data, setData] = useState<Bootstrap>(emptyBootstrap);
  const [nameQuery, setNameQuery] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [showRetired, setShowRetired] = useState(false);
  const [sortKey, setSortKey] = useState<"name" | "phone" | "role" | "worksite">("name");
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
            attendance: payload.attendance ?? [],
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

  const employeeNameOptions = useMemo(() => {
    return Array.from(new Set(availableEmployees.map((employee) => employee.name))).sort((left, right) =>
      left.localeCompare(right, "ko-KR"),
    );
  }, [availableEmployees]);

  const filteredEmployees = useMemo(() => {
    const normalizedNameQuery = nameQuery.trim().toLowerCase();

    return availableEmployees.filter((employee) => {
      if (normalizedNameQuery && !employee.name.toLowerCase().includes(normalizedNameQuery)) {
        return false;
      }

      if (roleQuery && employee.role !== roleQuery) {
        return false;
      }

      return true;
    });
  }, [availableEmployees, nameQuery, roleQuery]);

  const worksiteById = useMemo(() => {
    return new Map(data.worksites.map((worksite) => [worksite.id, worksite.name]));
  }, [data.worksites]);

  const assignmentByEmployeeId = useMemo(() => {
    return new Map(data.assignments.map((assignment) => [assignment.employee_id, assignment]));
  }, [data.assignments]);

  const attendanceStatusByEmployeeId = useMemo(() => {
    const statusLabels: Record<AttendanceRow["intime_status"], string> = {
      "0": "결근",
      "1": "지각",
      "2": "정상출근",
      "3": "정상근무",
    };

    return new Map(
      data.attendance.map((attendance) => [attendance.employee_id, statusLabels[attendance.intime_status]]),
    );
  }, [data.attendance]);

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
      } else if (sortKey === "role") {
        return sortDirection === "asc"
          ? left.role.localeCompare(right.role, "ko-KR")
          : right.role.localeCompare(left.role, "ko-KR");
      } else if (sortKey === "worksite") {
        const leftWorksite = worksiteById.get(assignmentByEmployeeId.get(left.id)?.worksite_id ?? "") ?? "";
        const rightWorksite = worksiteById.get(assignmentByEmployeeId.get(right.id)?.worksite_id ?? "") ?? "";
        if (leftWorksite === rightWorksite) {
          return left.name.localeCompare(right.name, "ko-KR");
        }
        return sortDirection === "asc"
          ? leftWorksite.localeCompare(rightWorksite, "ko-KR")
          : rightWorksite.localeCompare(leftWorksite, "ko-KR");
      }
      return left.name.localeCompare(right.name, "ko-KR");
    });
  }, [assignmentByEmployeeId, filteredEmployees, sortKey, sortDirection, worksiteById]);

  const handleSort = (key: "name" | "phone" | "role" | "worksite") => {
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
          <h1 className="text-[1.75rem] leading-[1.2]">직원관리</h1>
          <p className="max-w-[40rem] text-[0.875rem] font-normal leading-relaxed text-muted-foreground">
            등록된 직원의 이름과 연락처를 검색해 확인합니다.
          </p>
        </div>
      </header>

      <section
        aria-label="직원 검색"
        className="rounded-xl border border-border/50 bg-muted/40 p-[1.5rem] md:p-[2rem]"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-4 md:flex-row">
            <div className="flex-1 space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="employee-roster-name-search">
                이름
              </label>
              <Input
                className="w-full"
                id="employee-roster-name-search"
                list="employee-roster-name-options"
                placeholder="이름을 입력하세요."
                value={nameQuery}
                onChange={(event) => setNameQuery(event.target.value)}
              />
              <datalist id="employee-roster-name-options">
                {employeeNameOptions.map((name) => <option key={name} value={name} />)}
              </datalist>
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[0.875rem] font-semibold text-muted-foreground ml-1" htmlFor="employee-roster-role-search">
                직군
              </label>
              <NativeSelect
                className="w-full appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.5rem_center] bg-[size:1.5em_1.5em] bg-no-repeat pr-10"
                id="employee-roster-role-search"
                value={roleQuery}
                onChange={(event) => setRoleQuery(event.target.value)}
              >
                <NativeSelectOption value="">전체 직군</NativeSelectOption>
                <NativeSelectOption value="경비원">경비원</NativeSelectOption>
                <NativeSelectOption value="미화원">미화원</NativeSelectOption>
                <NativeSelectOption value="파견">파견</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>

          <label className="flex h-[3rem] items-center gap-2 text-[0.875rem] font-semibold text-foreground/80 md:mb-0">
            <Checkbox
              checked={showRetired}
              onCheckedChange={(checked) => {
                setShowRetired(checked === true);
                setNameQuery("");
                setRoleQuery("");
              }}
            />
            퇴직
          </label>

          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full gap-2 text-center md:w-auto"
            href="/manager/employee/employees/new"
          >
            <span>직원 등록</span>
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      <section
        aria-label="직원 목록"
        className="rounded-xl border border-border/50 bg-muted/40 p-[1.5rem] md:p-[2rem]"
      >
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[0.75rem] font-normal text-muted-foreground">
          <span>전체 직원 {data.employees.length}</span>
          <span>검색 결과 {filteredEmployees.length}</span>
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
                    sortKey="role"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    직군
                  </SortableHeader>
                  <TableHead>근무형태</TableHead>
                  <SortableHeader
                    sortKey="worksite"
                    currentSortKey={sortKey}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    className="text-left"
                  >
                    근무지
                  </SortableHeader>
                  <TableHead>배정기간</TableHead>
                  <TableHead>출근</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={7} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 직원이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEmployees.map((employee) => (
                    <TableRow key={employee.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="이름" className="font-semibold">
                        <Link
                          className="text-primary hover:underline"
                          href={`/manager/employee/employees/save/${employee.id}`}
                        >
                          {employee.name}
                        </Link>
                      </TableCell>
                      <TableCell data-label="연락처" className="text-muted-foreground">{employee.phone}</TableCell>
                      <TableCell data-label="직군" className="text-muted-foreground">{employee.role}</TableCell>
                      <TableCell data-label="근무형태" className="whitespace-nowrap text-muted-foreground">{employee.work_style === "0" ? "일반근무" : employee.work_style === "2" ? "야간근무" : "격일근무"}</TableCell>
                      <TableCell data-label="근무지" className="text-muted-foreground">
                        {worksiteById.get(assignmentByEmployeeId.get(employee.id)?.worksite_id ?? "") ?? ""}
                      </TableCell>
                      <TableCell data-label="배정기간" className="whitespace-nowrap text-muted-foreground">
                        {assignmentByEmployeeId.has(employee.id)
                          ? `${assignmentByEmployeeId.get(employee.id)?.start_date}~${assignmentByEmployeeId.get(employee.id)?.end_date}`
                          : ""}
                      </TableCell>
                      <TableCell data-label="출근" className="whitespace-nowrap text-muted-foreground">
                        {attendanceStatusByEmployeeId.get(employee.id) ?? "-"}
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
