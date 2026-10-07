import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DataManagePage from "./page";
import { emptyYearDataCounts } from "@/lib/year-data-types";
import { managerNavigationGroups } from "../../manager-navigation";

describe("annual data management screen", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("places the new system link immediately below system settings", () => {
    const items = managerNavigationGroups.find((group) => group.label === "시스템")!.items;
    const index = items.findIndex((item) => item.href === "/manager/system/configs");
    expect(items[index + 1]).toMatchObject({ label: "자료관리", href: "/manager/system/data-manage" });
  });
  it("requires both confirmations and refreshes the year list after deletion", async () => {
    const summary = { years: [2025, 2026], year: 2026, counts: { ...emptyYearDataCounts, work_record: 1250 } };
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => summary })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ deleted: summary.counts }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...summary, years: [2025], year: 2025 }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<DataManagePage />);
    expect(await screen.findByText("1,250")).toBeInTheDocument();
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["2025", "2026"]);
    fireEvent.click(screen.getByRole("button", { name: "자료삭제" }));
    expect(screen.getByText("2026 년도의 자료를 삭제하시겠습니까?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "예" }));
    expect(screen.getByText("자료를 삭제하면 복구할 수 없습니다. 2026 년도의 자료를 삭제하시겠습니까?")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "예" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ year: 2026, confirmed: true });
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
    expect(await screen.findByText("2026 년도의 자료를 삭제했습니다.")).toBeInTheDocument();
  });
  it("does not delete if the second confirmation is cancelled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ years: [2026], year: 2026, counts: emptyYearDataCounts }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<DataManagePage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "자료삭제" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "자료삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "예" }));
    fireEvent.click(screen.getByRole("button", { name: "아니오" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
