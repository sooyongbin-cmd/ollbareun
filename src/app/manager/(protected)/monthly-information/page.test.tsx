import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { readListTable } from "@/lib/list-export";
import { educationToday } from "@/lib/education-periods";
import { findManagerNavigation } from "../manager-navigation";
import MonthlyInformationPage from "./page";

afterEach(() => vi.unstubAllGlobals());
it("shows the copied monthly attendance screen under its new title with worksite search and detail links", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url === "/api/bootstrap"
    ? { worksites: [{ name: "본사" }] }
    : { rows: [{ id: "record-1", employeeName: "홍길동", employeeRole: "경비원", workStyle: "격일근무", employeeBirthdate: "1966-01-02", worksiteName: "본사",
      workDate: "2026-10-23", scheduledClockIn: "18:00", scheduledClockOut: "2026-10-24 08:00",
      clockInDateTime: "-", clockOutDateTime: null, status: "대기", outtimeLabel: "",
      education: { daily: "09:05", monthly: "O", quarterly: "X", semiannual: "-", other: "O" },
      remarks: [{ id: "remark-1", reportedAt: "2026-10-23T09:00:00Z", content: "출입문 파손\n상세 내용" }] }] })));
  render(<MonthlyInformationPage />);
  expect(screen.getByRole("heading", { name: "월별현황" })).toBeInTheDocument();
  expect(screen.getByLabelText("조회년월")).toHaveValue(educationToday().slice(0, 7));
  expect(screen.getByLabelText("근무지")).toHaveAttribute("list", "monthly-information-worksite-options");
  expect(await screen.findByRole("link", { name: "홍길동 (경비,격일) 2026-10-23 근태 상세 보기" }))
    .toHaveAttribute("href", "/manager/reports/attendance/detail/record-1");
  expect(screen.getByRole("button", { name: "엑셀" })).toBeEnabled();
  expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
    "근무지", "이름", "직군", "근무형태", "생년월일", "출근예정일", "출퇴근예정", "출퇴근", "근태", "일일", "월별", "분기", "반기", "연간", "특이사항",
  ]);
  expect(screen.getByText("09:05")).toBeInTheDocument();
  expect(screen.getByText("X")).toBeInTheDocument();
  expect(screen.getByText("출입문 파손....")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /2026\. 10\. 23/ })).toHaveAttribute("href", "/manager/inspection/special-remarks/remark-1");
  const exported = readListTable(screen.getByRole("region", { name: "월별현황 목록" }));
  expect(exported.rows[0].slice(0, 5)).toEqual(["본사", "홍길동", "경비원", "격일근무", "1966-01-02"]);
  expect(exported.rows[0].slice(9, 14)).toEqual(["09:05", "O", "X", "-", "O"]);
  expect(exported.rows[0][14]).toContain("출입문 파손....");
  fireEvent.change(screen.getByLabelText("근무지"), { target: { value: "없는근무지" } });
  expect(screen.getByText("조회 결과 0")).toBeInTheDocument();
});
it("offers unique worker names and combines worker and worksite filters for rows and export", async () => {
  const base = { employeeRole: "경비원", workStyle: "격일근무", workDate: "2026-10-23",
    scheduledClockIn: "18:00", scheduledClockOut: "2026-10-24 08:00", clockInDateTime: "-", clockOutDateTime: null,
    status: "대기", outtimeLabel: "", education: { daily: "-", monthly: "-", quarterly: "-", semiannual: "-", other: "-" }, remarks: [] };
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url === "/api/bootstrap"
    ? { worksites: [{ name: "본사" }, { name: "지사" }], employees: [{ name: "홍길동" }, { name: "김철수" }, { name: "홍길동" }, { name: "조민수" }] }
    : { rows: [
      { ...base, id: "a", employeeName: "홍길동", worksiteName: "본사" },
      { ...base, id: "b", employeeName: "김철수", worksiteName: "본사" },
      { ...base, id: "c", employeeName: "홍길동", worksiteName: "지사" },
    ] })));
  render(<MonthlyInformationPage />);
  await screen.findByText("조회 결과 3");
  expect(screen.getByLabelText("근무자")).toHaveAttribute("list", "monthly-information-employee-options");
  expect(Array.from(document.querySelectorAll("#monthly-information-employee-options option")).map((option) => option.getAttribute("value")))
    .toEqual(["김철수", "조민수", "홍길동"]);
  const region = screen.getByRole("region", { name: "월별현황 목록" });
  fireEvent.change(screen.getByLabelText("근무지"), { target: { value: "본사" } });
  fireEvent.change(screen.getByLabelText("근무자"), { target: { value: " 길 " } });
  expect(screen.getByText("조회 결과 1")).toBeInTheDocument();
  expect(readListTable(region).rows[0].slice(0, 5)).toEqual(["본사", "홍길동", "경비원", "격일근무", "-"]);
  fireEvent.change(screen.getByLabelText("근무지"), { target: { value: "" } });
  expect(screen.getByText("조회 결과 2")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("근무자"), { target: { value: "없는이름" } });
  expect(screen.getByText("조회 결과 0")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("근무자"), { target: { value: "" } });
  expect(readListTable(region).rows).toHaveLength(3);
});
it("hides all five identity cells only when all match the preceding visible row and preserves export", async () => {
  const base = { employeeName: "홍길동", employeeRole: "경비원", workStyle: "격일근무", employeeBirthdate: "1966-01-02", worksiteName: "본사",
    workDate: "2026-10-23", clockInDateTime: "-", clockOutDateTime: null, status: "대기", outtimeLabel: "",
    education: { daily: "X", monthly: "-", quarterly: "-", semiannual: "-", other: "-" }, remarks: [] };
  const changes = [{}, {}, { worksiteName: "지사" }, { employeeName: "김철수" }, { employeeRole: "미화원" },
    { workStyle: "일반근무" }, { employeeBirthdate: "1970-02-03" }];
  let current = base;
  const rows = changes.map((change, index) => {
    current = { ...current, ...change };
    return { ...current, id: String(index) };
  });
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url === "/api/bootstrap" ? {} : { rows })));
  render(<MonthlyInformationPage />);
  await screen.findByText("조회 결과 7");
  const region = screen.getByRole("region", { name: "월별현황 목록" });
  const visibleValues = () => Array.from(region.querySelectorAll("tbody tr")).map((row) =>
    Array.from(row.querySelectorAll("td")).slice(0, 5).map((cell) => cell.textContent));
  expect(visibleValues()[0]).toEqual(["본사", "홍길동", "경비원", "격일근무", "1966-01-02"]);
  expect(visibleValues()[1]).toEqual(["", "", "", "", ""]);
  for (let index = 2; index < rows.length; index++) expect(visibleValues()[index]).not.toContain("");
  expect(readListTable(region).rows[1].slice(0, 5)).toEqual(visibleValues()[0]);
  fireEvent.change(screen.getByLabelText("근무지"), { target: { value: "지사" } });
  expect(visibleValues()[0]).toEqual(["지사", "홍길동", "경비원", "격일근무", "1966-01-02"]);
});
it("resolves the overview menu and header title for the new route", () => {
  expect(findManagerNavigation("/manager/monthly-information")).toMatchObject({ group: null,
    item: { label: "월별현황", href: "/manager/monthly-information" } });
  expect(findManagerNavigation("/manager/worker-information").item.label).toBe("월간근태");
});
