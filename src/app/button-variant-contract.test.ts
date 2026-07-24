import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
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

function getAttribute(
  node: ts.JsxOpeningLikeElement,
  name: string,
): ts.JsxAttribute | undefined {
  return node.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText() === name,
  );
}

describe("shadcn button variant contract", () => {
  it("requires an explicit variant when a Button overrides its background", () => {
    const violations: string[] = [];

    for (const filePath of listTsxFiles(path.resolve(process.cwd(), "src"))) {
      const source = readFileSync(filePath, "utf8");
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );

      function visit(node: ts.Node) {
        if (
          (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
          node.tagName.getText(sourceFile) === "Button"
        ) {
          const className = getAttribute(node, "className");
          const classNameSource = className?.initializer?.getText(sourceFile) ?? "";
          const overridesBackground =
            /\bbg-(?:background|white(?:\/\d+)?|muted|secondary|transparent)\b/.test(
              classNameSource,
            ) || /\bborder-input\b/.test(classNameSource);

          if (overridesBackground && !getAttribute(node, "variant")) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
            violations.push(`${path.relative(process.cwd(), filePath)}:${line + 1}`);
          }
        }

        ts.forEachChild(node, visit);
      }

      visit(sourceFile);
    }

    expect(violations).toEqual([]);
  });
});
