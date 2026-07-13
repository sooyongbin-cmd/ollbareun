import { describe, expect, it } from "vitest";
import RootLayout from "./layout";

describe("root layout", () => {
  it("applies the shared design scope to every application screen", () => {
    const layout = RootLayout({ children: <main>화면 내용</main> });
    const body = layout.props.children;

    expect(body.props.className).toContain("app-content");
  });
});
