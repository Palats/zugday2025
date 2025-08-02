import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

/**
 * The main page
 */
@customElement('zg-app')
export class ZGApp extends LitElement {
  render() {
    return html`
      <div>plop</div>
    `
  }

  static styles = css`
  `
}

declare global {
  interface HTMLElementTagNameMap {
    'zg-app': ZGApp
  }
}
