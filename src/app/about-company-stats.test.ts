import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const script = readFileSync(resolve("public/about-company-stats.js"), "utf8");

function mountCounter(reducedMotion = false) {
  let enterView: () => void;
  let nextFrame: FrameRequestCallback;
  class Observer {
    constructor(callback: (entries: object[], observer: Observer) => void) {
      enterView = () => callback([{ isIntersecting: true, intersectionRatio: 1 }], this);
    }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal("IntersectionObserver", Observer);
  vi.stubGlobal("matchMedia", () => ({ matches: reducedMotion }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    nextFrame = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  document.body.innerHTML = '<strong><olbareum-stat-value data-value="10.3" data-suffix="억">10.3억</olbareum-stat-value></strong>';
  window.eval(script);
  const value = document.querySelector("olbareum-stat-value")!;
  return { value, enter: () => enterView(), frame: (time: number) => nextFrame(time) };
}

afterEach(() => {
  document.body.textContent = "";
  vi.unstubAllGlobals();
});

describe("company statistics", () => {
  it("keeps the final label in the HTML and counts in tenths only while visible", () => {
    const { value, enter, frame } = mountCounter();
    expect(value.textContent).toBe("10.3억");
    expect(value.shadowRoot).toBeNull();
    enter();
    frame(0);
    expect(value.shadowRoot?.textContent).toBe("0.0억");
    frame(700);
    expect(value.shadowRoot?.textContent).toBe("9.0억");
    expect(value.textContent).toBe("10.3억");
    frame(1400);
    expect(value.shadowRoot?.querySelector("slot")?.assignedNodes()[0].textContent).toBe("10.3억");
  });

  it("shows the final value immediately with reduced motion", () => {
    const { value } = mountCounter(true);
    expect(value.textContent).toBe("10.3억");
    expect(value.shadowRoot).toBeNull();
  });
});
