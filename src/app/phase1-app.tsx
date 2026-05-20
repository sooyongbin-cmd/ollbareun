"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  canClockIn,
  canClockOut,
  type AttendanceRecord,
  type Worksite,
} from "@/lib/phase1";

type EmployeeRow = {
  id: string;
  name: string;
  phone: string;
  phone_normalized: string;
};

type WorksiteRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
};

type AssignmentRow = {
  id: string;
  employee_id: string;
  worksite_id: string;
  work_date: string;
};

type AttendanceRow = {
  id: string;
  employee_id: string;
  worksite_id: string;
  work_date: string;
  clock_in_at: string | null;
  clock_out_at: string | null;
};

type Bootstrap = {
  employees: EmployeeRow[];
  worksites: WorksiteRow[];
  assignments: AssignmentRow[];
  attendance: AttendanceRow[];
  summary: {
    totalEmployees: number;
    currentlyClockedIn: number;
  };
};

type GuardSession = {
  employee: EmployeeRow;
  assignment: AssignmentRow | null;
  worksite: WorksiteRow | null;
  attendance: AttendanceRow | null;
};

const emptyBootstrap: Bootstrap = {
  employees: [],
  worksites: [],
  assignments: [],
  attendance: [],
  summary: { totalEmployees: 0, currentlyClockedIn: 0 },
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function asWorksite(row: WorksiteRow): Worksite {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    radiusMeters: row.radius_meters,
  };
}

function asAttendance(row: AttendanceRow | null): AttendanceRecord | null {
  if (!row?.clock_in_at) {
    return null;
  }

  return {
    id: row.id,
    employeeId: row.employee_id,
    worksiteId: row.worksite_id,
    clockInAt: row.clock_in_at,
    clockOutAt: row.clock_out_at,
  };
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "?붿껌??泥섎━?섏? 紐삵뻽?듬땲??");
  }

  return payload as T;
}

type Phase1AppProps = {
  mode: "manager" | "guard";
  managerView?: "overview" | "employeeList" | "employee" | "worksite" | "assignment";
};

const managerPageTitles = {
  employeeList: "직원명부관리",
  overview: "관리자 화면",
  employee: "직원등록",
  worksite: "근무지등록",
  assignment: "근무지배정",
};

const managerPageDescriptions = {
  employeeList: "등록된 직원의 이름과 연락처를 검색해 확인합니다.",
  overview: "異쒓렐 ?꾪솴怨??깅줉??吏곸썝, ?ㅻ뒛 諛곗젙???뺤씤?⑸땲??",
  employee: "吏곸썝?대쫫怨??곕씫泥섎? ?낅젰??吏곸썝???깅줉?⑸땲??",
  worksite: "洹쇰Т吏紐? GPS 醫뚰몴, ?덉슜 諛섍꼍???낅젰??洹쇰Т吏瑜??깅줉?⑸땲??",
  assignment: "직원에게 작업장을 배정합니다.",
};
const adminMenu = [
  {
    label: "대시보드",
    children: [
      "요약 카드",
      "출퇴근 추이 차트",
      "안전교육 이수율 추이 차트",
      "실시간 출퇴근 현황",
    ],
  },
  {
    label: "직원 관리",
    children: [
      "직원명부관리(목록)/등록/수정",
      "근태 관리",
      "근무지 배정 및 관리",
      { label: "직원명부관리", href: "/manager/employee/employees" },
      { label: "직원등록", href: "/manager/employee/employees/new" },
      { label: "근무지등록", href: "/manager/employee/worksites/new" },
      { label: "근무지배정", href: "/manager/employee/assignments/new" },
    ],
  },
  {
    label: "안전교육 관리",
    children: ["교육 대상 관리 목록/등록/수정", "교육 이수 관리"],
  },
  {
    label: "권한 관리",
    children: ["마스터 관리자", "중간 관리자", "등급별 접근 제한"],
  },
  {
    label: "리포트 출력",
    children: ["주차 / 야간 / 직원이름 검색", "출퇴근 기록", "교육이수 자료", "자동 양식 생성"],
  },
];

