import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearStoredGuardSession, writeStoredGuardSession } from "../guard-session-storage";
import GuardBottomNavigation from "./guard-bottom-navigation";
import type { GuardWorkSchedule } from "@/lib/guard-work-schedule";

vi.mock("next/navigation", () => ({ usePathname: () => "/guard/main/work" }));

describe("guard footer patrol visibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  function writeSession(role: string | undefined, scheduledAttendances: GuardWorkSchedule[] = [{
    id: "schedule-1",
    employee_id: "test-employee",
    worksite_id: "site-1",
    work_date: "2026-05-26",
    intime: "2026-05-26T00:00:00.000Z",
    outtime: "2026-05-26T09:00:00.000Z",
    work_intime: null,
    work_outtime: null,
  }]) {
    writeStoredGuardSession({ employee: { id: "test-employee", role }, scheduledAttendances });
  }

  it.each(["경비원", "미화원"])("shows the active NFC work link for %s", (role) => {
    writeSession(role);
    render(<GuardBottomNavigation />);
    expect(screen.getByRole("link", { name: "점검" })).toHaveAttribute("href", "/guard/main/work");
    expect(screen.getByRole("link", { name: "점검" })).toHaveAttribute("aria-current", "page");
  });

  it.each(["파견", "", undefined])("hides inspection but preserves five other links for %s", (role) => {
    writeSession(role);
    render(<GuardBottomNavigation />);
    expect(screen.queryByRole("link", { name: "점검" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });

  it("updates when the role changes and when the session is cleared", () => {
    writeSession("경비원");
    render(<GuardBottomNavigation />);
    act(() => writeSession("파견"));
    expect(screen.queryByRole("link", { name: "점검" })).not.toBeInTheDocument();
    act(() => writeSession("미화원"));
    expect(screen.getByRole("link", { name: "점검" })).toBeInTheDocument();
    act(() => clearStoredGuardSession());
    expect(screen.queryByRole("link", { name: "점검" })).not.toBeInTheDocument();
  });

  it("disables attendance, remarks, and inspection links without schedules", () => {
    writeSession("경비원", []);
    render(<GuardBottomNavigation />);

    expect(screen.getByRole("button", { name: "출퇴근" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "점검" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "특이사항" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "안전교육" })).toBeInTheDocument();
  });

  it("disables attendance after the selected work date is completed", () => {
    writeSession("경비원", [{
      id: "schedule-1",
      employee_id: "test-employee",
      worksite_id: "site-1",
      work_date: "2026-05-26",
      intime: "2026-05-26T00:00:00.000Z",
      outtime: "2026-05-26T09:00:00.000Z",
      work_intime: "2026-05-26T00:00:00.000Z",
      work_outtime: "2026-05-26T09:00:00.000Z",
    }]);
    render(<GuardBottomNavigation />);

    expect(screen.getByRole("button", { name: "출퇴근" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "점검" })).toHaveAttribute("href", "/guard/main/work");
  });
});
