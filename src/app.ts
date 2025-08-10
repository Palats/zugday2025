import { LitElement, css, html, nothing } from "lit"
import { customElement, state } from "lit/decorators.js"
import "@material-symbols/font-400/outlined.css";
import * as common from "./common";

import "./map";

/**
 * Overall app.
 */
@customElement("zg-app")
export class ZGApp extends LitElement {
  @state() private showMenu = false;

  render() {
    return html`
      <div class="menubutton">
        <button class="menubutton" @click=${() => { this.showMenu = !this.showMenu }}>
          ${this.showMenu ? html`
          <span class="material-symbols-outlined" title="Close menu">close</span>
          `: html`
          <span class="material-symbols-outlined" title="Open menu">menu</span>
          `}
        </button>
      </div>
      ${this.showMenu ? html`
        <div class="menu">
          Plop
        </div>
      `: nothing}
      <zg-map > </zg-map>
  `;
  }

  static styles = [common.sharedCSS, css`
      :host {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: stretch;
    }

    .menubutton {
      position: fixed;
      z-index: 1;

      font-size: 24px;
      margin-right: 10px;
    }

    .menu {
      position: fixed;
      width: 100px;
      height: 100%;
      background-color: #eeeeee;
    }
`];
}

declare global {
  interface HTMLElementTagNameMap {
    "zg-app": ZGApp
  }
}
