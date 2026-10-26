"use client";

import { fetchDetailJson, PartialUpdateStatus, usePartialDetailUpdate } from "@/components/modals/partial-detail-update";
import { addRegisteredRow, type RegistrationResult } from "@/lib/registration-result";

import { applyDetailChanges, type DetailChange } from "@/lib/detail-changes";

import DetailModalLink from "@/components/modals/detail-modal-link";

import RegistrationModal from "@/components/modals/registration-modal";
import dynamic from "next/dynamic";

import ListResults from "@/components/list-results";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightIcon } from "@/components/icons/arrow-right-icon";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ManagerLoadingMessage from "../manager-loading-message";

type LeaveRow = {
  id: string;
  employeeName: string;
  employeeRole: string;
  workStyle: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  worksiteName: string;
  assignmentStartDate: string | null;
  assignmentEndDate: string | null;
};

type Employee = {
  id: string;
  name: string;
  is_retired?: boolean;
};

function formatPeriod(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) {
    return "-";
  }

  return startDate === endDate ? startDate : `${startDate} ~ ${endDate}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "휴가 자료를 불러오지 못했습니다.");
  }
  return payload as T;
}

const RegistrationForm = dynamic(() => import("./new/registration-form"));

export default function LeavePage() {
  const [nameQuery, setNameQuery] = useState("");
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function applyChanges(changes: DetailChange[]) {
    setRows((rows) => applyDetailChanges(rows, changes, "leave"));
  }

  const registration = usePartialDetailUpdate(async (changes, commit) => {
    const created = (await Promise.all(changes.map(async (change) =>
      (await fetchDetailJson<{ leaves: LeaveRow[] }>(`/api/leave?${new URLSearchParams({ id: change.id })}`)).leaves,
    ))).flat();
    commit(() => setRows((rows) => created.reduce((next, row) => addRegisteredRow(next, row), rows)
      .sort((left, right) => right.startDate.localeCompare(left.startDate))));
  });
  function registerRow({ record }: RegistrationResult) {
    setError("");
    registration.onSaved([{ entity: "leave", id: String(record.id), action: "upsert", data: record }]);
  }

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [leavePayload, bootstrapPayload] = await Promise.all([
          fetchJson<{ leaves: LeaveRow[] }>("/api/leave"),
          fetchJson<{ employees: Employee[] }>("/api/bootstrap"),
        ]);
        if (!ignore) {
          setRows(leavePayload.leaves ?? []);
          setEmployeeNames(
            Array.from(new Set((bootstrapPayload.employees ?? [])
              .filter((employee) => !employee.is_retired)
              .map((employee) => employee.name)))
              .sort((left, right) => left.localeCompare(right, "ko-KR")),
          );
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "휴가 자료를 불러오지 못했습니다.");
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

  const filteredRows = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();
    return rows.filter((row) => !query || row.employeeName.toLowerCase().includes(query));
  }, [nameQuery, rows]);

  return (
    <section className="space-y-[1.5rem]">
      <PartialUpdateStatus {...registration} />
      <header>
        <div className="space-y-3">
          <h1 className="text-[1.75rem] leading-[1.2]">휴가관리</h1>
        </div>
      </header>

      <section aria-label="휴가 검색" className="manager-section rounded-xl border border-border/50 bg-muted/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:max-w-[32rem]">
            <label className="ml-1 text-[0.875rem] font-semibold text-muted-foreground" htmlFor="leave-name-search">
              이름
            </label>
            <Input
              className="w-full"
              id="leave-name-search"
              list="leave-name-options"
              placeholder="이름을 입력하세요."
              value={nameQuery}
              onChange={(event) => setNameQuery(event.target.value)}
            />
            <datalist id="leave-name-options">
              {employeeNames.map((name) => <option key={name} value={name} />)}
            </datalist>
          </div>
          <RegistrationModal
            disabled={loading}
            title="휴가신청"
            form={RegistrationForm}
            onSaved={registerRow}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[0.1875rem] focus-visible:ring-ring/50 w-full md:w-auto"
          >
            <span>휴가신청</span>
            <ArrowRightIcon size={18} />
          </RegistrationModal>
        </div>
      </section>

      <section aria-label="휴가 목록" className="manager-section rounded-xl border border-border/50 bg-muted/40">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-[0.875rem] font-normal text-muted-foreground">
          <ListResults count={filteredRows.length} disabled={loading || Boolean(error)} />
        </div>

        {loading ? (
          <ManagerLoadingMessage />
        ) : error ? (
          <p role="alert" className="text-[1rem] text-destructive">{error}</p>
        ) : (
          <div className="min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border bg-background">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">이름</TableHead>
                  <TableHead className="text-left">직군</TableHead>
                  <TableHead className="text-left">근무형태</TableHead>
                  <TableHead className="text-left">휴가종류</TableHead>
                  <TableHead className="text-left">휴가기간</TableHead>
                  <TableHead className="text-left">근무지</TableHead>
                  <TableHead className="text-left">배정기간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell data-responsive-empty colSpan={7} className="p-8 text-center text-muted-foreground italic">
                      조회 결과에 해당하는 휴가가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell data-label="이름" className="font-semibold">
                        <DetailModalLink onSaved={applyChanges} className="text-primary hover:underline" href={`/manager/leave/${row.id}`}>
                          {row.employeeName}
                        </DetailModalLink>
                      </TableCell>
                      <TableCell data-label="직군" className="text-muted-foreground">{row.employeeRole}</TableCell>
                      <TableCell data-label="근무형태" className="text-muted-foreground">{row.workStyle}</TableCell>
                      <TableCell data-label="휴가종류" className="text-muted-foreground">
                        {row.leaveType}
                      </TableCell>
                      <TableCell data-label="휴가기간" className="whitespace-nowrap text-muted-foreground">
                        {row.startDate === row.endDate ? row.startDate : `${row.startDate} ~ ${row.endDate}`}
                      </TableCell>
                      <TableCell data-label="근무지" className="text-muted-foreground">{row.worksiteName}</TableCell>
                      <TableCell data-label="배정기간" className="whitespace-nowrap text-muted-foreground">
                        {formatPeriod(row.assignmentStartDate, row.assignmentEndDate)}
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
