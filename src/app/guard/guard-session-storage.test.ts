import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearStoredGuardSession,
  guardSessionStorageKey,
  hasActiveStoredGuardSession,
  readStoredGuardSession,
  touchStoredGuardSession,
  writeStoredGuardSession,
} from "./guard-session-storage";

const session = {
  employee: { id: "employee-1", name: "Guard" },
  attendance: null,
};

describe("guard session storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it("stores guard sessions in localStorage with activity timestamps", () => {
    vi.setSystemTime(new Date("2026-06-12T00:00:00.000Z"));

    writeStoredGuardSession(session);

    expect(window.sessionStorage.getItem(guardSessionStorageKey)).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(guardSessionStorageKey) ?? "{}")).toMatchObject({
      employee: { id: "employee-1" },
      createdAt: "2026-06-12T00:00:00.000Z",
      lastActiveAt: "2026-06-12T00:00:00.000Z",
    });
  });

  it("keeps sessions active indefinitely", () => {
    vi.setSystemTime(new Date("2026-06-12T00:00:00.000Z"));
    writeStoredGuardSession(session);

    vi.setSystemTime(new Date("2036-06-12T00:00:00.000Z"));
    expect(hasActiveStoredGuardSession()).toBe(true);
    expect(window.localStorage.getItem(guardSessionStorageKey)).not.toBeNull();
  });

  it("touches active sessions without imposing an expiry", () => {
    vi.setSystemTime(new Date("2026-06-12T00:00:00.000Z"));
    writeStoredGuardSession(session);

    vi.setSystemTime(new Date("2026-06-12T23:00:00.000Z"));
    touchStoredGuardSession();

    vi.setSystemTime(new Date("2036-06-13T22:59:00.000Z"));
    expect(hasActiveStoredGuardSession()).toBe(true);
  });

  it("migrates a legacy sessionStorage session into localStorage", () => {
    vi.setSystemTime(new Date("2026-06-12T00:00:00.000Z"));
    window.sessionStorage.setItem(guardSessionStorageKey, JSON.stringify(session));

    expect(readStoredGuardSession()).toMatchObject({ employee: { id: "employee-1" } });

    expect(window.sessionStorage.getItem(guardSessionStorageKey)).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(guardSessionStorageKey) ?? "{}")).toMatchObject({
      employee: { id: "employee-1" },
      lastActiveAt: "2026-06-12T00:00:00.000Z",
    });
  });

  it("clears local and legacy session storage", () => {
    writeStoredGuardSession(session);
    window.sessionStorage.setItem(guardSessionStorageKey, JSON.stringify(session));

    clearStoredGuardSession();

    expect(window.localStorage.getItem(guardSessionStorageKey)).toBeNull();
    expect(window.sessionStorage.getItem(guardSessionStorageKey)).toBeNull();
  });
});
