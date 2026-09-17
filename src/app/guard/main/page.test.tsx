import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GuardMainPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("guard main shortcuts", () => {
  it("uses the same destinations as the footer inspection links", () => {
    render(<GuardMainPage />);

    expect(screen.getByRole("link", { name: "순찰" })).toHaveAttribute(
      "href",
      "/guard/main/work",
    );
    expect(screen.getByRole("link", { name: "특이사항 보고" })).toHaveAttribute(
      "href",
      "/guard/main/special-remarks",
    );
  });
});
