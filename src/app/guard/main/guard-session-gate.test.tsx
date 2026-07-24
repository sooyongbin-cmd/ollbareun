import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardSessionGate from "./guard-session-gate";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

describe("GuardSessionGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("keeps and refreshes an active durable session", async () => {
    window.localStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({
        employee: { id: "employee-1", name: "이전 이름" },
        sessionLogId: "log-1",
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            session: {
              employee: { id: "employee-1", name: "홍길동" },
              assignment: null,
              worksite: null,
              attendance: null,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    render(<GuardSessionGate />);

    await waitFor(() => {
      const session = JSON.parse(
        window.localStorage.getItem("ollbareun.guard.session") ?? "{}",
      );
      expect(session.employee.name).toBe("홍길동");
      expect(session.sessionLogId).toBe("log-1");
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("clears a revoked employee session", async () => {
    window.localStorage.setItem(
      "ollbareun.guard.session",
      JSON.stringify({ employee: { id: "employee-1" } }),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));

    render(<GuardSessionGate />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/guard"));
    expect(window.localStorage.getItem("ollbareun.guard.session")).toBeNull();
  });
});
