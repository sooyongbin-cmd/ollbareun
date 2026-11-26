/* The root layout loads this file only when a flex layout probe fails. */
(function () {
  "use strict";
  if (!document.documentElement.hasAttribute("data-legacy-flex-gap")) return;

  var records = new Map();
  var dirty = new Set();
  var frame = 0;
  var observer = new MutationObserver(function (changes) {
    changes.forEach(function (change) { invalidate(change.target); });
  });
  var sizes = typeof ResizeObserver === "function" ? new ResizeObserver(function (entries) {
    entries.forEach(function (entry) { invalidate(entry.target); });
  }) : null;
  var observedSizes = new Set();
  var sides = ["top", "right", "bottom", "left"];
  var style = document.createElement("style");
  style.textContent = sides.map(function (side) {
    return "[data-ol-gap-" + side + "]{margin-" + side + ":var(--ol-gap-" + side + ")!important}";
  }).join("\n");
  document.head.appendChild(style);

  function invalidate(node) {
    if (node.nodeType !== 1) node = node.parentElement;
    if (node) dirty.add(node);
    if (!frame) frame = requestAnimationFrame(refresh);
  }

  // Leave author-supplied inline styles in place. Only the compatibility
  // attributes and private variables belong to this script.
  function addMargin(record, element, side, delta) {
    if (!delta) return;
    var margins = record.margins.get(element);
    if (!margins) {
      margins = {};
      record.margins.set(element, margins);
    }
    var value = margins[side];
    if (!value) {
      value = margins[side] = {
        base: parseFloat(getComputedStyle(element).getPropertyValue("margin-" + side)) || 0,
        extra: 0
      };
    }
    value.extra += delta;
    var name = "ol-gap-" + side;
    if (value.extra) {
      element.style.setProperty("--" + name, (value.base + value.extra) + "px");
      element.setAttribute("data-" + name, "");
    } else {
      element.removeAttribute("data-" + name);
      element.style.removeProperty("--" + name);
    }
  }

  function clear(container, record) {
    window.olbareumLegacyWrap.clear(container);
    record.margins.forEach(function (margins, el) {
      Object.keys(margins).forEach(function (side) {
        el.removeAttribute("data-ol-gap-" + side);
        el.style.removeProperty("--ol-gap-" + side);
      });
    });
    records.delete(container);
  }

  // A non-empty run of bare text in a button/link is an anonymous flex
  // item. Track it without wrapping React-owned text nodes.
  function flowItems(container) {
    var items = [];
    function textItem() {
      if (!items.length || items[items.length - 1].element) {
        items.push({ element: null, order: 0, index: items.length });
      }
    }
    function visit(parent) {
      for (var node = parent.firstChild; node; node = node.nextSibling) {
        if (node.nodeType === 3) {
          if (/[^\t\n\r ]/.test(node.nodeValue)) textItem();
        } else if (node.nodeType === 1) {
          var css = getComputedStyle(node);
          if (css.display === "none" || css.position === "absolute" || css.position === "fixed") continue;
          if (css.display === "contents") visit(node);
          else items.push({ element: node, order: Number(css.order) || 0, index: items.length });
        }
      }
    }
    visit(container);
    return items.sort(function (a, b) { return a.order - b.order || a.index - b.index; });
  }

  function usedGap(value, container, horizontal) {
    if (!value || value === "normal") return 0;
    if (!/%$/.test(value)) return parseFloat(value) || 0;
    var css = getComputedStyle(container);
    var extent = horizontal
      ? container.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight)
      : container.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom);
    return parseFloat(value) * extent / 100;
  }

  function apply(container) {
    var css = getComputedStyle(container);
    if (css.display !== "flex" && css.display !== "inline-flex") return;
    var rowGap = usedGap(css.rowGap, container, false);
    var columnGap = usedGap(css.columnGap, container, true);
    if (!rowGap && !columnGap) return;
    var items = flowItems(container);
    if (items.length < 2) return;
    var record = { margins: new Map(), watch: [] };
    records.set(container, record);
    function margin(element, side, delta) { addMargin(record, element, side, delta); }

    var row = css.flexDirection.indexOf("row") === 0;
    var reverse = css.flexDirection.indexOf("reverse") !== -1;
    var start = row ? (reverse !== (css.direction === "rtl") ? "right" : "left") : (reverse ? "bottom" : "top");
    var end = { left: "right", right: "left", top: "bottom", bottom: "top" }[start];
    var gap = row ? columnGap : rowGap;
    if (css.flexWrap !== "nowrap" && items.every(function (item) { return item.element; })) {
      var elements = items.map(function (item) { return item.element; });
      record.watch = [container].concat(elements);
      window.olbareumLegacyWrap(container, elements, css, rowGap, columnGap, margin);
      return;
    }
    for (var i = 1; gap && i < items.length; i++) {
      var next = items[i].element;
      var previous = items[i - 1].element;
      // Prefer a free edge, including when the other item uses margin:auto.
      if (next && (!previous || !parseFloat(getComputedStyle(next).getPropertyValue("margin-" + start)))) {
        margin(next, start, gap);
      } else if (previous) {
        margin(previous, end, gap);
      }
    }
  }

  function refresh() {
    frame = 0;
    observer.disconnect();
    try {
      var candidates = new Set();
      dirty.forEach(function (root) {
        if (!root.isConnected) return;
        for (var p = root; p; p = p.parentElement) candidates.add(p);
        Array.prototype.forEach.call(root.querySelectorAll("*"), function (el) { candidates.add(el); });
      });
      dirty.clear();
      records.forEach(function (record, el) {
        if (!el.isConnected || candidates.has(el)) clear(el, record);
      });
      // Size nested content before measuring a wrapping parent.
      Array.from(candidates).sort(function (a, b) {
        var position = a.compareDocumentPosition(b);
        return position & 4 ? 1 : position & 2 ? -1 : 0;
      }).forEach(function (el) { if (el.isConnected) apply(el); });
      if (sizes) {
        var desired = new Set();
        records.forEach(function (record) { record.watch.forEach(function (el) { desired.add(el); }); });
        observedSizes.forEach(function (el) { if (!desired.has(el)) sizes.unobserve(el); });
        desired.forEach(function (el) { if (!observedSizes.has(el)) sizes.observe(el); });
        observedSizes = desired;
      }
    } finally {
      observer.observe(document.documentElement, {
        subtree: true, attributes: true, characterData: true, childList: true
      });
    }
  }

  function refreshAll() { invalidate(document.documentElement); }
  window.addEventListener("resize", refreshAll);
  window.addEventListener("pageshow", refreshAll);
  document.addEventListener("load", function (event) {
    if (event.target.tagName === "LINK") refreshAll();
    else if (event.target.tagName === "IMG") invalidate(event.target);
  }, true);
  document.addEventListener("DOMContentLoaded", refreshAll);
  document.addEventListener("toggle", function (event) { invalidate(event.target); }, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshAll);
  refreshAll();
})();
