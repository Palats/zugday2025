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
          <h1>Zugday tools</h1>
          <div>
            <fieldset>
              <legend>Data to display</legend>
              <div>
                <input type="radio" id="conns" name="displayMode" value="conns" checked />
                <label for="conns">Stephane's data</label>
              </div>
              <div>
                <input type="radio" id="objectives" name="displayMode" value="objectives" />
                <label for="objectives">Objectives</label>
              </div>
            </fieldset>
          </div>
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
      width: 240px;
      height: 100%;
      background-color: #eeeeee;

      display: flex;
      flex-direction: column;
    }

    .menu h1 {
        height: 32px;
        font-size: 1.4rem;
        margin: 5px 10px 10px 55px;
    }
`];
}

declare global {
  interface HTMLElementTagNameMap {
    "zg-app": ZGApp
  }
}
