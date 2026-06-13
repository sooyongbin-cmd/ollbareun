import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  decreaseGuardZoomPercent,
  getGuardZoomPercent,
  guardZoomStorageKey,
  increaseGuardZoomPercent,
  setGuardZoomPercent,
  subscribeToGuardZoomChange,
} from "./guard-zoom";

describe("guard zoom", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("uses 100 percent as the default zoom", () => {
    expect(getGuardZoomPercent()).toBe(100);
  });

  it("normalizes unsupported stored zoom values to 100 percent", () => {
    window.localStorage.setItem(guardZoomStorageKey, "133");

    expect(getGuardZoomPercent()).toBe(100);
  });

  it("moves zoom up and down through supported Chrome-like steps", () => {
    expect(increaseGuardZoomPercent(100)).toBe(110);
    expect(decreaseGuardZoomPercent(100)).toBe(90);
  });

  it("keeps zoom within the minimum and maximum supported values", () => {
    expect(decreaseGuardZoomPercent(80)).toBe(80);
    expect(increaseGuardZoomPercent(200)).toBe(200);
  });

  it("stores the selected zoom and notifies same-tab subscribers", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeToGuardZoomChange(onChange);

    setGuardZoomPercent(125);

    expect(window.localStorage.getItem(guardZoomStorageKey)).toBe("125");
    expect(getGuardZoomPercent()).toBe(125);
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
