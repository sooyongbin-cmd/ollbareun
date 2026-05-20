import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerLayout from "../../layout";
import ManagerPage from "../../page";
import WorksiteManagementPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function renderWithManagerLayout(ui: ReactElement) {
  return render(<ManagerLayout>{ui}</ManagerLayout>);
}

describe("worksite management page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/bootstrap")) {
          return Response.json({
            worksites: [
              {
                id: "work-1",
                name: "본사",
                latitude: 37.5,
                longitude: 127.0,
                radius_meters: 100,
              },
              {
                id: "work-2",
                name: "서울지점",
                latitude: 37.45,
                longitude: 126.97,
                radius_meters: 120,
              },
            ],
            assignments: [
              { worksite_id: "work-1" },
              { worksite_id: "work-1" },
              { worksite_id: "work-2" },
            ],
            employees: [],
            attendance: [],
            summary: { totalEmployees: 0, currentlyClockedIn: 0 },
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("renders worksite management and supports search", async () => {
    const user = userEvent.setup();

    renderWithManagerLayout(<WorksiteManagementPage />);

    expect(await screen.findByRole("heading", { name: "근무지관리" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "근무지 등록" })).toHaveAttribute(
      "href",
      "/manager/employee/worksites/new",
    );

    const worksiteNameLink = await screen.findByRole("link", { name: "본사" });
    expect(worksiteNameLink).toHaveAttribute("href", "/manager/employee/worksites/save/work-1");
    const assignmentLink = screen.getByRole("link", { name: "2" });
    expect(assignmentLink).toHaveAttribute("href");
    expect(
      decodeURIComponent(
        new URL(assignmentLink.getAttribute("href") ?? "", "http://localhost").searchParams.get("worksite") ?? "",
      ),
    ).toBe("본사");

    expect(screen.getByText("37.5")).toBeInTheDocument();
    expect(screen.getByText("127")).toBeInTheDocument();
    expect(screen.getByText("100m")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox"), "서울");
    expect(await screen.findByText("서울지점")).toBeInTheDocument();
    expect(screen.queryByText("본사")).not.toBeInTheDocument();
  });

  it("exposes the worksite management route from the manager menu", () => {
    renderWithManagerLayout(<ManagerPage />);

    expect(screen.getByRole("link", { name: "근무지관리" })).toHaveAttribute(
      "href",
      "/manager/employee/worksites",
    );
  });
});
