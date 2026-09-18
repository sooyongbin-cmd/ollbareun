import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardProfilePage from "./page";
import { PasskeyFeatureProvider } from "@/components/passkey-feature-provider";

const push = vi.fn();
const signInWithPassword = vi.fn();
const registerPasskey = vi.fn();
const signOut = vi.fn();

function dateKeyInSeoul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function addDateDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function mondayOf(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return date.toISOString().slice(0, 10);
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

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
    push.mockReset();
    window.localStorage.clear();
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
    expect(screen.getByRole("heading", { name: "패스키등록" })).toBeInTheDocument();
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

  it("groups planned attendance into future weeks and renders Monday through Sunday from the selected week", async () => {
    const today = dateKeyInSeoul();
    const currentWeekStart = mondayOf(today);
    const nextWeekStart = addDateDays(currentWeekStart, 7);
    const currentWeekDayOff = addDateDays(currentWeekStart, 1);
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/guard/passkey-requests/me")) {
        return Response.json({ request: null });
      }
      if (url.startsWith("/api/guard/profile")) {
        return Response.json({
          schedules: [{ id: "assign-1", period: `${currentWeekStart} ~ ${addDateDays(nextWeekStart, 2)}`, worksiteName: "본사" }],
          plannedAttendance: [
            { assignmentId: "assign-1", workDate: today, inTime: "2026-09-18T21:00:00.000Z", outTime: null, isDayOff: false },
            { assignmentId: "assign-1", workDate: nextWeekStart, inTime: "2026-09-25T21:00:00.000Z", outTime: null, isDayOff: false },
          ],
          plannedDaysOff: [{ assignmentId: "assign-1", workDate: currentWeekDayOff }],
          monthlyAttendance: [],
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

    const scheduleSelect = await screen.findByRole("combobox", { name: "근무 스케줄 선택" });
    await waitFor(() => expect(scheduleSelect).toHaveValue(currentWeekStart));
    expect(scheduleSelect.querySelectorAll("option")).toHaveLength(2);
    expect(screen.getByLabelText(`${today} 근무`)).toBeInTheDocument();
    expect(screen.getByLabelText(`${currentWeekDayOff} 휴무`)).toBeInTheDocument();

    fireEvent.change(scheduleSelect, { target: { value: nextWeekStart } });

    expect(scheduleSelect).toHaveValue(nextWeekStart);
    expect(screen.getByLabelText(`${nextWeekStart} 근무`)).toBeInTheDocument();
    expect(screen.getByLabelText(`${addDateDays(nextWeekStart, 1)} 휴무`)).toBeInTheDocument();
  });

  it("opens the work and absence detail modals from the monthly cards", async () => {
    const today = new Date();
    const monthKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
    }).format(today);
    const monthLabel = `${Number(monthKey.slice(5, 7))}월`;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/guard/passkey-requests/me")) {
        return Response.json({ request: null });
      }
      if (url.startsWith("/api/guard/profile")) {
        return Response.json({
          schedules: [],
          monthlyAttendance: [{ yearMonth: monthKey, attendanceDays: 2, workHoursTotal: "16시간" }],
          attendanceDetails: [
            { workDate: `${monthKey}-01`, status: "정상 출근", timeRange: "(05:58~14:02)" },
            { workDate: `${monthKey}-02`, status: "지각 출근", timeRange: "(06:58~14:02)" },
          ],
          absenceDetails: [{ workDate: `${monthKey}-03`, reason: "결근" }],
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

    fireEvent.click(await screen.findByRole("button", { name: `${monthLabel} 근무 내역 보기` }));
    expect(await screen.findByRole("dialog", { name: `${monthLabel} 근무 내역` })).toBeInTheDocument();
    expect(screen.getByText(`${monthLabel} 1일`)).toBeInTheDocument();
    expect(screen.getByText("정상 출근 (05:58~14:02)")).toBeInTheDocument();
    expect(screen.getByText("지각 출근 (06:58~14:02)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: `${monthLabel} 결근/휴가 내역 보기` }));
    expect(await screen.findByRole("dialog", { name: `${monthLabel} 결근/휴가 내역` })).toBeInTheDocument();
    expect(screen.getByText(`${monthLabel} 3일`)).toBeInTheDocument();
    expect(screen.getByText("결근")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: `${monthLabel} 결근/휴가 내역 보기` }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("lists available months newest first and updates both monthly cards when selected", async () => {
    const currentMonth = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
    }).format(new Date());
    const shiftMonth = (monthKey: string, amount: number) => {
      const date = new Date(`${monthKey}-01T00:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() + amount);
      return date.toISOString().slice(0, 7);
    };
    const previousMonth = shiftMonth(currentMonth, -1);
    const twoMonthsAgo = shiftMonth(currentMonth, -2);
    const futureMonth = shiftMonth(currentMonth, 1);
    const monthLabel = (monthKey: string) => `${Number(monthKey.slice(5, 7))}월`;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/guard/passkey-requests/me")) {
        return Response.json({ request: null });
      }
      if (url.startsWith("/api/guard/profile")) {
        return Response.json({
          schedules: [],
          monthlyAttendance: [
            { yearMonth: futureMonth, attendanceDays: 99, workHoursTotal: "999시간" },
            { yearMonth: previousMonth, attendanceDays: 4, workHoursTotal: "32시간" },
            { yearMonth: currentMonth, attendanceDays: 2, workHoursTotal: "16시간" },
            { yearMonth: twoMonthsAgo, attendanceDays: 1, workHoursTotal: "8시간" },
          ],
          attendanceDetails: [
            { workDate: `${currentMonth}-01`, status: "정상 출근", timeRange: "(09:00~18:00)" },
            { workDate: `${previousMonth}-01`, status: "정상 출근", timeRange: "(09:00~18:00)" },
          ],
          absenceDetails: [{ workDate: `${previousMonth}-02`, reason: "결근" }],
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

    const monthlySelect = await screen.findByRole("combobox", { name: "월별 출근 현황 선택" });
    expect(monthlySelect).toHaveValue(currentMonth);
    expect(Array.from(monthlySelect.querySelectorAll("option")).map((option) => option.textContent)).toEqual([
      `${monthLabel(currentMonth)} (이번 달)`,
      monthLabel(previousMonth),
      monthLabel(twoMonthsAgo),
    ]);
    expect(monthlySelect.querySelector(`option[value="${futureMonth}"]`)).not.toBeInTheDocument();

    fireEvent.change(monthlySelect, { target: { value: previousMonth } });

    const workCard = screen.getByRole("button", { name: `${monthLabel(previousMonth)} 근무 내역 보기` });
    const absenceCard = screen.getByRole("button", { name: `${monthLabel(previousMonth)} 결근/휴가 내역 보기` });
    expect(monthlySelect).toHaveValue(previousMonth);
    expect(within(workCard).getByText("4일")).toBeInTheDocument();
    expect(within(absenceCard).getByText("1일")).toBeInTheDocument();

    fireEvent.click(workCard);
    expect(await screen.findByRole("dialog", { name: `${monthLabel(previousMonth)} 근무 내역` })).toBeInTheDocument();
    expect(screen.getByText("정상 출근 (09:00~18:00)")).toBeInTheDocument();
  });

  it("hides the passkey registration section when the feature is disabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).startsWith("/api/guard/profile")) {
          return Response.json({ schedules: [], monthlyAttendance: [] });
        }
        return Response.json({}, { status: 404 });
      }),
    );
    window.sessionStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({ employee: { id: "emp-1", name: "홍길동" } }),
    );

    render(
      <PasskeyFeatureProvider enabled={false}>
        <GuardProfilePage />
      </PasskeyFeatureProvider>,
    );

    await screen.findByRole("heading", { name: "개인프로필" });
    expect(screen.queryByRole("heading", { name: "패스키등록" })).not.toBeInTheDocument();
  });

  it("places logout directly above passkey registration at the bottom", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("/api/guard/passkey-requests/me")) {
          return Response.json({ request: null });
        }
        if (url.startsWith("/api/guard/profile")) {
          return Response.json({ schedules: [], monthlyAttendance: [] });
        }
        return Response.json({}, { status: 404 });
      }),
    );
    window.localStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({ employee: { id: "emp-1", name: "Alice" }, createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() }),
    );

    render(<GuardProfilePage />);

    await screen.findByRole("heading", { name: "개인프로필" });
    const sectionHeadings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(sectionHeadings.at(-2)).toBe("로그아웃");
    expect(sectionHeadings.at(-1)).toBe("패스키등록");
  });

  it("clears the guard session and push notification state when logging out from profile", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    const getSubscription = vi.fn().mockResolvedValue({ endpoint: "https://push.example.test/current", unsubscribe });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/guard/passkey-requests/me")) {
        return Response.json({ request: null });
      }
      if (url.startsWith("/api/guard/profile")) {
        return Response.json({ schedules: [], monthlyAttendance: [] });
      }
      if (url === "/api/notifications/unsubscribe" && init?.method === "POST") {
        return Response.json({ deletedCount: 1 });
      }
      if (url === "/api/guard/session-logs/log-1/logout" && init?.method === "PATCH") {
        return Response.json({ success: true });
      }
      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          pushManager: { getSubscription },
        }),
      },
    });
    window.localStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({
        employee: { id: "emp-1", name: "Alice" },
        sessionLogId: "log-1",
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      }),
    );
    window.sessionStorage.setItem(
      "ollbareun.guard.pushRegistration",
      JSON.stringify({ employeeId: "emp-1", endpoint: "https://push.example.test/current" }),
    );

    render(<GuardProfilePage />);
    fireEvent.click(await screen.findByRole("button", { name: "내 정보 확인" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/guard"));
    expect(unsubscribe).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/notifications/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId: "emp-1", endpoint: "https://push.example.test/current" }),
    });
    expect(window.localStorage.getItem("ollbareun.guard.session")).toBeNull();
    expect(window.sessionStorage.getItem("ollbareun.guard.session")).toBeNull();
    expect(window.sessionStorage.getItem("ollbareun.guard.pushRegistration")).toBeNull();
    expect(signOut).toHaveBeenCalled();
  });

  it("shows a session message when guard session is missing", () => {
    vi.stubGlobal("fetch", vi.fn());

    render(<GuardProfilePage />);

    expect(screen.getByText("경비원 정보를 찾을 수 없습니다. 다시 로그인하세요.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("hydrates without text mismatch when a stored guard session exists on refresh", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/guard/passkey-requests/me")) {
        return Response.json({ request: null });
      }
      if (url.startsWith("/api/guard/profile")) {
        return Response.json({ schedules: [], monthlyAttendance: [] });
      }
      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const container = document.createElement("div");
    container.innerHTML = renderToString(<GuardProfilePage />);
    document.body.appendChild(container);
    window.localStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({ employee: { id: "emp-1", name: "Alice" }, createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() }),
    );

    let root: ReturnType<typeof hydrateRoot> | null = null;
    await act(async () => {
      root = hydrateRoot(container, <GuardProfilePage />);
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const errorText = consoleError.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(errorText).not.toContain("Hydration failed");

    await act(async () => {
      root?.unmount();
    });
    container.remove();
    consoleError.mockRestore();
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
    const passkeyRequestButton = await screen.findByRole("button", { name: "패스키 등록 요청" });
    await waitFor(() => expect(passkeyRequestButton).not.toBeDisabled());
    fireEvent.click(passkeyRequestButton);

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
  it("hides the screen zoom section on the profile page", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/guard/passkey-requests/me")) {
        return Response.json({ request: null });
      }
      if (url.startsWith("/api/guard/profile")) {
        return Response.json({ schedules: [], monthlyAttendance: [] });
      }
      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({ employee: { id: "emp-1", name: "Alice" }, createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() }),
    );

    render(<GuardProfilePage />);

    await screen.findByRole("heading", { level: 1 });
    const sectionHeadings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(sectionHeadings).not.toContain("화면확대축소");
    expect(screen.queryByRole("button", { name: "화면 확대" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "화면 축소" })).not.toBeInTheDocument();
  });

  it("places the font zoom section at the top and stores font zoom independently", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/guard/passkey-requests/me")) {
        return Response.json({ request: null });
      }
      if (url.startsWith("/api/guard/profile")) {
        return Response.json({ schedules: [], monthlyAttendance: [] });
      }
      return Response.json({}, { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
    window.localStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({ employee: { id: "emp-1", name: "Alice" }, createdAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() }),
    );
    window.localStorage.setItem("ollbareun.guard.zoomPercent", "125");

    render(<GuardProfilePage />);

    await screen.findByRole("heading", { level: 1 });
    const sectionHeadings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(sectionHeadings[0]).toBe("글자확대축소");
    expect(sectionHeadings).not.toContain("화면확대축소");
    expect(screen.getAllByText("100%")[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "글자 확대" }));

    expect(screen.getByText("110%")).toBeInTheDocument();
    expect(window.localStorage.getItem("ollbareun.guard.fontZoomPercent")).toBe("110");
    expect(window.localStorage.getItem("ollbareun.guard.zoomPercent")).toBe("125");

    fireEvent.click(screen.getByRole("button", { name: "글자 축소" }));

    expect(window.localStorage.getItem("ollbareun.guard.fontZoomPercent")).toBe("100");
    expect(window.localStorage.getItem("ollbareun.guard.zoomPercent")).toBe("125");
  });
});
