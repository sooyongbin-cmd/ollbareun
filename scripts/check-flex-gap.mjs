import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const fixture = `<!doctype html>
<style>
  * { box-sizing: border-box }
  body { margin: 0; font: 16px Arial, sans-serif }
  [hidden] { display: none !important }
  .flex { --row: 13px; --column: 7px; display: flex; gap: var(--row) var(--column) }
  [data-legacy-flex-gap] .flex { gap: 0 }
  #toolbar { width: 140px; flex-wrap: wrap; justify-content: flex-end; align-items: baseline }
  #toolbar > span { flex: 0 0 auto }
  #more { display: inline-flex; padding: 0; align-items: center }
  #grid { width: 140px; display: grid; grid-template-columns: 30px 40px; gap: 11px }
  @media (max-width: 500px) { #more { flex-direction: column } #toolbar { width: 170px } }
</style>
<div class="flex" id="toolbar">
  <span id="wide" style="width:90px">First</span>
  <span id="edge" style="width:50px;font-size:23px">Next</span>
  <span id="extra" style="width:36px" hidden>Extra</span>
  <span id="last" style="width:60px">Last</span>
</div>
<button id="more" class="flex">MORE VIEW <span style="display:contents"><i id="arrow">→</i></span></button>
<div id="grid"><span id="logo1">A</span><span id="logo2">B</span></div>`;

// Chrome lays out flex containers without gutters in the legacy fixture.
// Keep the authored gap values visible to the production script, as in Safari 13.
async function simulateLegacy(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-legacy-flex-gap", "");
    const read = window.getComputedStyle.bind(window);
    window.getComputedStyle = (element, pseudo) => {
      const style = read(element, pseudo);
      if (pseudo || !element.matches(".flex")) return style;
      return new Proxy(style, {
        get(target, key) {
          if (key === "rowGap") return target.getPropertyValue("--row").trim();
          if (key === "columnGap") return target.getPropertyValue("--column").trim();
          const value = target[key];
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    };
  });
  for (const name of ["legacy-flex-wrap.js", "legacy-flex-gap.js"]) {
    await page.addScriptTag({ path: fileURLToPath(new URL("../public/" + name, import.meta.url)) });
  }
}

async function boxes(page) {
  return page.evaluate(async () => {
    // Let mutation, resize and animation-frame callbacks settle.
    for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
    return Object.fromEntries(Array.from(document.querySelectorAll("[id]"), (el) => {
      const { x, y, width, height } = el.getBoundingClientRect();
      return [el.id, { x, y, width, height }];
    }));
  });
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined });
try {
  const native = await browser.newPage();
  const legacy = await browser.newPage();
  const pages = [native, legacy];
  await Promise.all(pages.map(page => page.setContent(fixture)));
  await simulateLegacy(legacy);

  async function compare(stage) {
    const [expected, actual] = await Promise.all(pages.map(boxes));
    assert.deepEqual(Object.keys(actual), Object.keys(expected));
    for (const [id, box] of Object.entries(expected)) {
      for (const [axis, value] of Object.entries(box)) {
        assert.ok(Math.abs(actual[id][axis] - value) < 0.1,
          `${stage}, #${id} ${axis}: expected ${value}, got ${actual[id][axis]}`);
      }
    }
  }

  await compare("wrap at exact unspaced width");
  await Promise.all(pages.map(page => page.evaluate(() => {
    document.querySelector("#extra").hidden = false;
    const added = document.createElement("span");
    added.id = "added";
    added.textContent = "New";
    document.querySelector("#toolbar").appendChild(added);
  })));
  await compare("show and append items");
  await Promise.all(pages.map(page => page.setViewportSize({ width: 400, height: 600 })));
  await compare("mobile column and toolbar reflow");
  await Promise.all(pages.map(page => page.evaluate(() => {
    document.querySelector("#wide").hidden = true;
  })));
  await compare("hide first item");
  console.log("Flex gap geometry matched native layout in all four states.");
} finally {
  await browser.close();
}
