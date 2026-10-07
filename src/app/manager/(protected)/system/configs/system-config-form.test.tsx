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
  it("places save before delete on the edit screen", () => {
    render(<SystemConfigForm mode="edit" initialConfig={{ system_code: "S000001", parent_system_code: null, description: "대기시간", content: "30" }} />);
    expect(screen.getAllByRole("button").map((button) => button.textContent)).toEqual(["저장", "삭제", "목록"]);
  });
  it("hides system code and category fields while creating a config", () => {
    render(<SystemConfigForm mode="create" />);

    const fields = screen.getAllByRole("textbox");

    expect(fields).toEqual([
      screen.getByLabelText("설명"),
      screen.getByLabelText("내용"),
    ]);
    expect(screen.queryByLabelText("시스템코드")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("분류")).not.toBeInTheDocument();
  });
});
