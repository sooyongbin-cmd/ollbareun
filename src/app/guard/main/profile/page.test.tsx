import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardProfilePage from "./page";

const signInWithPassword = vi.fn();
const registerPasskey = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/supabase-passkey-client", () => ({
  getSupabasePasskeyClient: () => ({
    auth: { signInWithPassword, registerPasskey, signOut },
  }),
}));

describe("guard profile page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    signInWithPassword.mockReset();
    registerPasskey.mockReset();
    signOut.mockReset();
    window.sessionStorage.clear();
  });

  it("loads the logged-in guard profile and renders profile and passkey sections", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/guard/passkey-requests/me")) {
        return Response.json({ request: null });
      }
      if (url.startsWith("/api/guard/profile")) {
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
      }
      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    window.sessionStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({ employee: { id: "emp-1", name: "홍길동" } }),
    );

    render(<GuardProfilePage />);

    expect(await screen.findByRole("heading", { name: "개인프로필" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "패스키 등록" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "근무스케줄" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "월별출근현황" })).toBeInTheDocument();
    expect(screen.getByText("2026-05-01 ~ 2026-05-31")).toBeInTheDocument();
    expect(screen.getByText("본사")).toBeInTheDocument();
    expect(screen.getByText("2026-05")).toBeInTheDocument();
    expect(screen.getByText("3일")).toBeInTheDocument();
    expect(screen.getByText("25시간 30분")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "패스키 등록 요청" })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("shows a session message when guard session is missing", () => {
    vi.stubGlobal("fetch", vi.fn());

    render(<GuardProfilePage />);

    expect(screen.getByText("경비원 정보를 찾을 수 없습니다. 다시 로그인하세요.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requests passkey registration from the profile page", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/guard/profile")) {
        return Response.json({ schedules: [], monthlyAttendance: [] });
      }
      if (url.startsWith("/api/guard/passkey-requests/me")) {
        return Response.json({ request: null });
      }
      if (url === "/api/guard/passkey-requests" && init?.method === "POST") {
        return Response.json({ request: { id: "req-1", status: "pending" } });
      }
      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    window.sessionStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({ employee: { id: "emp-1", name: "홍길동" } }),
    );

    render(<GuardProfilePage />);
    fireEvent.click(await screen.findByRole("button", { name: "패스키 등록 요청" }));

    expect(await screen.findByText("관리자 승인 대기 중입니다.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/guard/passkey-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "emp-1" }),
    });
  });

  it("shows an error message when loading profile data fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).startsWith("/api/guard/passkey-requests/me")) {
          return Response.json({ request: null });
        }
        return Response.json({ error: "개인프로필을 불러오지 못했습니다." }, { status: 500 });
      }),
    );
    window.sessionStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({ employee: { id: "emp-1", name: "홍길동" } }),
    );

    render(<GuardProfilePage />);

    expect(await screen.findByText("개인프로필을 불러오지 못했습니다.")).toBeInTheDocument();
  });
});
