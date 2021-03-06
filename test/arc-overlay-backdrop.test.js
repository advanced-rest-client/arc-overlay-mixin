import { fixture, assert, nextFrame } from '@open-wc/testing';
import './test-overlay.js';

const s = document.createElement('style');
s.type = 'text/css';
s.innerHTML = `
html,
body {
    margin: 0;
    width: 100%;
    height: 100%;
    min-width: 0;
}
.sizer {
    width: 4000px;
    height: 5000px;
}
`;
document.getElementsByTagName('head')[0].appendChild(s);

const sizer = document.createElement('div');
sizer.className = 'sizer';
document.body.appendChild(sizer);

describe('ArcOverlayBackdrop', () => {
  async function backdropFixture() {
    return (await fixture(`
      <test-overlay withbackdrop>
          Overlay with backdrop
      </test-overlay>`));
  }

  async function runAfterOpen(overlay) {
    return new Promise((resolve) => {
      overlay.addEventListener('iron-overlay-opened', resolve);
      overlay.open();
    });
  }

  describe('overlay with backdrop', function() {
    let overlay;

    beforeEach(async () => {
      overlay = await backdropFixture();
    });

    it('backdrop size matches parent size', async () => {
      await runAfterOpen(overlay);
      await nextFrame();
      const backdrop = overlay.backdropElement;
      const parent = backdrop.parentElement;
      assert.strictEqual(
        backdrop.offsetWidth,
        parent.clientWidth,
        'backdrop width matches parent width');
      assert.strictEqual(
        backdrop.offsetHeight,
        parent.clientHeight,
        'backdrop height matches parent height');
    });
  });
});
