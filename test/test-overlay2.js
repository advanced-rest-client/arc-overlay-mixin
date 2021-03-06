import { LitElement, html, css } from 'lit-element';
import { ArcOverlayMixin } from '../arc-overlay-mixin.js';

class TestOverlay2 extends ArcOverlayMixin(LitElement) {
  get styles() {
    return css`
    :host {
        background: white;
        color: black;
        border: 1px solid black;
      }`;
  }

  get _focusableNodes() {
    return [
      this.shadowRoot.querySelector('#first'),
      this.shadowRoot.querySelector('#last')
    ];
  }

  render() {
    return html`<style>${this.styles}</style>
    <button id="first">first</button>
    <slot></slot>
    <button id="last">last</button>`;
  }
}
window.customElements.define('test-overlay2', TestOverlay2);
