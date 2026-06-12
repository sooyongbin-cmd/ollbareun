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
});
