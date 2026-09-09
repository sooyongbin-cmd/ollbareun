import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManagerRootLayout, { metadata } from "./layout";

vi.mock("@/lib/system-configs", () => ({
  getManagerTheme: vi.fn().mockResolvedValue("system"),
}));

describe("manager root layout", () => {
  it("links the manager manifest, sets title and favicon icon", () => {
    expect(metadata.title).toBe("주식회사 올바름");
    expect(metadata.manifest).toBe("/manager/manifest.webmanifest");
    expect(metadata.icons).toEqual({ icon: "/manager-icon.ico" });
  });

  it("renders manager routes inside the manager theme scope", async () => {
    render(
      await ManagerRootLayout({
        children: (
          <main>Manager child</main>
        ),
      }),
    );

    expect(screen.getByText("Manager child")).toBeInTheDocument();
    expect(screen.getByText("Manager child").parentElement).toHaveAttribute(
      "data-theme",
      "system",
    );
  });
});
