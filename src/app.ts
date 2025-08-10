import { LitElement, css, html } from "lit"
import { customElement } from "lit/decorators.js"
import "@material-symbols/font-400/outlined.css";
import * as common from "./common";

import "./map";

/**
 * Overall app.
 */
@customElement("zg-app")
export class ZGApp extends LitElement {
  render() {
    return html`<zg-map></zg-map>`;
  }

  static styles = [common.sharedCSS, css`
      :host {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: stretch;
      }
  `];
}

declare global {
  interface HTMLElementTagNameMap {
    "zg-app": ZGApp
  }
}
