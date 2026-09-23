import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SystemConfigForm from "./system-config-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("system config form", () => {
  it("shows fields in description, content, system code, and category order", () => {
    render(<SystemConfigForm mode="create" />);

    const fields = screen.getAllByRole("textbox");

    expect(fields).toEqual([
      screen.getByLabelText("설명"),
      screen.getByLabelText("내용"),
      screen.getByLabelText("시스템코드"),
      screen.getByLabelText("분류"),
    ]);
    expect(screen.getByLabelText("분류")).toHaveValue("");
  });
});
