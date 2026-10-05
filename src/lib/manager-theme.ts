export const managerThemes = ["light", "dark", "system"] as const;

export type ManagerTheme = (typeof managerThemes)[number];

export const managerThemeSystemCode = "THEME_CODE";
export const managerThemeStorageKey = "ollbareun.manager.theme";

export function normalizeManagerTheme(value: unknown): ManagerTheme {
  if (typeof value !== "string") {
    return "system";
  }

  const normalized = value.trim().toLowerCase();
  return managerThemes.includes(normalized as ManagerTheme)
    ? (normalized as ManagerTheme)
    : "system";
}

export function isManagerThemeSystemCode(value: unknown) {
  return typeof value === "string" && value.trim().toUpperCase() === managerThemeSystemCode;
}

export function readManagerTheme(fallback: ManagerTheme = "system"): ManagerTheme {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const storedTheme = window.localStorage.getItem(managerThemeStorageKey);
    return storedTheme === null ? fallback : normalizeManagerTheme(storedTheme);
  } catch {
    return fallback;
  }
}

export function saveManagerThemeLocally(value: unknown): ManagerTheme {
  if (typeof window === "undefined") {
    throw new Error("테마는 브라우저에서만 저장할 수 있습니다.");
  }

  const theme = normalizeManagerTheme(value);
  window.localStorage.setItem(managerThemeStorageKey, theme);
  return theme;
}
