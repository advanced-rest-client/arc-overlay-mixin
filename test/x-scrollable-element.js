import { LitElement, html, css } from 'lit-element';

class XScrollableElement extends LitElement {
  get styles() {
    return css`
    :host {
      display: block;
      height: 100px;
      border: 1px solid red;
      overflow: auto;
    }
    #ChildOne, #ChildTwo {
      height: 200px;
      border: 1px solid blue;
      overflow: auto;
    }
    #GrandchildOne, #GrandchildTwo {
      height: 300px;
      border: 1px solid green;
      overflow: auto;
    }
    .scrollContent {
      height: 400px;
      background-color: yellow;
    }`;
  }

  render() {
    return html`<style>${this.styles}</style>
    <div id="ChildOne">
      <div id="GrandchildOne">
        <div class="scrollContent"></div>
      </div>
    </div>
    <div id="ChildTwo">
      <div id="GrandchildTwo">
        <div class="scrollContent"></div>
      </div>
    </div>
    <slot></slot>`;
  }
}
window.customElements.define('x-scrollable-element', XScrollableElement);
