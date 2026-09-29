import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEducationRefresh } from "./use-education-refresh";
import { notifyEducationChanged } from "./education-periods";
afterEach(() => vi.useRealTimers());
describe("education status refresh", () => {
  it("refreshes at KST midnight and after a completion, and removes timers on unmount", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-29T14:59:59Z"));
    const hook = renderHook(() => useEducationRefresh());
    expect(hook.result.current).toBe(0);
    act(() => vi.advanceTimersByTime(1000));
    expect(hook.result.current).toBe(1);
    act(() => notifyEducationChanged());
    expect(hook.result.current).toBe(2);
    hook.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
