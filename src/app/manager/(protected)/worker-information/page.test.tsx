import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page from "./page";
import { readListTable } from "@/lib/list-export";
import { educationToday } from "@/lib/education-periods";

afterEach(() => vi.unstubAllGlobals());
describe("monthly attendance page", () => {
  it("defaults to the current Korean month and queries the selected month", async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ rows: [] })));
    vi.stubGlobal("fetch", fetch);
    render(<Page />);
    expect(screen.getByRole("heading", { name: "월간근태" })).toBeInTheDocument();
    expect(screen.getByLabelText("조회년월")).toHaveValue(educationToday().slice(0, 7));
    expect(screen.getByLabelText("조회년월")).toHaveAttribute("type", "month");
    await screen.findByText("조회 결과에 해당하는 근태가 없습니다.");
    fireEvent.change(screen.getByLabelText("조회년월"), { target: { value: "2026-09" } });
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(
      "/api/manager/worker-information?yearMonth=2026-09", expect.anything(),
    ));
    expect(screen.queryByLabelText("조회 시작일")).not.toBeInTheDocument();
  });
  it("shows daily records with employee summary, overnight times and combined attendance statuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ rows: [{
      id: "a", employeeName: "홍길동", employeeRole: "경비원", workStyle: "격일근무", worksiteName: "본사",
      workDate: "2026-10-23", scheduledClockIn: "22:00", scheduledClockOut: "2026-10-24 06:00",
      clockInDateTime: "2026-10-23 21:55", clockOutDateTime: "2026-10-24 06:05", status: "출근", outtimeLabel: "퇴근",
    }, {
      id: "b", employeeName: "김철수", employeeRole: "미화원", workStyle: "일반근무", worksiteName: "지사",
      workDate: "2026-10-24", scheduledClockIn: "08:00", scheduledClockOut: "2026-10-24 18:00",
      clockInDateTime: "-", clockOutDateTime: null, status: "휴가", outtimeLabel: "",
    }] })));
    render(<Page />);
    await screen.findByText("홍길동 (경비,격일)");
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "근무지", "이름", "출근예정일", "출퇴근예정", "출퇴근", "근태",
    ]);
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent)).toEqual([
      "본사", "홍길동 (경비,격일)", "2026-10-23 (금)", "22:00 ~ 24일 06:00", "21:55 ~ 24일 06:05", "출근 퇴근",
    ]);
    expect(screen.queryByRole("link", { name: "홍길동 (경비,격일)" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홍길동 (경비,격일) 2026-10-23 근태 상세 보기" })).toHaveAttribute("href", "/manager/reports/attendance/detail/a");
    expect(screen.getByText("휴가")).toBeInTheDocument();
  });
  it("omits repeated site and employee values within a site while preserving complete Excel rows", async () => {
    const base = { employeeName: "김철수", employeeRole: "경비원", workStyle: "격일근무", worksiteName: "가람",
      scheduledClockIn: "18:00", scheduledClockOut: "2026-10-03 08:00", clockInDateTime: "-", clockOutDateTime: null,
      status: "대기", outtimeLabel: "" };
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ rows: [
      { ...base, id: "a", workDate: "2026-10-01" },
      { ...base, id: "b", workDate: "2026-10-02" },
      { ...base, id: "c", workDate: "2026-10-02", employeeName: "홍길동" },
      { ...base, id: "d", workDate: "2026-10-02", employeeName: "홍길동", worksiteName: "하늘" },
    ] })));
    render(<Page />);
    await screen.findByText("김철수 (경비,격일)");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell").slice(0, 2).map((cell) => cell.textContent))).toEqual([
      ["가람", "김철수 (경비,격일)"], ["", ""], ["", "홍길동 (경비,격일)"], ["하늘", "홍길동 (경비,격일)"],
    ]);
    expect(rows.map((row) => within(row).getByRole("link").getAttribute("href"))).toEqual([
      "/manager/reports/attendance/detail/a", "/manager/reports/attendance/detail/b",
      "/manager/reports/attendance/detail/c", "/manager/reports/attendance/detail/d",
    ]);
    expect(within(rows[1]).getByRole("link")).toHaveTextContent("2026-10-02 (금)");
    expect(within(rows[1]).getAllByRole("cell")[3]).toHaveTextContent("18:00 ~ 3일 08:00");
    const exported = readListTable(screen.getByRole("region", { name: "월간근태 목록" }));
    expect(exported.rows[1].slice(0, 2)).toEqual(["가람", "김철수 (경비,격일)"]);
  });

  it("offers registered worksite names and filters the monthly rows by partial name", async () => {
    const base = { employeeName: "김철수", employeeRole: "경비원", workStyle: "격일근무",
      workDate: "2026-10-01", scheduledClockIn: "18:00", scheduledClockOut: "2026-10-02 08:00",
      clockInDateTime: "-", clockOutDateTime: null, status: "대기", outtimeLabel: "" };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => Response.json(url === "/api/bootstrap"
      ? { worksites: [{ name: "하늘" }, { name: "가람본사" }, { name: "미배정근무지" }, { name: "가람본사" }] }
      : { rows: [{ ...base, id: "a", worksiteName: "가람본사" }, { ...base, id: "b", worksiteName: "하늘" }] })));
    render(<Page />);
    await screen.findByText("가람본사");
    expect(screen.getByLabelText("근무지")).toHaveAttribute("list", "monthly-attendance-worksite-options");
    expect(Array.from(document.querySelectorAll("#monthly-attendance-worksite-options option")).map((option) => option.getAttribute("value")))
      .toEqual(["가람본사", "미배정근무지", "하늘"]);
    fireEvent.change(screen.getByLabelText("근무지"), { target: { value: "  가람  " } });
    expect(screen.getByText("조회 결과 1")).toBeInTheDocument();
    const region = screen.getByRole("region", { name: "월간근태 목록" });
    expect(readListTable(region).rows.map((row) => row[0])).toEqual(["가람본사"]);
    fireEvent.change(screen.getByLabelText("근무지"), { target: { value: "미배정" } });
    expect(screen.getByText("조회 결과에 해당하는 근태가 없습니다.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("근무지"), { target: { value: "" } });
    expect(readListTable(region).rows).toHaveLength(2);
  });

});
