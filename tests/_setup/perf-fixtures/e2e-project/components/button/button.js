import { announce } from "./helpers/a11y.js";

class MiyagiButton extends HTMLElement {
  connectedCallback() {
    this.addEventListener("click", this.handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.handleClick);
  }

  handleClick = (event) => {
    if (this.hasAttribute("disabled")) {
      event.preventDefault();
      return;
    }
    announce(this.getAttribute("data-label") ?? "button activated");
  };
}

customElements.define("miyagi-button", MiyagiButton);