function EmployeeRosterSection({ data }: { data: Bootstrap }) {
  const [query, setQuery] = useState("");

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
        <h1 className="text-[40px] font-semibold tracking-tight leading-[1.1]">
          {managerPageTitles.employeeList}
        </h1>
        <p className="text-[21px] font-normal text-ink-muted-48 mt-2 max-w-[600px]">
          {managerPageDescriptions.employeeList}
        </p>
      </header>

      <div className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2 flex-1">
            <label
              className="text-[14px] font-semibold text-ink-muted-48 ml-1"
              htmlFor="employee-roster-search"
            >
              筌욊낯??野꺜???
            </label>
            <input
              className="field"
              id="employee-roster-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="筌욊낯?앾쭗? ?怨뺤뵭筌ｌ꼶? ??낆젾??뤾쉭??"
            />
          </div>

          <Link
            className="button-primary w-full text-center md:w-auto"
            href="/manager/employee/employees/new"
          >
            筌욊낯???源낆쨯
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[14px] text-ink-muted-48">
          <span>筌뤴뫖以? {data.employees.length}</span>
          <span>野꺜????? {filteredEmployees.length}</span>
        </div>

        <div className="mt-4 overflow-hidden rounded-[16px] border border-hairline bg-canvas">
          <table className="apple-table">
            <thead>
              <tr>
                <th className="text-left">筌욊낯?앾쭗?</th>
                <th className="text-left">?怨뺤뵭筌?</th>
                <th className="text-right">?類ㅼ뵥</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-ink-muted-48 italic">
                    野꺜????? 揶쎛?館釉?筌욊낯?????곷뮸??덈뼄.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-canvas-parchment transition-colors">
                    <td className="font-semibold">{employee.name}</td>
                    <td className="text-ink-muted-48">{employee.phone}</td>
                    <td className="text-right">
                      <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
                        筌뤴뫖以?                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function Phase1App({ mode, managerView = "overview" }: Phase1AppProps) {
  const [data, setData] = useState<Bootstrap>(emptyBootstrap);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [guard, setGuard] = useState<GuardSession | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  async function fetchBootstrap() {
    const response = await fetch("/api/bootstrap");
    return (await response.json()) as Bootstrap;
  }

  async function refresh() {
    setData(await fetchBootstrap());
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      try {
        const bootstrap = await fetchBootstrap();
        if (!ignore) {
          setData(bootstrap);
        }
      } catch (refreshError) {
        if (!ignore) {
          setError(refreshError instanceof Error ? refreshError.message : "?곗씠?곕? 遺덈윭?ㅼ? 紐삵뻽?듬땲??");
        }
      }
    }

    void loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  const assignmentRows = useMemo(
    () =>
      data.assignments.map((assignment) => ({
        assignment,
        employee: data.employees.find((employee) => employee.id === assignment.employee_id),
        worksite: data.worksites.find((worksite) => worksite.id === assignment.worksite_id),
      })),
    [data],
  );

  const attendanceRows = useMemo(
    () =>
      data.attendance.map((record) => ({
        record,
        employee: data.employees.find((employee) => employee.id === record.employee_id),
        worksite: data.worksites.find((worksite) => worksite.id === record.worksite_id),
      })),
    [data],
  );

  const clockInDecision =
    guard?.worksite && latitude && longitude
      ? canClockIn({
          worksite: asWorksite(guard.worksite),
          currentLatitude: Number(latitude),
          currentLongitude: Number(longitude),
        })
      : {
          allowed: false,
          reason: guard?.worksite
            ? "?꾩옱 ?꾩튂瑜??낅젰?섍굅???뺤씤?섏꽭??"
            : "?ㅻ뒛 諛곗젙??洹쇰Т吏媛 ?놁뒿?덈떎.",
        };

  const clockOutDecision = canClockOut(asAttendance(guard?.attendance ?? null));

  async function handleEmployeeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    const form = new FormData(formElement);
    const result = await postJson<{ employee: EmployeeRow }>("/api/employees", {
      name: form.get("name"),
      phone: form.get("phone"),
    });
    setData((current) => ({
      ...current,
      employees: [
        result.employee,
        ...current.employees.filter((employee) => employee.id !== result.employee.id),
      ],
      summary: {
        ...current.summary,
        totalEmployees:
          current.employees.some((employee) => employee.id === result.employee.id)
            ? current.summary.totalEmployees
            : current.summary.totalEmployees + 1,
      },
    }));
    setMessage(`${result.employee.name} 吏곸썝???깅줉?섏뿀?듬땲??`);
    formElement.reset();
  }

  async function handleWorksiteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    const form = new FormData(formElement);
    await postJson("/api/worksites", {
      name: form.get("name"),
      latitude: form.get("latitude"),
      longitude: form.get("longitude"),
      radiusMeters: form.get("radiusMeters"),
    });
    setMessage("洹쇰Т吏媛 ?깅줉?섏뿀?듬땲??");
    formElement.reset();
    await refresh();
  }

  async function handleAssignmentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    await postJson("/api/assignments", {
      employeeId: form.get("employeeId"),
      worksiteId: form.get("worksiteId"),
      workDate: form.get("workDate"),
    });
    setMessage("洹쇰Т吏媛 諛곗젙?섏뿀?듬땲??");
    await refresh();
  }

  async function handleGuardAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const session = await postJson<GuardSession>("/api/guard/auth", {
      name: form.get("name"),
      phone: form.get("phone"),
    });
    setGuard(session);
    setLatitude(session.worksite ? String(session.worksite.latitude) : "");
    setLongitude(session.worksite ? String(session.worksite.longitude) : "");
    setMessage("寃쎈퉬???몄쬆???꾨즺?섏뿀?듬땲??");
  }

  async function updateCurrentLocation() {
    if (!navigator.geolocation) {
      setError("??釉뚮씪?곗??먯꽌???꾩튂 ?뺤씤???ъ슜?????놁뒿?덈떎.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
      },
      () => setError("?꾩옱 ?꾩튂瑜??뺤씤?섏? 紐삵뻽?듬땲??"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function handleClockIn() {
    if (!guard?.employee || !guard.worksite) {
      return;
    }
    setError("");
    const result = await postJson<{ attendance: AttendanceRow }>("/api/attendance/clock-in", {
      employeeId: guard.employee.id,
      worksiteId: guard.worksite.id,
      latitude,
      longitude,
    });
    setGuard({ ...guard, attendance: result.attendance });
    setMessage("異쒓렐 泥섎━?섏뿀?듬땲??");
    await refresh();
  }

  async function handleClockOut() {
    if (!guard?.employee) {
      return;
    }
    setError("");
    const result = await postJson<{ attendance: AttendanceRow }>("/api/attendance/clock-out", {
      employeeId: guard.employee.id,
      latitude: latitude || guard.worksite?.latitude,
      longitude: longitude || guard.worksite?.longitude,
    });
    setGuard({ ...guard, attendance: result.attendance });
    setMessage("?닿렐 泥섎━?섏뿀?듬땲??");
    await refresh();
  }

  return (
    <main className="min-h-screen bg-canvas text-ink font-apple selection:bg-primary/20">
      {/* Global Nav */}
      <nav className="h-[44px] bg-surface-black text-white flex items-center px-5 sticky top-0 z-50">
        <div className="mx-auto max-w-[980px] w-full flex items-center justify-between">
          <Link href="/" className="text-[12px] font-normal tracking-[-0.12px] hover:opacity-80 transition-opacity">
            ?щ컮瑜?愿由ъ떆?ㅽ뀥
          </Link>
          <div className="flex gap-5">
            <span className="text-[12px] font-normal tracking-[-0.12px] opacity-60">Phase 1</span>
          </div>
        </div>
      </nav>

      {/* Sub Nav */}
      <nav className="h-[52px] bg-canvas-parchment/80 backdrop-blur-md sticky top-[44px] z-40 border-b border-hairline/30">
        <div className="mx-auto max-w-[980px] w-full h-full flex items-center justify-between px-5">
          <h2 className="text-[21px] font-semibold tracking-[0.231px]">
            {mode === "manager" ? "관리자" : "경비원"}
          </h2>
          <div className="flex items-center gap-6">
            {mode === "manager" && (
              <div className="hidden md:flex gap-6 text-[14px] font-normal">
                <span className="opacity-60">吏곸썝: {data.summary.totalEmployees}</span>
                <span className="opacity-60">異쒓렐: {data.summary.currentlyClockedIn}</span>
              </div>
            )}
            <Link href="/" className="text-[14px] text-primary hover:underline">
              ?섍?湲?            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-[980px] w-full px-5 py-[80px]">
        {mode === "manager" ? (
          <div className="grid gap-[48px] lg:grid-cols-[240px_1fr]">
            <aside className="lg:sticky lg:top-[120px] self-start">
              <nav className="space-y-[12px]" aria-label="관리자화면 메뉴">
                <p className="text-[14px] font-semibold text-ink-muted-48 px-2 uppercase tracking-wider">관리자화면</p>
                <ul className="space-y-1">
                  {adminMenu.map((item) => (
                    <li key={item.label} className="py-2 px-2">
                      <div className="text-[14px] font-semibold text-ink mb-2">{item.label}</div>
                      <div className="space-y-2 pl-2">
                        {item.children.map((child, idx) => {
                          const isLink = typeof child !== "string";
                          const label = isLink ? child.label : child;
                          const href = isLink ? child.href : "#";
                          
                          return (
                            <Link
                              key={idx}
                              href={href}
                              className={`block text-[14px] leading-relaxed transition-colors ${
                                isLink ? "text-primary font-medium hover:opacity-80" : "text-ink-muted-48"
                              }`}
                            >
                              {label}
                            </Link>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            <section className="space-y-[80px]">
              {managerView === "employeeList" ? (
                <EmployeeRosterSection data={data} />
              ) : (
                <>
              {/* Main Content Area */}
              <div className="space-y-[24px]">
                <header>
                  <h1 className="text-[40px] font-semibold tracking-tight leading-[1.1]">
                    {managerPageTitles[managerView]}
                  </h1>
                  <p className="text-[21px] font-normal text-ink-muted-48 mt-2 max-w-[600px]">
                    {managerPageDescriptions[managerView]}
                  </p>
                </header>

                <div className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
                  {managerView === "employee" ? (
                    <form className="space-y-6" onSubmit={handleEmployeeSubmit}>
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="employee-name">직원이름</label>
                          <input className="field" id="employee-name" name="name" placeholder="직원 이름을 입력하세요." required />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="employee-phone">연락처</label>
                          <input className="field" id="employee-phone" name="phone" placeholder="010-0000-0000" required />
                        </div>
                      </div>
                      <button className="button-primary w-full md:w-auto" data-testid="employee-submit" type="submit">
                        직원 등록
                      </button>
                    </form>
                  ) : null}

                  {managerView === "worksite" ? (
                    <form className="space-y-6" onSubmit={handleWorksiteSubmit}>
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-name">근무지명</label>
                          <input className="field" id="worksite-name" name="name" placeholder="작업장 이름을 입력하세요." required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-latitude">위도</label>
                            <input className="field" id="worksite-latitude" name="latitude" placeholder="37.xxx" required />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="worksite-longitude">경도</label>
                            <input className="field" id="worksite-longitude" name="longitude" placeholder="127.xxx" required />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="radiusMeters">허용 반경(m)</label>
                          <input className="field" id="radiusMeters" name="radiusMeters" defaultValue="100" />
                        </div>
                      </div>
                      <button className="button-primary w-full md:w-auto" data-testid="worksite-submit" type="submit">
                        근무지 등록
                      </button>
                    </form>
                  ) : null}

                  {managerView === "assignment" ? (
                    <form className="space-y-6" onSubmit={handleAssignmentSubmit}>
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="assignment-employee">직원</label>
                          <select className="field appearance-none" id="assignment-employee" name="employeeId" required>
                            <option value="">?좏깮</option>
                            {data.employees.map((employee) => (
                              <option key={employee.id} value={employee.id}>{employee.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="assignment-worksite">근무지</label>
                          <select className="field appearance-none" id="assignment-worksite" name="worksiteId" required>
                            <option value="">?좏깮</option>
                            {data.worksites.map((worksite) => (
                              <option key={worksite.id} value={worksite.id}>{worksite.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="assignment-date">근무일</label>
                          <input className="field" id="assignment-date" name="workDate" type="date" defaultValue={todayDate()} />
                        </div>
                      </div>
                      <button className="button-primary w-full md:w-auto" data-testid="assignment-submit" type="submit">
                        근무지 배정
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>

              {/* Data Lists */}
              <div className="grid md:grid-cols-2 gap-[48px]">
                <section>
                  <h3 className="text-[21px] font-semibold mb-4">吏곸썝 紐⑸줉</h3>
                  <div className="bg-canvas border border-hairline rounded-[18px] overflow-hidden">
                    {data.employees.length === 0 ? (
                      <p className="p-6 text-[17px] text-ink-muted-48 italic">?깅줉??吏곸썝???놁뒿?덈떎.</p>
                    ) : (
                      <ul className="divide-y divide-hairline">
                        {data.employees.map((employee) => (
                          <li key={employee.id} className="p-4 hover:bg-canvas-parchment transition-colors">
                            {employee.name} / {employee.phone}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[21px] font-semibold mb-4">?ㅻ뒛 諛곗젙 ?꾪솴</h3>
                  <div className="bg-canvas border border-hairline rounded-[18px] overflow-hidden">
                    {assignmentRows.length === 0 ? (
                      <p className="p-6 text-[17px] text-ink-muted-48 italic">?ㅻ뒛 諛곗젙???몄썝???놁뒿?덈떎.</p>
                    ) : (
                      <ul className="divide-y divide-hairline">
                        {assignmentRows.map(({ assignment, employee, worksite }) => (
                          <li key={assignment.id} className="p-4 hover:bg-canvas-parchment transition-colors flex justify-between items-center">
                            <span className="font-semibold text-[17px]">{employee?.name ?? "吏곸썝 ?놁쓬"}</span>
                            <span className="text-primary font-medium text-[14px]">??{worksite?.name ?? "?꾩옣 ?놁쓬"}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              </div>

              {/* Attendance Table */}
              <section>
                <h3 className="text-[24px] font-semibold mb-6">?ㅼ떆媛?異쒓렐 ?꾪솴</h3>
                <div className="bg-canvas border border-hairline rounded-[18px] overflow-hidden">
                  <table className="apple-table">
                    <thead>
                      <tr>
                        <th className="text-left">이름</th>
                        <th className="text-left">작업장명</th>
                        <th className="text-left">출근시간</th>
                        <th className="text-right">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-ink-muted-48 italic">
                            ?꾩옱 異쒓렐 湲곕줉???놁뒿?덈떎.
                          </td>
                        </tr>
                      ) : (
                        attendanceRows.map(({ record, employee, worksite }) => (
                          <tr key={record.id} className="hover:bg-canvas-parchment transition-colors">
                            <td className="font-semibold">{employee?.name ?? "-"}</td>
                            <td className="text-ink-muted-48">{worksite?.name ?? "-"}</td>
                            <td>
                              {record.clock_in_at
                                ? new Date(record.clock_in_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                                : "-"}
                            </td>
                            <td className="text-right">
                              <span className={`inline-flex px-3 py-1 rounded-full text-[12px] font-semibold ${
                                record.clock_out_at ? "bg-hairline text-ink-muted-48" : "bg-primary/10 text-primary"
                              }`}>
                                {record.clock_out_at ? "종료" : "근무 중"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
                </>
              )}
            </section>
          </div>
        ) : null}

        {mode === "guard" ? (
          <div className="max-w-[600px] mx-auto">
            <header className="mb-[48px] text-center">
              <h1 className="text-[40px] font-semibold tracking-tight">경비원 화면</h1>
              <p className="text-[21px] text-ink-muted-48 mt-2">이름과 연락처로 직원 테이블을 비교해 인증합니다.</p>
            </header>

            <section className="bg-canvas-parchment rounded-[18px] p-[32px] border border-hairline/50">
              <form className="space-y-6" onSubmit={handleGuardAuth}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="guard-name">경비원 이름</label>
                    <input className="field" id="guard-name" name="name" placeholder="이름을 입력하세요." required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="guard-phone">경비원 연락처</label>
                    <input className="field" id="guard-phone" name="phone" placeholder="010-0000-0000" required />
                  </div>
                </div>
                <button className="button-primary w-full" data-testid="guard-auth-submit" type="submit">
                  경비원 인증
                </button>
              </form>

              {guard ? (
                <div className="mt-[48px] space-y-[32px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-canvas rounded-[18px] p-6 border border-hairline shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary text-xl font-bold">
                        {guard.employee.name[0]}
                      </div>
                      <div>
                        <p className="text-[19px] font-semibold">{guard.employee.name}님 인증됨</p>
                        <p className="text-[14px] text-ink-muted-48">?ㅻ뒛 諛곗젙 ?꾩옣: <span className="text-ink font-medium">{guard.worksite?.name ?? "?놁쓬"}</span></p>
                      </div>
                    </div>
                    {guard.worksite && (
                      <div className="text-[13px] text-ink-muted-48 bg-canvas-parchment rounded-lg p-3">
                        ?꾩옣 ?꾩튂: {guard.worksite.latitude}, {guard.worksite.longitude} (諛섍꼍 {guard.worksite.radius_meters}m)
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="current-latitude">?꾩옱 ?꾨룄</label>
                        <input className="field bg-canvas" id="current-latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[14px] font-semibold text-ink-muted-48 ml-1" htmlFor="current-longitude">?꾩옱 寃쎈룄</label>
                        <input className="field bg-canvas" id="current-longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                      </div>
                    </div>
                    <button className="button-secondary w-full md:w-auto" type="button" onClick={updateCurrentLocation}>
                      현재 위치 가져오기
                    </button>
                  </div>

                  <div className={`p-4 rounded-xl text-center text-[15px] font-medium transition-colors ${
                    clockInDecision.allowed ? "bg-primary/5 text-primary" : "bg-status-warn text-ink"
                  }`}>
                    {clockInDecision.reason}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      className="button-primary"
                      data-testid="clock-in"
                      type="button"
                      disabled={!clockInDecision.allowed || !!guard.attendance?.clock_in_at}
                      onClick={handleClockIn}
                    >
                      출근하기
                    </button>
                    <button
                      className="button-secondary"
                      data-testid="clock-out"
                      type="button"
                      disabled={!clockOutDecision.allowed}
                      onClick={handleClockOut}
                    >
                      퇴근하기
                    </button>
                  </div>

                  <div className="bg-canvas border border-hairline rounded-[18px] p-6 space-y-4">
                    <h4 className="text-[17px] font-semibold">?ㅻ뒛??洹쇰Т 湲곕줉</h4>
                    <div className="flex justify-between items-center text-[15px]">
                      <span className="text-ink-muted-48">異쒓렐 ?쒓컖</span>
                      <span className="font-medium">
                        {guard.attendance?.clock_in_at
                          ? new Date(guard.attendance.clock_in_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[15px]">
                      <span className="text-ink-muted-48">?닿렐 ?쒓컖</span>
                      <span className="font-medium">
                        {guard.attendance?.clock_out_at
                          ? new Date(guard.attendance.clock_out_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {message ? <p className="status-ok mt-6 text-center">{message}</p> : null}
              {error ? <p className="status-warn mt-6 text-center">{error}</p> : null}
            </section>
          </div>
        ) : null}
      </div>

      <footer className="bg-canvas-parchment border-t border-hairline py-[64px] px-5">
        <div className="mx-auto max-w-[980px] w-full grid md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <h4 className="text-[14px] font-semibold text-ink-muted-80 mb-4">?щ컮瑜?愿由ъ떆?ㅽ뀥</h4>
            <p className="text-[12px] text-ink-muted-48 leading-relaxed max-w-[400px]">
              蹂??쒖뒪?쒖? ?ㅼ떆媛?洹쇳깭 愿由?諛??덉쟾 援먯쑁 ?댁닔 ?꾪솴??愿由ы븯湲??꾪븳 湲곗뾽???붾（?섏엯?덈떎. 
              ?ъ슜 以?臾몄쓽?ы빆? 愿由ъ옄?먭쾶 ?곕씫 諛붾엻?덈떎.
            </p>
          </div>
          <div>
            <h4 className="text-[14px] font-semibold text-ink-muted-80 mb-4">서비스</h4>
            <ul className="space-y-3">
              <li><Link href="/manager" className="text-[12px] text-ink-muted-48 hover:text-primary transition-colors">관리자 대시보드</Link></li>
              <li><Link href="/guard" className="text-[12px] text-ink-muted-48 hover:text-primary transition-colors">경비원 출입</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[14px] font-semibold text-ink-muted-80 mb-4">踰뺤쟻 怨좎?</h4>
            <p className="text-[12px] text-ink-muted-48 leading-relaxed">
              짤 2026 ?щ컮瑜? All rights reserved. 
              媛쒖씤?뺣낫泥섎━諛⑹묠 | ?쒕퉬?ㅼ씠?⑹빟愿
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
