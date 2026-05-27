import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AttendancePage from "./attendance/page";
import GuardMainLayout from "./layout";
import GuardMainPage from "./page";

const guardSession = {
  employee: {
    id: "employee-1",
    name: "홍길동",
    phone: "010-1234-5678",
    phone_normalized: "01012345678",
    is_retired: false,
  },
  assignment: {
    id: "assignment-1",
    employee_id: "employee-1",
    worksite_id: "worksite-1",
    start_date: "2026-05-24",
    end_date: "2026-05-24",
  },
  worksite: {
    id: "worksite-1",
    name: "본사",
    gps_info: { latitude: 37.5665, longitude: 126.978 },
    radius_meters: 100,
  },
  attendance: null,
};

describe("guard main navigation", () => {
  it("shows authenticated guard name and phone in the section navigation", async () => {
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(
      <GuardMainLayout>
        <GuardMainPage />
      </GuardMainLayout>,
    );

    expect(await screen.findByText("홍길동")).toBeInTheDocument();
    expect(screen.getByText("010-1234-5678")).toBeInTheDocument();
    expect(screen.getByText("(오늘의 근무지 : 본사)")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "나가기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "서비스" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "관리자 대시보드" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "경비원 출입" })).not.toBeInTheDocument();
  });

  it("keeps logout navigation on the guard login page", () => {
    render(
      <GuardMainLayout>
        <GuardMainPage />
      </GuardMainLayout>,
    );

    const logoutButton = screen.getByRole("button", { name: "로그아웃" });
    expect(logoutButton).toHaveAttribute("href", "/guard");
  });

  it("links the guard section title to the guard main page", () => {
    render(
      <GuardMainLayout>
        <GuardMainPage />
      </GuardMainLayout>,
    );

    expect(screen.getByRole("link", { name: "경비원" })).toHaveAttribute("href", "/guard/main");
  });

  it("keeps the main page as an entry point to attendance", () => {
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<GuardMainPage />);

    expect(screen.getByRole("link", { name: "출근하기" })).toHaveAttribute("href", "/guard/main/attendance");
    expect(screen.getByRole("link", { name: "안전교육" })).toHaveAttribute("href", "/guard/main/safty");
    for (const label of ["근무지확인", "퇴근하기", "개인프로필"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByTestId("clock-in")).not.toBeInTheDocument();
  });

  it("shows the attendance workflow on the attendance page", () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
    window.sessionStorage.setItem("ollbareun.guard.session", JSON.stringify(guardSession));

    render(<AttendancePage />);

    expect(screen.queryByRole("link", { name: "홈으로" })).not.toBeInTheDocument();
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: true,
      timeout: 8000,
    });
    expect(screen.queryByRole("button", { name: "현재 위치 가져오기" })).not.toBeInTheDocument();
    expect(screen.getByTestId("clock-in")).toBeInTheDocument();
  });
});
