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
  it("places content before description", () => {
    render(<SystemConfigForm mode="create" />);

    const content = screen.getByLabelText("내용");
    const description = screen.getByLabelText("설명");

    expect(content.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
