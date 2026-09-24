import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearStoredGuardSession, writeStoredGuardSession } from "../guard-session-storage";
import GuardBottomNavigation from "./guard-bottom-navigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/guard/main/work" }));

describe("guard footer patrol visibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it.each(["경비원", "미화원"])("shows the active NFC work link for %s", (role) => {
    writeStoredGuardSession({ employee: { id: "test-employee", role } });
    render(<GuardBottomNavigation />);
    expect(screen.getByRole("link", { name: "점검" })).toHaveAttribute("href", "/guard/main/work");
    expect(screen.getByRole("link", { name: "점검" })).toHaveAttribute("aria-current", "page");
  });

  it.each(["파견", "", undefined])("hides inspection but preserves five other links for %s", (role) => {
    writeStoredGuardSession({ employee: { id: "test-employee", role } });
    render(<GuardBottomNavigation />);
    expect(screen.queryByRole("link", { name: "점검" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });

  it("updates when the role changes and when the session is cleared", () => {
    writeStoredGuardSession({ employee: { id: "test-employee", role: "경비원" } });
    render(<GuardBottomNavigation />);
    act(() => writeStoredGuardSession({ employee: { id: "test-employee", role: "파견" } }));
    expect(screen.queryByRole("link", { name: "점검" })).not.toBeInTheDocument();
    act(() => writeStoredGuardSession({ employee: { id: "test-employee", role: "미화원" } }));
    expect(screen.getByRole("link", { name: "점검" })).toBeInTheDocument();
    act(() => clearStoredGuardSession());
    expect(screen.queryByRole("link", { name: "점검" })).not.toBeInTheDocument();
  });
});
