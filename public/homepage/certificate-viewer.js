// Loaded as a classic script so opening a certificate does not require app hydration.
(function () {
  if (!window.customElements || customElements.get("olbareum-certificates")) return;

  class CertificateGallery extends HTMLElement {
    connectedCallback() {
      this.addEventListener("click", this);
      this.addEventListener("keydown", this);
    }

    disconnectedCallback() {
      this.removeEventListener("click", this);
      this.removeEventListener("keydown", this);
      if (this.opener) this.closeViewer(false);
    }

    handleEvent(event) {
      if (event.type === "cancel") {
        event.preventDefault();
        this.closeViewer(true);
        return;
      }
      if (event.type === "keydown") {
        if (this.opener) this.handleKey(event);
        return;
      }
      const link = event.target.closest("a[data-certificate]");
      if (link) {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (!this.opener) this.openViewer(link);
        return;
      }
      if (!this.opener) return;
      const button = event.target.closest("button[data-action]");
      const action = button && button.dataset.action;
      if (action === "previous") this.show(this.index - 1);
      else if (action === "next") this.show(this.index + 1);
      else if (action === "zoom-in") this.setZoom(this.zoom + 0.25);
      else if (action === "zoom-out") this.setZoom(this.zoom - 0.25);
      else if (action === "close" || action === "close-image" ||
        event.target === this.dialog || event.target === this.viewport) this.closeViewer(true);
    }

    openViewer(link) {
      this.opener = link;
      // Keep the active popup outside the animated track and the DOM being hydrated.
      this.dialog = this.querySelector("dialog").cloneNode(true);
      document.body.appendChild(this.dialog);
      this.dialog.addEventListener("click", this);
      this.dialog.addEventListener("keydown", this);
      this.dialog.addEventListener("cancel", this);
      this.viewport = this.dialog.querySelector("[data-image-viewport]");
      this.documents = this.querySelectorAll('[data-certificate-track] > :first-child a[data-certificate]');
      this.closeButton = this.dialog.querySelector('[data-action="close"]');
      this.track = link.closest("[data-certificate-track]");
      this.track.dataset.paused = "true";
      this.previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      this.show(Number(link.dataset.certificate));
      if (typeof this.dialog.showModal === "function") {
        this.dialog.showModal();
      } else {
        this.dialog.setAttribute("open", "");
      }
      this.closeButton.focus();
    }

    show(index) {
      const count = this.documents.length;
      this.index = (index + count) % count;
      const link = this.documents[this.index];
      const name = link.querySelector("img").alt;
      const imageButton = this.dialog.querySelector('[data-action="close-image"]');
      const image = imageButton.querySelector("img");
      image.alt = name;
      image.src = link.href;
      imageButton.setAttribute("aria-label", name + " 이미지 닫기");
      this.dialog.setAttribute("aria-label", name + " 확대 보기");
      this.dialog.querySelector("h3").textContent = name + " 확대 보기";
      this.dialog.querySelector("[data-counter]").textContent = (this.index + 1) + " / " + count;
      this.setZoom(1);
      this.viewport.scrollLeft = 0;
      this.viewport.scrollTop = 0;
    }

    setZoom(zoom) {
      this.zoom = Math.max(0.5, Math.min(3, zoom));
      this.viewport.style.setProperty("--certificate-zoom", String(this.zoom));
      this.dialog.querySelector('[data-action="zoom-out"]').disabled = this.zoom === 0.5;
      this.dialog.querySelector('[data-action="zoom-in"]').disabled = this.zoom === 3;
    }

    handleKey(event) {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          this.closeViewer(true);
          break;
        case "ArrowLeft":
        case "ArrowRight":
          event.preventDefault();
          this.show(this.index + (event.key === "ArrowLeft" ? -1 : 1));
          break;
        case "Tab": {
          const buttons = this.dialog.querySelectorAll("button:not(:disabled)");
          const first = buttons[0];
          const last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
          break;
        }
      }
    }

    closeViewer(restoreFocus) {
      if (typeof this.dialog.close === "function") this.dialog.close();
      else this.dialog.removeAttribute("open");
      this.dialog.remove();
      this.track.dataset.paused = "false";
      document.body.style.overflow = this.previousOverflow;
      const opener = this.opener;
      this.opener = null;
      if (restoreFocus) opener.focus({ preventScroll: true });
      this.dialog = null;
    }
  }

  customElements.define("olbareum-certificates", CertificateGallery);
})();
