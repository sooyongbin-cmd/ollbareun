import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useState } from "react";
import { usePartialDetailUpdate } from "./partial-detail-update";
import type { DetailChange } from "@/lib/detail-changes";

const change: DetailChange = { entity: "attendance", id: "one", action: "invalidate", employeeId: "employee-1" };

it("retains existing data on failure and retries the exact pending changes", async () => {
  const request = vi.fn().mockRejectedValueOnce(new Error("일시 오류")).mockResolvedValueOnce("갱신됨");
  const { result } = renderHook(() => {
    const [row, setRow] = useState("기존 행");
    return { row, ...usePartialDetailUpdate(async (changes, commit) => {
      const value = await request(changes);
      commit(() => setRow(value));
    }) };
  });
  act(() => result.current.onSaved([change]));
  await waitFor(() => expect(result.current.error).toBe("일시 오류"));
  expect(result.current.row).toBe("기존 행");
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.row).toBe("갱신됨"));
  expect(request.mock.calls[0][0]).toMatchObject([change]);
  expect(request.mock.calls[1]).toEqual(request.mock.calls[0]);
  expect(result.current.error).toBe("");
});

it("ignores stale responses after a filter change", async () => {
  let resolve!: (value: string) => void;
  const request = new Promise<string>((done) => { resolve = done; });
  const { result, rerender } = renderHook(({ month }) => {
    const [row, setRow] = useState("기존 행");
    return { row, ...usePartialDetailUpdate(async (_changes, commit) => {
      const value = await request;
      commit(() => setRow(value));
    }, month) };
  }, { initialProps: { month: "2026-10" } });
  act(() => result.current.onSaved([change]));
  rerender({ month: "2026-11" });
  await act(async () => { resolve("이전 월의 응답"); });
  expect(result.current.row).toBe("기존 행");
});

it("keeps pending IDs from overlapping updates and ignores the older response", async () => {
  const resolvers: ((value: string) => void)[] = [];
  const request = vi.fn(() => new Promise<string>((resolve) => { resolvers.push(resolve); }));
  const { result } = renderHook(() => {
    const [row, setRow] = useState("기존 행");
    return { row, ...usePartialDetailUpdate(async (_changes, commit) => {
      const value = await request();
      commit(() => setRow(value));
    }) };
  });
  act(() => result.current.onSaved([change]));
  act(() => result.current.onSaved([{ ...change, id: "two" }]));
  await act(async () => { resolvers[1]("최신 응답"); });
  await act(async () => { resolvers[0]("오래된 응답"); });
  expect(result.current.row).toBe("최신 응답");
});
