"use client";

import { useEffect, useRef, useState } from "react";
import {
  managerThemeStorageKey,
  normalizeManagerTheme,
  readManagerTheme,
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
  const currentTheme = useRef(initialTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;

    function applyTheme(nextTheme: ManagerTheme) {
      const resolvedTheme = resolveManagerTheme(nextTheme, mediaQuery.matches);
      root.classList.toggle("dark", resolvedTheme === "dark");
      root.dataset.managerTheme = resolvedTheme;
      root.style.colorScheme = resolvedTheme;
    }

    function updateTheme(value: unknown) {
      const nextTheme = normalizeManagerTheme(value);
      currentTheme.current = nextTheme;
      setTheme(nextTheme);
      applyTheme(nextTheme);
    }

    function handleSystemThemeChange() {
      if (currentTheme.current === "system") {
        applyTheme("system");
      }
    }

    function handleConfiguredThemeChange(event: Event) {
      updateTheme((event as CustomEvent<unknown>).detail);
    }

    function handleStorageChange(event: StorageEvent) {
      if (event.key === managerThemeStorageKey || event.key === null) {
        updateTheme(readManagerTheme());
      }
    }

    const savedTheme = readManagerTheme(initialTheme);
    currentTheme.current = savedTheme;
    setTheme(savedTheme);
    applyTheme(savedTheme);
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    window.addEventListener(managerThemeChangeEvent, handleConfiguredThemeChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
      window.removeEventListener(managerThemeChangeEvent, handleConfiguredThemeChange);
      window.removeEventListener("storage", handleStorageChange);
      root.classList.remove("dark");
      delete root.dataset.managerTheme;
      root.style.removeProperty("color-scheme");
    };
  }, [initialTheme]);

  return (
    <div
      className={`manager-theme min-h-screen${theme === "dark" ? " dark" : ""}`}
      data-theme={theme}
    >
      {children}
    </div>
  );
}
