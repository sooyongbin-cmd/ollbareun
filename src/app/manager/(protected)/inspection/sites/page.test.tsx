import { render, screen, waitFor, within } from "@testing-library/react";
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
        if (url.startsWith("/api/inspection/sites")) {
          return Response.json({
            sites: [
              {
                id: "site-1",
                worksite_id: "work-1",
                worksite_name: "Worksite",
                name: "Gate",
                address: "Seoul",
                gps_info: { latitude: 37.5, longitude: 127 },
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

    expect(screen.getByRole("heading", { name: "현장관리" })).toBeInTheDocument();
    expect(screen.getByLabelText("현장이름")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "현장등록" })).toHaveAttribute(
      "href",
      "/manager/inspection/sites/new",
    );

    await user.type(screen.getByLabelText("현장이름"), "Gate");
    await user.click(screen.getByRole("button", { name: "조회" }));

    expect(await screen.findByText("Gate")).toBeInTheDocument();
    const dataRow = screen.getAllByRole("row")[1];
    const cells = within(dataRow).getAllByRole("cell");
    expect(cells.map((cell) => cell.textContent)).toEqual(["Worksite", "Gate", "Seoul"]);
    expect(screen.getByRole("link", { name: "Gate" })).toHaveAttribute(
      "href",
      "/manager/inspection/sites/site-1",
    );
    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith("/api/inspection/sites?name=Gate");
    });
  });

  it("sorts sites by worksite (descending) then site name (descending)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("/api/inspection/sites")) {
          return Response.json({
            sites: [
              { id: "s-1", worksite_name: "강남빌딩", name: "101동", address: "A" },
              { id: "s-2", worksite_name: "홍대타워", name: "정문", address: "B" },
              { id: "s-3", worksite_name: "강남빌딩", name: "102동", address: "C" },
              { id: "s-4", worksite_name: "홍대타워", name: "후문", address: "D" },
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
      return `${cells[0].textContent} - ${cells[1].textContent}`;
    });

    expect(renderedNames).toEqual([
      "홍대타워 - 후문",
      "홍대타워 - 정문",
      "강남빌딩 - 102동",
      "강남빌딩 - 101동",
    ]);
  });
});
