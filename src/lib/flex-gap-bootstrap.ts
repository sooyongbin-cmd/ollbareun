// This probe also runs before hydration in browsers older than the app runtime.
// A CSS feature query for gap would report Grid support on Safari 13.
export const flexGapBootstrap = `(function () {
  var root = document.documentElement;
  if (root.hasAttribute("data-legacy-flex-gap")) return;
  var probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;display:flex;flex-direction:column;row-gap:1px;padding:0;border:0";
  probe.appendChild(document.createElement("div"));
  probe.appendChild(document.createElement("div"));
  root.appendChild(probe);
  var supported = probe.scrollHeight === 1;
  root.removeChild(probe);
  if (supported) return;
  root.setAttribute("data-legacy-flex-gap", "");
  var head = document.head;
  if (document.currentScript && document.currentScript.hasAttribute("data-app-layout")) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/legacy-flex-layout.css";
    head.insertBefore(link, head.firstChild);
  }
  ["/legacy-flex-wrap.js", "/legacy-flex-gap.js"].forEach(function (url) {
    var script = document.createElement("script");
    script.async = false;
    script.src = url;
    head.appendChild(script);
  });
})();`;
