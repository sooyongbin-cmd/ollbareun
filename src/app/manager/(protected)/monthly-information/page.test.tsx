import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { educationToday } from "@/lib/education-periods";
import { findManagerNavigation } from "../manager-navigation";
import MonthlyInformationPage from "./page";

afterEach(() => vi.unstubAllGlobals());
it("shows the copied monthly attendance screen under its new title with worksite search and detail links", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url === "/api/bootstrap"
    ? { worksites: [{ name: "본사" }] }
    : { rows: [{ id: "record-1", employeeName: "홍길동", employeeRole: "경비원", workStyle: "격일근무", worksiteName: "본사",
      workDate: "2026-10-23", scheduledClockIn: "18:00", scheduledClockOut: "2026-10-24 08:00",
      clockInDateTime: "-", clockOutDateTime: null, status: "대기", outtimeLabel: "" }] })));
  render(<MonthlyInformationPage />);
  expect(screen.getByRole("heading", { name: "월별전체현황" })).toBeInTheDocument();
  expect(screen.getByLabelText("조회년월")).toHaveValue(educationToday().slice(0, 7));
  expect(screen.getByLabelText("근무지")).toHaveAttribute("list", "monthly-information-worksite-options");
  expect(await screen.findByRole("link", { name: "홍길동 (경비,격일) 2026-10-23 근태 상세 보기" }))
    .toHaveAttribute("href", "/manager/reports/attendance/detail/record-1");
  expect(screen.getByRole("button", { name: "엑셀" })).toBeEnabled();
  fireEvent.change(screen.getByLabelText("근무지"), { target: { value: "없는근무지" } });
  expect(screen.getByText("조회 결과 0")).toBeInTheDocument();
});
it("resolves the overview menu and header title for the new route", () => {
  expect(findManagerNavigation("/manager/monthly-information")).toMatchObject({ group: null,
    item: { label: "월별전체현황", href: "/manager/monthly-information" } });
  expect(findManagerNavigation("/manager/worker-information").item.label).toBe("월간근태");
});
