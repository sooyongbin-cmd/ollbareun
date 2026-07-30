"use client";

import { useEffect, useState } from "react";
import {
  normalizeManagerTheme,
  type ManagerTheme,
} from "@/lib/manager-theme";

export const managerThemeChangeEvent = "manager-theme-change";

export function notifyManagerThemeChange(value: unknown) {
  window.dispatchEvent(
    new CustomEvent(managerThemeChangeEvent, {
      detail: normalizeManagerTheme(value),
    }),
  );
}

function resolveManagerTheme(
  theme: ManagerTheme,
  prefersDark: boolean,
): Exclude<ManagerTheme, "system"> {
  if (theme === "system") {
    return prefersDark ? "dark" : "light";
  }

  return theme;
}

export default function ManagerThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: ManagerTheme;
}) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;

    function applyTheme() {
      const resolvedTheme = resolveManagerTheme(theme, mediaQuery.matches);
      root.classList.toggle("dark", resolvedTheme === "dark");
      root.dataset.managerTheme = resolvedTheme;
      root.style.colorScheme = resolvedTheme;
    }

    function handleSystemThemeChange() {
      if (theme === "system") {
        applyTheme();
      }
    }

    function handleConfiguredThemeChange(event: Event) {
      setTheme(normalizeManagerTheme((event as CustomEvent<unknown>).detail));
    }

    applyTheme();
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    window.addEventListener(managerThemeChangeEvent, handleConfiguredThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener(managerThemeChangeEvent, handleConfiguredThemeChange);
      root.classList.remove("dark");
      delete root.dataset.managerTheme;
      root.style.removeProperty("color-scheme");
    };
  }, [theme]);

  return (
    <div
      className={`manager-theme min-h-screen${theme === "dark" ? " dark" : ""}`}
      data-theme={theme}
    >
      {children}
    </div>
  );
}
