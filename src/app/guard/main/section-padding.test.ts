import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const guardMainFilesWithSections = [
  "page.tsx",
  "attendance/page.tsx",
  "profile/page.tsx",
  "safety/page.tsx",
];

describe("guard main section spacing", () => {
  it("uses 1rem padding instead of 2rem padding on guard main sections", () => {
    for (const filePath of guardMainFilesWithSections) {
      const source = readFileSync(join(process.cwd(), "src/app/guard/main", filePath), "utf8");

      expect(source, filePath).not.toMatch(/<section[\s\S]*?className="[^"]*p-\[2rem\][^"]*"/);
    }
  });
});
