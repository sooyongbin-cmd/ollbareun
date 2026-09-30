import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GuardLeavePage from "./page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("guard leave application", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    push.mockReset();
    fetchMock = vi.fn(async (_url: string, init?: RequestInit) => init?.method === "POST"
      ? Response.json({ leave: { id: "leave-1" }, delivery: { successCount: 1, failedCount: 0, unregisteredCount: 0 } }, { status: 201 })
      : Response.json({ types: ["연차", "월차", "경조휴가"] }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("defaults both dates to tomorrow in Korea and selects monthly leave regardless of option order", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-12-31T15:05:00Z"));
    render(<GuardLeavePage />);
    expect(await screen.findByLabelText("시작일")).toHaveValue("2027-01-02");
    expect(screen.getByLabelText("종료일")).toHaveValue("2027-01-02");
    expect(screen.getByLabelText("휴가구분")).toHaveValue("월차");
    expect(screen.getByRole("option", { name: "경조휴가" })).toHaveValue("경조휴가");
    expect(screen.getByRole("button", { name: "휴가신청" })).toHaveClass("w-full", "guard-general-button");
    expect(screen.queryByText(/완료 \(/)).not.toBeInTheDocument();
  });

  it.each([
    ["2026-10-01", "날짜 (2026-10-01) 에 휴가신청을 하시겠습니까?"],
    ["2026-10-03", "기간 (2026-10-01~2026-10-03) 에 휴가신청을 하시겠습니까?"],
  ])("confirms dates before saving %s and sends the configured text", async (endDate, confirmation) => {
    const user = userEvent.setup();
    render(<GuardLeavePage />);
    fireEvent.change(await screen.findByLabelText("시작일"), { target: { value: "2026-10-01" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: endDate } });
    await user.selectOptions(screen.getByLabelText("휴가구분"), "경조휴가");
    await user.click(screen.getByRole("button", { name: "휴가신청" }));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText(confirmation)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(within(dialog).getByRole("button", { name: "예" }));
    await screen.findByText("휴가신청이 완료되었으며 관리자에게 푸시알림을 전송했습니다.");
    const submit = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(submit?.[1]?.body as string)).toEqual({ startDate: "2026-10-01", endDate, leaveType: "경조휴가" });
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(push).toHaveBeenCalledWith("/guard/main");
  });

  it("cancels without saving and rejects a reversed period", async () => {
    const user = userEvent.setup();
    render(<GuardLeavePage />);
    await screen.findByLabelText("시작일");
    await user.click(screen.getByRole("button", { name: "휴가신청" }));
    await user.click(screen.getByRole("button", { name: "아니오" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: "2026-10-03" } });
    fireEvent.change(screen.getByLabelText("종료일"), { target: { value: "2026-10-01" } });
    await user.click(screen.getByRole("button", { name: "휴가신청" }));
    expect(screen.getByRole("alert")).toHaveTextContent("종료일은 시작일보다 빠를 수 없습니다.");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("shows a saved result when push fails and prevents another submission", async () => {
    const user = userEvent.setup();
    render(<GuardLeavePage />);
    await screen.findByLabelText("시작일");
    fetchMock.mockResolvedValueOnce(Response.json({ leave: { id: "leave-1" }, delivery: { error: "푸시 실패" } }, { status: 201 }));
    await user.click(screen.getByRole("button", { name: "휴가신청" }));
    await user.click(screen.getByRole("button", { name: "예" }));
    await waitFor(() => expect(screen.getByText(/관리자 푸시알림을 전달하지 못했지만 신청 내역은 저장되었습니다/)).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
