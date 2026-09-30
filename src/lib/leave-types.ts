export function parseLeaveTypes(content: unknown) {
  if (typeof content !== "string") return [];

  return Array.from(new Set(
    content
      .split(/\r?\n/)
      .map((type) => type.trim())
      .filter(Boolean),
  ));
}
