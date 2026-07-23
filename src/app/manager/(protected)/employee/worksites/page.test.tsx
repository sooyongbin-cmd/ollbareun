import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ManagerLayout from "../../layout";
import ManagerPage from "../../page";
import WorksiteManagementPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/manager/employee/worksites",
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
                gps_info: { latitude: 37.5, longitude: 127.0 },
                radius_meters: 100,
              },
              {
                id: "work-2",
                name: "서울지점",
                gps_info: { latitude: 37.45, longitude: 126.97 },
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

    expect(screen.getByRole("columnheader", { name: "GPS정보" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "위도" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "경도" })).not.toBeInTheDocument();
    expect(screen.getByText("37.500000, 127.000000")).toBeInTheDocument();
    expect(screen.getByText("100m")).toBeInTheDocument();

    await user.type(screen.getByRole("textbox"), "서울");
    expect(await screen.findByText("서울지점")).toBeInTheDocument();
    expect(screen.queryByText("본사")).not.toBeInTheDocument();
  });

  it("separates worksite search controls from the worksite list section", async () => {
    renderWithManagerLayout(<WorksiteManagementPage />);

    const searchSection = await screen.findByRole("region", { name: "근무지 검색" });
    const listSection = await screen.findByRole("region", { name: "근무지 목록" });

    expect(searchSection).toContainElement(screen.getByLabelText("근무지"));
    expect(searchSection).toContainElement(screen.getByRole("link", { name: "근무지 등록" }));
    expect(listSection).toContainElement(screen.getByText("전체 근무지 2"));
    expect(listSection).toContainElement(screen.getByText("검색 결과 2"));
    expect(listSection).toContainElement(screen.getByRole("table"));
  });

  it("exposes the worksite management route from the manager menu", () => {
    renderWithManagerLayout(<ManagerPage />);

    expect(screen.getByRole("link", { name: "근무지관리" })).toHaveAttribute(
      "href",
      "/manager/employee/worksites",
    );
  });

  it("sorts worksites by name and radius", async () => {
    const user = userEvent.setup();

    renderWithManagerLayout(<WorksiteManagementPage />);

    // Wait for rows to load
    await screen.findAllByRole("row");

    // Default order should be name ASC: 본사, 서울지점
    const rows = screen.getAllByRole("row");
    expect(within(rows[1]).getByText("본사")).toBeInTheDocument();
    expect(within(rows[2]).getByText("서울지점")).toBeInTheDocument();

    // Click "근무지명" to sort DESC: 서울지점 first, then 본사
    const nameHeader = screen.getByRole("columnheader", { name: "근무지명" });
    await user.click(nameHeader);

    const updatedRows = screen.getAllByRole("row");
    expect(within(updatedRows[1]).getByText("서울지점")).toBeInTheDocument();
    expect(within(updatedRows[2]).getByText("본사")).toBeInTheDocument();

    // Click "허용반경" to sort ASC: 100m first, then 120m
    const radiusHeader = screen.getByRole("columnheader", { name: "허용반경" });
    await user.click(radiusHeader);

    const updatedRows2 = screen.getAllByRole("row");
    expect(within(updatedRows2[1]).getByText("100m")).toBeInTheDocument();
    expect(within(updatedRows2[2]).getByText("120m")).toBeInTheDocument();
  });
});
