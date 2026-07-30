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
              description: "Manager notification email address",
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
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "설명",
      "내용",
      "시스템코드",
      "상위시스템코드",
    ]);
    expect(await screen.findByRole("link", { name: "Manager notification email address" })).toHaveAttribute(
      "href",
      "/manager/system/configs/manager_email",
    );
    expect(screen.getByText("manager_email")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });
});
