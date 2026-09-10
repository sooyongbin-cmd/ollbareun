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
  const tableComponentSource = readFileSync(
    path.resolve(process.cwd(), "src/components/ui/table.tsx"),
    "utf8",
  );
  const globalStylesSource = readFileSync(
    path.resolve(process.cwd(), "src/app/globals.css"),
    "utf8",
  );
  const tableSources = listTsxFiles(appDirectory)
    .map((filePath) => ({ filePath, source: readFileSync(filePath, "utf8") }))
    .filter(({ source }) => /<Table(?:\s|>)/.test(source));

  it("uses the shadcn table primitives instead of raw table markup", () => {
    const violations = tableSources.flatMap(({ filePath, source }) =>
      [...source.matchAll(/<(?:table|thead|tbody|tr|th|td)\b/g)]
        .map(([tag]) => `${path.relative(process.cwd(), filePath)}: ${tag}`),
    );

    expect(violations).toEqual([]);
  });

  it("marks every data cell with a mobile label or empty-state marker", () => {
    const violations = tableSources.flatMap(({ filePath, source }) =>
      [...source.matchAll(/<TableCell\b[^>]*>/g)]
        .map(([tag]) => tag)
        .filter((tag) => !/\bdata-label=/.test(tag) && !/\bdata-responsive-empty\b/.test(tag))
        .map((tag) => `${path.relative(process.cwd(), filePath)}: ${tag}`),
    );

    expect(violations).toEqual([]);
  });

  it("uses the shared mobile card layout for every shadcn table", () => {
    expect(tableComponentSource).toContain('data-mobile-layout="cards"');
    expect(globalStylesSource).toContain(
      '[data-slot="table-container"][data-mobile-layout="cards"]',
    );
    expect(globalStylesSource).toContain('content: attr(data-label)');
  });

  it("covers all current application data tables", () => {
    const tableCount = tableSources.reduce(
      (count, { source }) => count + [...source.matchAll(/<Table(?:\s|>)/g)].length,
      0,
    );

    expect(tableCount).toBe(25);
  });

  it("marks the one-column safety table to suppress duplicate mobile labels", () => {
    const singleColumnTableCount = tableSources.reduce(
      (count, { source }) => count + [...source.matchAll(/<Table\b[^>]*\bdata-responsive-single-column\b/g)].length,
      0,
    );

    expect(singleColumnTableCount).toBe(1);
  });
});
