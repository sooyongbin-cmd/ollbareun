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
    const contentHeader = screen.getByRole("columnheader", { name: "내용" });
    const descriptionHeader = screen.getByRole("columnheader", { name: "설명" });
    expect(contentHeader.compareDocumentPosition(descriptionHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(await screen.findByRole("link", { name: "manager_email" })).toHaveAttribute(
      "href",
      "/manager/system/configs/manager_email",
    );
    expect(screen.getByText("Manager notification email address")).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });
});
