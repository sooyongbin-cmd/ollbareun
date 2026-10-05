import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InspectionSitesPage from "./page";

describe("inspection sites page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/bootstrap")) {
          return Response.json({ worksites: [{ id: "work-1", name: "Worksite" }] });
        }
        if (url === "/api/inspection/sites/swap-order") {
          return Response.json({ success: true });
        }
        if (url.startsWith("/api/inspection/sites")) {
          return Response.json({
            sites: [
              {
                id: "site-1",
                worksite_id: "work-1",
                worksite_name: "Worksite",
                sort_order: 1,
                name: "Gate",
                today_inspection: {
                  inspected_at: "2026-06-04T00:00:00+00:00",
                  employee_name: "Alice",
                  employee_role: "경비원",
                },
              },
            ],
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
  });

  it("shows search controls, registration link, and site names", async () => {
    const user = userEvent.setup();
    render(<InspectionSitesPage />);

    expect(screen.getByRole("heading", { name: "점검지관리" })).toBeInTheDocument();
    expect(screen.getByLabelText("근무지")).toHaveAttribute("list", "inspection-worksite-options");
    expect(screen.getByLabelText("점검지")).toHaveAttribute("list", "inspection-site-options");
    expect(screen.getByRole("link", { name: "점검지 등록" })).toHaveAttribute(
      "href",
      "/manager/inspection/sites/new",
    );

    await waitFor(() => {
      expect(document.querySelector('#inspection-worksite-options option[value="Worksite"]')).not.toBeNull();
    });
    await user.type(screen.getByLabelText("근무지"), "Worksite");
    await user.type(screen.getByLabelText("점검지"), "Gate");
    await user.click(screen.getByRole("button", { name: "조회" }));

    expect(await screen.findByText("Gate")).toBeInTheDocument();
    const dataRow = screen.getAllByRole("row")[1];
    const cells = within(dataRow).getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent)).toEqual(["Worksite", "1", "Gate", "09:00", "Alice", "경비원"]);
    expect(screen.getByRole("link", { name: "Gate" })).toHaveAttribute(
      "href",
      "/manager/inspection/sites/site-1",
    );
    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith("/api/inspection/sites?worksiteId=work-1&name=Gate");
    });
  });

  it("sorts sites by worksite (ascending) then sort order (ascending)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/bootstrap")) {
          return Response.json({ worksites: [] });
        }
        if (url.startsWith("/api/inspection/sites")) {
          return Response.json({
            sites: [
              { id: "s-1", worksite_name: "강남빌딩", sort_order: 2, name: "101동" },
              { id: "s-2", worksite_name: "홍대타워", sort_order: 1, name: "정문" },
              { id: "s-3", worksite_name: "강남빌딩", sort_order: 1, name: "102동" },
              { id: "s-4", worksite_name: "홍대타워", sort_order: 2, name: "후문" },
            ],
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );

    render(<InspectionSitesPage />);

    expect(await screen.findByText("후문")).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    const renderedNames = rows.map((row) => {
      const cells = within(row).getAllByRole("cell");
      return `${cells[0].textContent} - ${cells[2].textContent}`;
    });

    expect(renderedNames).toEqual([
      "강남빌딩 - 102동",
      "강남빌딩 - 101동",
      "홍대타워 - 정문",
      "홍대타워 - 후문",
    ]);
  });

  it("swaps inspection order when a site name is dragged onto another site", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/inspection/sites/swap-order" && init?.method === "POST") {
        return Response.json({ success: true });
      }
      return Response.json({
        sites: [
          { id: "s-1", worksite_id: "work-1", worksite_name: "Worksite", sort_order: 1, name: "101동" },
          { id: "s-2", worksite_id: "work-1", worksite_name: "Worksite", sort_order: 2, name: "102동" },
        ],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<InspectionSitesPage />);

    const sourceName = await screen.findByText("102동");
    const targetRow = screen.getByText("101동").closest("tr");
    expect(targetRow).not.toBeNull();
    fireEvent.dragStart(sourceName, { dataTransfer: { effectAllowed: "move", setData: vi.fn() } });
    fireEvent.dragOver(targetRow!, { preventDefault: vi.fn() });
    fireEvent.drop(targetRow!, { preventDefault: vi.fn() });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/inspection/sites/swap-order",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ draggedSiteId: "s-2", targetSiteId: "s-1" }) }),
    ));
    expect(screen.getByRole("columnheader", { name: "순서" })).toBeInTheDocument();
  });
  it("leaves today's inspection columns blank when a site has no inspection", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/api/bootstrap")) {
          return Response.json({ worksites: [] });
        }
        if (String(input).startsWith("/api/inspection/sites")) {
          return Response.json({
            sites: [{ id: "site-1", worksite_name: "Worksite", name: "Gate" }],
          });
        }
        return Response.json({}, { status: 404 });
      }),
    );
    render(<InspectionSitesPage />);

    expect(await screen.findByText("Gate")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "현장주소" })).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "점검시각" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "점검자" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "직군" })).toBeInTheDocument();
    const dataRow = screen.getAllByRole("row")[1];
    const cells = within(dataRow).getAllByRole("cell");

    expect(cells.map((cell) => cell.textContent)).toEqual(["Worksite", "", "Gate", "", "", ""]);
  });
});
