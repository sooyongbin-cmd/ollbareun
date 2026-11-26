/* Loaded only by the fallback for browsers without flexbox gap. */
(function () {
  "use strict";

  function clearBreaks(container) {
    var markers = container.__olbareumFlexBreaks || [];
    markers.forEach(function (marker) {
      if (marker.parentNode) marker.parentNode.removeChild(marker);
    });
    container.__olbareumFlexBreaks = [];
  }

  function forceBreak(container, element) {
    var marker = document.createElement("span");
    marker.setAttribute("aria-hidden", "true");
    marker.setAttribute("data-olbareum-flex-break", "");
    marker.style.cssText =
      "display:block!important;position:static!important;visibility:hidden!important;" +
      "flex:0 0 100%!important;align-self:flex-start!important;" +
      "width:0!important;height:0!important;min-width:0!important;min-height:0!important;" +
      "max-width:none!important;max-height:none!important;" +
      "margin:0!important;border:0!important;padding:0!important;pointer-events:none!important;";
    marker.style.setProperty("order", getComputedStyle(element).order, "important");
    element.parentNode.insertBefore(marker, element);
    container.__olbareumFlexBreaks.push(marker);
  }

  // Compare actual line origins even when the original items use baseline,
  // center, end, stretch or different cross-axis margins.
  function alignForMeasurement(element, crossStart) {
    var properties = ["align-self", "margin-" + crossStart, "transform", "position"];
    var values = ["flex-start", "0px", "none", "static"];
    var original = properties.map(function (name, index) {
      var value = element.style.getPropertyValue(name);
      var priority = element.style.getPropertyPriority(name);
      element.style.setProperty(name, values[index], "important");
      return [name, value, priority];
    });
    return function () {
      original.forEach(function (declaration) {
        if (declaration[1]) element.style.setProperty(declaration[0], declaration[1], declaration[2]);
        else element.style.removeProperty(declaration[0]);
      });
    };
  }

  function measureWrap(container, items, computed, rowGap, columnGap, addMargin) {
    clearBreaks(container);
    if (items.length < 2 || (!rowGap && !columnGap)) return;

    var direction = computed.flexDirection;
    var row = direction === "row" || direction === "row-reverse";
    var rtl = computed.direction === "rtl";
    var reverse = computed.flexWrap === "wrap-reverse";
    var mainStart = row
      ? ((direction === "row-reverse") !== rtl ? "right" : "left")
      : (direction === "column-reverse" ? "bottom" : "top");
    var crossStart = row ? (reverse ? "bottom" : "top") : (reverse !== rtl ? "right" : "left");
    var mainGap = row ? columnGap : rowGap;
    var crossGap = row ? rowGap : columnGap;
    var otherLines = [];
    var restores = [];
    var afterFirstLine = false;

    if (mainGap) {
      for (var i = 1; i < items.length; i++) addMargin(items[i], mainStart, mainGap);
    }
    function startsNewLine(index) {
      var previous = items[index - 1].getBoundingClientRect()[crossStart];
      var current = items[index].getBoundingClientRect()[crossStart];
      return Math.abs(previous - current) > 0.01;
    }
    try {
      items.forEach(function (item) { restores.push(alignForMeasurement(item, crossStart)); });
      for (var index = 1; index < items.length; index++) {
        if (startsNewLine(index)) {
          afterFirstLine = true;
          if (mainGap) {
            addMargin(items[index], mainStart, -mainGap);
            // Two items can fit exactly without the gap. Keep the second on
            // its native line without an indent or changing either width.
            if (!startsNewLine(index)) forceBreak(container, items[index]);
          }
        }
        if (afterFirstLine) otherLines.push(items[index]);
      }
    } finally {
      restores.forEach(function (restore) { restore(); });
    }
    if (crossGap) {
      otherLines.forEach(function (item) { addMargin(item, crossStart, crossGap); });
    }
  }

  measureWrap.clear = clearBreaks;
  window.olbareumLegacyWrap = measureWrap;
})();
