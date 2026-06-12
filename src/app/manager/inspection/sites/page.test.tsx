import { render, screen, waitFor } from "@testing-library/react";
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
                worksite_name: "본사",
                name: "정문",
                address: "서울시 중구 세종대로 1",
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

    await user.type(screen.getByLabelText("현장이름"), "정문");
    await user.click(screen.getByRole("button", { name: "조회" }));

    expect(await screen.findByText("정문")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "정문" })).toHaveAttribute(
      "href",
      "/manager/inspection/sites/site-1",
    );
    await waitFor(() => {
      expect(fetch).toHaveBeenLastCalledWith("/api/inspection/sites?name=%EC%A0%95%EB%AC%B8");
    });
  });
});
