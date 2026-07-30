export const managerThemes = ["light", "dark", "system"] as const;

export type ManagerTheme = (typeof managerThemes)[number];

export function normalizeManagerTheme(value: unknown): ManagerTheme {
  if (typeof value !== "string") {
    return "system";
  }

  const normalized = value.trim().toLowerCase();
  return managerThemes.includes(normalized as ManagerTheme)
    ? (normalized as ManagerTheme)
    : "system";
}
