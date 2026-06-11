import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SystemConfigsPage from "./page";

describe("system configs page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          configs: [
            {
              system_code: "manager_email",
              parent_system_code: null,
              content: "admin@example.com",
            },
          ],
        }),
      ),
    );
  });

  it("lists system configs and links create/edit screens", async () => {
    render(<SystemConfigsPage />);

    expect(await screen.findByRole("heading", { name: "시스템설정" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "등록" })).toHaveAttribute("href", "/manager/system/configs/new");
    expect(screen.getByRole("link", { name: "manager_email" })).toHaveAttribute(
      "href",
      "/manager/system/configs/manager_email",
    );
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });
});
