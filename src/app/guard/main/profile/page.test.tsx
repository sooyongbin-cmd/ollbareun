import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardProfilePage from "./page";

describe("guard profile page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("loads the logged-in guard profile and renders both profile sections", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("/api/guard/profile?employeeId=emp-1");
      return Response.json({
        schedules: [
          { id: "assign-1", period: "2026-05-01 ~ 2026-05-31", worksiteName: "본사" },
          { id: "assign-2", period: "2026-06-01 ~ 2026-06-30", worksiteName: "문현동현장" },
        ],
        monthlyAttendance: [
          { yearMonth: "2026-05", attendanceDays: 3, workHoursTotal: "25시간 30분" },
          { yearMonth: "2026-06", attendanceDays: 1, workHoursTotal: "8시간" },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    window.sessionStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({ employee: { id: "emp-1", name: "홍길동" } }),
    );

    render(<GuardProfilePage />);

    expect(await screen.findByRole("heading", { name: "개인프로필" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "근무스케줄" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "월별출근현황" })).toBeInTheDocument();
    expect(screen.getByText("2026-05-01 ~ 2026-05-31")).toBeInTheDocument();
    expect(screen.getByText("본사")).toBeInTheDocument();
    expect(screen.getByText("2026-05")).toBeInTheDocument();
    expect(screen.getByText("3일")).toBeInTheDocument();
    expect(screen.getByText("25시간 30분")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("shows a session message when guard session is missing", () => {
    vi.stubGlobal("fetch", vi.fn());

    render(<GuardProfilePage />);

    expect(screen.getByText("경비원 정보를 찾을 수 없습니다. 다시 로그인하세요.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows an error message when loading profile data fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "개인프로필을 불러오지 못했습니다." }, { status: 500 })),
    );
    window.sessionStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({ employee: { id: "emp-1", name: "홍길동" } }),
    );

    render(<GuardProfilePage />);

    expect(await screen.findByText("개인프로필을 불러오지 못했습니다.")).toBeInTheDocument();
  });
});
