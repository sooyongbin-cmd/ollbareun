import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SystemConfigForm from "./system-config-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("system config form", () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(["", "N", "invalid"])("defaults notification window buttons to N for %s", (content) => {
    render(<SystemConfigForm mode="edit" initialConfig={{ system_code: "S000002", parent_system_code: null, description: "알림 새 창", content }} />);
    expect(screen.queryByRole("textbox", { name: "내용" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "N", pressed: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Y", pressed: false })).toBeInTheDocument();
  });

  it("preserves Y and saves the selected N only after clicking save", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    render(<SystemConfigForm mode="edit" initialConfig={{ system_code: "S000002", parent_system_code: null, description: "알림 새 창", content: "Y" }} />);
    expect(screen.getByRole("button", { name: "Y", pressed: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "N" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "N", pressed: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/system/configs/S000002");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).content).toBe("N");
  });

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
