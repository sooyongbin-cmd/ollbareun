import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerLayout from "../../layout";
import ManagerPage from "../../page";
import AssignmentManagementPage from "./page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

function renderWithManagerLayout(ui: ReactElement) {
  return render(<ManagerLayout>{ui}</ManagerLayout>);
}

describe("assignment management page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    push.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/assignments")) {
          return Response.json({
            assignments: [
              {
                id: "assign-1",
                work_date: "2026-05-21",
                employee_name: "근태수",
                worksite_name: "본사",
              },
              {
                id: "assign-2",
                work_date: "2026-05-20",
                employee_name: "홍길동",
                worksite_name: "서울지점",
              },
            ],
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders assignment management, supports filtering, and opens edit page", async () => {
    const user = userEvent.setup();

    renderWithManagerLayout(<AssignmentManagementPage />);

    expect(await screen.findByRole("heading", { name: "근무지배정" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "배정하기" })).toHaveAttribute(
      "href",
      "/manager/employee/assignments/new",
    );

    const row = await screen.findByRole("link", { name: "근태수" });
    expect(within(row).getByText("2026-05-21")).toBeInTheDocument();
    expect(within(row).getByText("본사")).toBeInTheDocument();

    await user.type(screen.getByLabelText("이름"), "홍길동");
    expect(await screen.findByRole("link", { name: "홍길동" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "근태수" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "홍길동" }));
    expect(push).toHaveBeenCalledWith("/manager/employee/assignments/save/assign-2");
  });

  it("exposes assignment management from the manager menu", () => {
    renderWithManagerLayout(<ManagerPage />);

    expect(screen.getByRole("link", { name: "근무지배정" })).toHaveAttribute(
      "href",
      "/manager/employee/assignments",
    );
  });
});
