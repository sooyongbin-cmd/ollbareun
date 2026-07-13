import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ManagerRootLayout, { metadata } from "./layout";

describe("manager root layout", () => {
  it("links only the manager manifest", () => {
    expect(metadata.manifest).toBe("/manager/manifest.webmanifest");
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
