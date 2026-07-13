import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function listTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listTsxFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")
      ? [entryPath]
      : [];
  });
}

describe("responsive data table contract", () => {
  const appDirectory = path.resolve(process.cwd(), "src/app");
  const tableSources = listTsxFiles(appDirectory)
    .map((filePath) => ({ filePath, source: readFileSync(filePath, "utf8") }))
    .filter(({ source }) => /<table\b[^>]*\bapple-table\b/.test(source));

  it("marks every data cell with a mobile label or empty-state marker", () => {
    const violations = tableSources.flatMap(({ filePath, source }) =>
      [...source.matchAll(/<td\b[^>]*>/g)]
        .map(([tag]) => tag)
        .filter((tag) => !/\bdata-label=/.test(tag) && !/\bdata-responsive-empty\b/.test(tag))
        .map((tag) => `${path.relative(process.cwd(), filePath)}: ${tag}`),
    );

    expect(violations).toEqual([]);
  });

  it("covers all current application data tables", () => {
    const tableCount = tableSources.reduce(
      (count, { source }) => count + [...source.matchAll(/<table\b[^>]*\bapple-table\b/g)].length,
      0,
    );

    expect(tableCount).toBe(22);
  });

  it("marks the one-column safety table to suppress duplicate mobile labels", () => {
    const singleColumnTableCount = tableSources.reduce(
      (count, { source }) => count + [...source.matchAll(/<table\b[^>]*\bdata-responsive-single-column\b/g)].length,
      0,
    );

    expect(singleColumnTableCount).toBe(1);
  });
});
