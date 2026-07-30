import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ManagerRootLayout, { metadata } from "./layout";

describe("manager root layout", () => {
  it("links the manager manifest, sets title and favicon icon", () => {
    expect(metadata.title).toBe("(주)올바름 관리자");
    expect(metadata.manifest).toBe("/manager/manifest.webmanifest");
    expect(metadata.icons).toEqual({ icon: "/manager-icon.ico" });
  });

  it("renders manager routes", () => {
    render(
      <ManagerRootLayout>
        <main>Manager child</main>
      </ManagerRootLayout>,
    );

    expect(screen.getByText("Manager child")).toBeInTheDocument();
  });
});
