"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
};

type Bootstrap = {
  employees: EmployeeRow[];
  summary: {
    totalEmployees: number;
    currentlyClockedIn: number;
  };
};

const emptyBootstrap: Bootstrap = {
  employees: [],
  summary: {
    totalEmployees: 0,
    currentlyClockedIn: 0,
  },
};

export default function EmployeeRosterPage() {
  const [data, setData] = useState<Bootstrap>(emptyBootstrap);
  const [query, setQuery] = useState("");
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
          setData(payload as Bootstrap);
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

    loadBootstrap();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return data.employees;
    }

    const digitQuery = normalizedQuery.replace(/\D/g, "");

    return data.employees.filter((employee) => {
      const name = employee.name.toLowerCase();
      const phone = employee.phone.toLowerCase();

      return (
        name.includes(normalizedQuery) ||
        phone.includes(normalizedQuery) ||
        (digitQuery.length > 0 && employee.phone_normalized.includes(digitQuery))
      );
    });
  }, [data.employees, query]);

  return (
    <section className="space-y-[24px]">
      <header>
        <p className="text-[14px] font-semibold text-ink-muted-48 uppercase tracking-wider">관리자 화면</p>
        <div className="space-y-3">
          <h1 className="text-[40px] font-semibold tracking-tight leading-[1.1]">직원명부관리</h1>
          <p className="text-[21px] font-normal text-ink-muted-48 max-w-[640px]">
            등록된 직원의 이름과 연락처를 검색해 확인합니다.
          </p>
        </div>
      </header>

      <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 flex-1">
            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="employee-roster-search">
              직원 이름 검색
            </label>
            <input
              className="field"
              id="employee-roster-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="이름 또는 연락처를 입력하세요."
            />
          </div>

          <Link className="button-primary w-full text-center md:w-auto" href="/manager/employee/employees/new">
            직원 등록
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>전체 직원 {data.employees.length}</span>
          <span>검색 결과 {filteredEmployees.length}</span>
        </div>

        {loading ? (
          <p className="mt-6 text-[16px] text-ink-muted-48">직원 목록을 불러오는 중입니다.</p>
        ) : error ? (
          <p className="mt-6 text-[16px] text-status-warn">{error}</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-[16px] border border-hairline bg-canvas">
            <table className="apple-table">
              <thead>
                <tr>
                  <th className="text-left">이름</th>
                  <th className="text-left">연락처</th>
                  <th className="text-right">상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-ink-muted-48 italic">
                      검색 결과에 해당하는 직원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-canvas-parchment transition-colors">
                      <td className="font-semibold">{employee.name}</td>
                      <td className="text-ink-muted-48">{employee.phone}</td>
                      <td className="text-right">
                        <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                          등록됨
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="text-[14px] text-primary hover:underline" href="/manager">
            관리자 화면으로
          </Link>
          <Link className="text-[14px] text-primary hover:underline" href="/">
            나가기
          </Link>
        </div>
      </section>
    </section>
  );
}
