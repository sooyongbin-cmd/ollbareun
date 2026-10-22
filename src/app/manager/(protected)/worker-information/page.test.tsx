import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Page from "./page";
import { educationToday } from "@/lib/education-periods";

afterEach(() => vi.unstubAllGlobals());
describe("worker information page", () => {
  it("defaults to the current Korean month and queries the selected period", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ rows: [] }));
    vi.stubGlobal("fetch", fetch);
    render(<Page />);
    const today = educationToday();
    expect(screen.getByLabelText("조회 시작일")).toHaveValue(
      `${today.slice(0, 7)}-01`,
    );
    expect(screen.getByLabelText("조회 종료일")).toHaveValue(today);
    await screen.findByText("조회 결과에 해당하는 근무자가 없습니다.");
    fireEvent.change(screen.getByLabelText("조회 시작일"), {
      target: { value: "2026-09-01" },
    });
    fireEvent.change(screen.getByLabelText("조회 종료일"), {
      target: { value: "2026-09-30" },
    });
    expect(screen.queryByRole("button", { name: "조회" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(fetch).toHaveBeenLastCalledWith(
        "/api/manager/worker-information?start=2026-09-01&end=2026-09-30",
        expect.anything(),
      ),
    );
  });
  it("renders dotted birthdates, attendance counts and education fractions", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({
            rows: [
              {
                id: "a",
                name: "홍길동",
                birthdate: "1966-01-01",
                phone: "01012345678",
                role: "경비원",
                worksite: "본사",
                clockIn: "08:00",
                clockOut: "18:00",
                daysOff: "토요일",
                attendance: { 결근: 2, 조퇴: 1, 지각: 0, 연차: 0, 휴가: 0 },
                education: [{ label: "일일", completed: 2, total: 3 }],
                remarks: 4,
              },
            ],
          }),
        ),
    );
    render(<Page />);
    expect(await screen.findByText("1966.01.01")).toBeInTheDocument();
    expect(
      screen.getByText("결근(2), 조퇴(1), 지각(0), 연차(0), 휴가(0)"),
    ).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홍길동" })).toHaveAttribute(
      "href",
      "/manager/employee/employees/save/a",
    );
  });
});
