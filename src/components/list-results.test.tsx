import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ListResults from "./list-results";
import { downloadListWorkbook } from "@/lib/list-export";
vi.mock("@/lib/list-export", async (original) => ({ ...await original<typeof import("@/lib/list-export")>(), downloadListWorkbook: vi.fn() }));
afterEach(() => vi.clearAllMocks());
it("places Excel after the count and exports only its own list and the page filters", async () => {
  render(<main><h1>근태관리</h1><section><label htmlFor="name">직원이름</label><input id="name" placeholder="전체직원" /></section>
    <section aria-label="첫 목록"><ListResults count={1} /><table><thead><tr><th>이름</th></tr></thead><tbody><tr><td>홍길동</td></tr></tbody></table></section>
    <section aria-label="둘째 목록"><ListResults count={1} /><table><thead><tr><th>이름</th></tr></thead><tbody><tr><td>김철수</td></tr></tbody></table></section></main>);
  fireEvent.click(within(screen.getByRole("region", { name: "둘째 목록" })).getByRole("button", { name: "엑셀" }));
  await waitFor(() => expect(downloadListWorkbook).toHaveBeenCalledOnce());
  const input = vi.mocked(downloadListWorkbook).mock.calls[0][0];
  expect(input.title).toBe("근태관리");
  expect(input.filters).toEqual([{ label: "직원이름", value: "전체직원" }]);
  expect(await input.getTable()).toEqual({ headers: ["이름"], rows: [["김철수"]] });
});
it("disables export for empty and loading results", () => {
  const { rerender } = render(<ListResults count={0} />);
  expect(screen.getByRole("button", { name: "엑셀" })).toBeDisabled();
  rerender(<ListResults count={3} disabled />);
  expect(screen.getByRole("button", { name: "엑셀" })).toBeDisabled();
});
