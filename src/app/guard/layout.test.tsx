import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GuardLayout from "./layout";
import { guardFontZoomStorageKey, guardZoomStorageKey } from "./guard-zoom";

vi.mock("./guard-install-prompt", () => ({
  default: () => <div data-testid="guard-install-prompt" />,
}));

vi.mock("./in-app-browser-checker", () => ({
  default: () => <div data-testid="in-app-browser-checker" />,
}));

describe("guard layout zoom scope", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("wraps all guard content in the zoom scope", () => {
    render(
      <GuardLayout>
        <main>Guard child</main>
      </GuardLayout>,
    );

    const scope = screen.getByTestId("guard-zoom-scope");
    expect(scope).toHaveClass("guard-zoom-scope");
    expect(scope).toHaveClass("guard-font-scale");
    expect(scope).toHaveStyle({ "--guard-zoom-scale": "1" });
    expect(scope).toHaveStyle({ "--guard-font-scale": "1" });
    expect(screen.getByText("Guard child")).toBeInTheDocument();
    expect(screen.getByTestId("guard-install-prompt")).toBeInTheDocument();
    expect(screen.getByTestId("in-app-browser-checker")).toBeInTheDocument();
  });

  it("applies the stored guard zoom scale", () => {
    window.localStorage.setItem(guardZoomStorageKey, "125");

    render(
      <GuardLayout>
        <main>Guard child</main>
      </GuardLayout>,
    );

    expect(screen.getByTestId("guard-zoom-scope")).toHaveStyle({ "--guard-zoom-scale": "1.25" });
  });

  it("applies the stored guard font zoom scale independently from screen zoom", () => {
    window.localStorage.setItem(guardZoomStorageKey, "110");
    window.localStorage.setItem(guardFontZoomStorageKey, "125");

    render(
      <GuardLayout>
        <main>Guard child</main>
      </GuardLayout>,
    );

    expect(screen.getByTestId("guard-zoom-scope")).toHaveStyle({
      "--guard-zoom-scale": "1.1",
      "--guard-font-scale": "1.25",
    });
  });
});
