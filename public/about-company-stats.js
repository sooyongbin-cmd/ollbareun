/* Keep the final label in the light DOM, including before React hydration. */
(function () {
  "use strict";
  const tag = "olbareum-stat-value";
  if (!window.customElements || customElements.get(tag) ||
      !HTMLElement.prototype.attachShadow || !window.IntersectionObserver ||
      !window.requestAnimationFrame) return;

  class CompanyStatValue extends HTMLElement {
    connectedCallback() {
      if (this.played || this.observer) return;
      const motion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
      if (motion && motion.matches) return;

      this.observer = new IntersectionObserver((entries, observer) => {
        if (this.observer !== observer || !this.isConnected) return;
        if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.4)) return;
        observer.disconnect();
        this.observer = null;
        this.played = true;
        this.animateValue(motion);
      }, { threshold: 0.4 });
      this.observer.observe(this.closest("[data-company-stats]") || this);
    }

    animateValue(motion) {
      const target = Number(this.getAttribute("data-value"));
      const scale = Number.isInteger(target) ? 1 : 10;
      const end = Math.round(target * scale);
      const start = this.getAttribute("data-from") === "year" ? new Date().getFullYear() * scale : 0;
      const suffix = this.getAttribute("data-suffix") || "";
      if (!Number.isFinite(target) || start === end || (motion && motion.matches)) return;

      let started;
      let digits;
      const tick = now => {
        if (started === undefined) started = now;
        const progress = Math.min((now - started) / 1400, 1);
        if (progress === 1 || (motion && motion.matches)) {
          this.showFinalValue();
          return;
        }
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(start + (end - start) * eased) / scale;
        const label = (scale === 10 ? value.toFixed(1) : String(value)) + suffix;
        if (!digits) {
          digits = document.createTextNode(label);
          this.attachShadow({ mode: "open" }).appendChild(digits);
        } else if (digits.data !== label) {
          digits.data = label;
        }
        this.frame = window.requestAnimationFrame(tick);
      };
      this.frame = window.requestAnimationFrame(tick);
    }

    showFinalValue() {
      this.frame = undefined;
      if (this.shadowRoot) {
        this.shadowRoot.textContent = "";
        this.shadowRoot.appendChild(document.createElement("slot"));
      }
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
      this.observer = null;
      if (this.frame !== undefined) {
        window.cancelAnimationFrame(this.frame);
        this.showFinalValue();
      }
    }
  }

  customElements.define(tag, CompanyStatValue);
})();
