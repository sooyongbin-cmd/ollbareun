import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HolidayNewPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("holiday new page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/api/manager/holidays")) {
          expect(init?.method).toBe("POST");
          expect(JSON.parse(String(init?.body))).toEqual({
            holiday_date: "2026-10-03",
            name: "개천절",
          });
          return Response.json({ inserted: 1 }, { status: 201 });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("saves the holiday name and date", async () => {
    const user = userEvent.setup();

    render(<HolidayNewPage />);

    expect(screen.getByRole("heading", { name: "휴일추가" })).toBeInTheDocument();
    expect(screen.getByLabelText("휴일명")).toHaveAttribute("placeholder", "휴일명을 입력하세요.");
    await user.type(screen.getByLabelText("휴일명"), "개천절");
    await user.type(screen.getByLabelText("날짜"), "2026-10-03");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(push).toHaveBeenCalledWith("/manager/employee/holidays");
  });
});
