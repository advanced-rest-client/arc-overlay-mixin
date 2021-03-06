import {fixture, assert, nextFrame} from '@open-wc/testing';
import sinon from 'sinon/pkg/sinon-esm.js';
import './test-overlay.js';
import './test-scrollable.js';
import {_lockingElements, elementIsScrollLocked} from '../arc-scroll-manager.js';

const s = document.createElement('style');
s.type = 'text/css';
s.innerHTML = `
.scrollable {
  overflow: auto;
  width: 200px;
  height: 200px;
}

.big {
  width: 150vmax;
  height: 150vmax;
}
`;
document.getElementsByTagName('head')[0].appendChild(s);

const big = document.createElement('div');
big.className = 'big';
big.innerText = 'This element makes the page scrollable.';
document.body.appendChild(big);

describe('ArcOverlayBehavior - scroll actions', () => {
  async function basicFixture() {
    return (await fixture(`
      <test-overlay class="scrollable">
        <div class="big">
          This element makes the overlay scrollable.
        </div>
      </test-overlay>`));
  }

  async function scrollableFixture() {
    return (await fixture(`
      <test-scrollable>
        <div slot="scrollable-content" class="big">
          This element makes the overlay scrollable.
          <test-overlay>Overlay in light dom</test-overlay>
        </div>
        <div slot="overlay-content" class="big">Overlay in shadow root</div>
      </test-scrollable>`));
  }

  // Need to discover if html or body is scrollable.
  // Here we are sure the page is scrollable.
  let scrollTarget;
  document.documentElement.scrollTop = 1;
  if (document.documentElement.scrollTop === 1) {
    document.documentElement.scrollTop = 0;
    scrollTarget = document.documentElement;
  } else {
    scrollTarget = document.body;
  }

  async function runAfterOpen(overlay) {
    return new Promise((resolve) => {
      overlay.addEventListener('iron-overlay-opened', resolve);
      overlay.open();
    });
  }

  async function runAfterClose(overlay) {
    return new Promise((resolve) => {
      overlay.addEventListener('iron-overlay-closed', resolve);
      overlay.close();
    });
  }

  function fireWheel(node, deltaX, deltaY) {
    // IE 11 doesn't support WheelEvent, use CustomEvent.
    const event = new CustomEvent('wheel', {
      cancelable: true,
      bubbles: true,
      composed: true,
    });
    event.deltaX = deltaX;
    event.deltaY = deltaY;
    node.dispatchEvent(event);
    return event;
  }

  function dispatchScroll(target, scrollLeft, scrollTop) {
    target.scrollLeft = scrollLeft;
    target.scrollTop = scrollTop;
    target.dispatchEvent(
        new CustomEvent('scroll', {bubbles: true, composed: false}));
  }

  describe('scroll actions', function() {
    let overlay;
    beforeEach(async () => {
      // Ensure we always scroll to top.
      dispatchScroll(scrollTarget, 0, 0);
      overlay = await basicFixture();
      await nextFrame();
    });

    it('default: outside scroll not prevented', async () => {
      await runAfterOpen(overlay);
      assert.isFalse(elementIsScrollLocked(scrollTarget));
      assert.isFalse(fireWheel(scrollTarget, 0, 10).defaultPrevented);
      dispatchScroll(scrollTarget, 0, 10);
      await nextFrame();
      assert.equal(scrollTarget.scrollTop, 10, 'scrollTop ok');
      assert.equal(scrollTarget.scrollLeft, 0, 'scrollLeft ok');
    });

    it('default: outside scroll does NOT trigger refit', async () => {
      await runAfterOpen(overlay);
      const refitSpy = sinon.spy(overlay, 'refit');
      dispatchScroll(scrollTarget, 0, 10);
      await nextFrame();
      assert.equal(refitSpy.callCount, 0, 'did not refit on scroll');
    });

    it('refit scrollAction does NOT refit the overlay on scroll inside', async () => {
      overlay.scrollAction = 'refit';
      await runAfterOpen(overlay);
      // Wait a tick, otherwise this fails in FF/Safari.
      await nextFrame();
      const refitSpy = sinon.spy(overlay, 'refit');
      dispatchScroll(overlay, 0, 10);
      await nextFrame();
      assert.equal(refitSpy.callCount, 0, 'did not refit on scroll inside');
    });

    it('refit scrollAction refits the overlay on scroll outside', async () => {
      overlay.scrollAction = 'refit';
      await runAfterOpen(overlay);
      const refitSpy = sinon.spy(overlay, 'refit');
      dispatchScroll(scrollTarget, 0, 10);
      await nextFrame();
      await nextFrame();
      assert.notEqual(refitSpy.callCount, 0, 'did refit on scroll outside');
    });

    it('cancel scrollAction does NOT close the overlay on scroll inside', async () => {
      overlay.scrollAction = 'cancel';
      await runAfterOpen(overlay);
      dispatchScroll(overlay, 0, 10);
      assert.isTrue(overlay.opened, 'overlay was not closed');
    });

    it('cancel scrollAction closes the overlay on scroll outside', (done) => {
      overlay.scrollAction = 'cancel';
      runAfterOpen(overlay)
      .then(() => {
        overlay.addEventListener('iron-overlay-canceled', function(event) {
          assert.equal(event.detail.type, 'scroll', 'detail contains original event');
          assert.equal(event.detail.target, scrollTarget, 'original scroll event target ok');
          overlay.addEventListener('iron-overlay-closed', function() {
            done();
          });
        });
        dispatchScroll(scrollTarget, 0, 10);
      });
    });


    it('lock scrollAction locks scroll', async () => {
      overlay.scrollAction = 'lock';
      await runAfterOpen(overlay);
      assert.isTrue(elementIsScrollLocked(scrollTarget));
      assert.isTrue(fireWheel(scrollTarget, 0, 10).defaultPrevented);
      dispatchScroll(scrollTarget, 0, 10);
      assert.equal(scrollTarget.scrollTop, 0, 'scrollTop ok');
      assert.equal(scrollTarget.scrollLeft, 0, 'scrollLeft ok');
    });

    it('should lock, only once', async () => {
      let openCount = 0;
      overlay.scrollAction = 'lock';
      await runAfterOpen(overlay);
      assert.isTrue(elementIsScrollLocked(scrollTarget));
      assert.isTrue(fireWheel(scrollTarget, 0, 10).defaultPrevented);
      assert.equal(_lockingElements.length, 1);
      if (openCount === 0) {
        // This triggers a second `pushScrollLock` with the same element,
        // however that should not add the element to the `_lockingElements`
        // stack twice
        await runAfterClose(overlay);
        assert.isFalse(elementIsScrollLocked(overlay));
        assert.isFalse(fireWheel(scrollTarget, 0, 10).defaultPrevented);
        overlay.open();
      } else {
        return;
      }
      openCount++;
    });
  });

  describe('scroll actions in shadow root', function() {
    let scrollable;
    let overlay;

    beforeEach(async () => {
      const f = await scrollableFixture();
      scrollable = f.shadowRoot.querySelector('#scrollable');
      overlay = f.shadowRoot.querySelector('#overlay');
    });

    it('refit scrollAction does NOT refit the overlay on scroll inside', async () => {
      overlay.scrollAction = 'refit';
      await runAfterOpen(overlay);
      const refitSpy = sinon.spy(overlay, 'refit');
      dispatchScroll(overlay, 0, 10);
      await nextFrame();
      assert.equal(refitSpy.callCount, 0, 'did not refit on scroll inside');
    });

    it('refit scrollAction refits the overlay on scroll outside', async () => {
      overlay.scrollAction = 'refit';
      await runAfterOpen(overlay);
      const refitSpy = sinon.spy(overlay, 'refit');
      dispatchScroll(scrollable, 0, 10);
      await nextFrame();
      await nextFrame();
      assert.notEqual(refitSpy.callCount, 0, 'did refit on scroll outside');
    });

    it('cancel scrollAction does NOT close the overlay on scroll inside', async () => {
      overlay.scrollAction = 'cancel';
      await runAfterOpen(overlay);
      dispatchScroll(overlay, 0, 10);
      assert.isTrue(overlay.opened, 'overlay was not closed');
    });

    it('cancel scrollAction closes the overlay on scroll outside', (done) => {
      overlay.scrollAction = 'cancel';
      runAfterOpen(overlay)
      .then(() => {
        overlay.addEventListener('iron-overlay-canceled', function(event) {
          assert.equal(
              event.detail.type, 'scroll', 'detail contains original event');
          assert.equal(
              event.detail.target,
              scrollable,
              'original scroll event target ok');
          overlay.addEventListener('iron-overlay-closed', function() {
            done();
          });
        });
        dispatchScroll(scrollable, 0, 10);
      });
    });
  });

  describe('scroll actions in shadow root, overlay distributed', function() {
    let scrollable;
    let overlay;

    beforeEach(async () => {
      const f = await scrollableFixture();
      scrollable = f.shadowRoot.querySelector('#scrollable');
      overlay = f.querySelector('test-overlay');
    });

    it('refit scrollAction does NOT refit the overlay on scroll inside', async () => {
      overlay.scrollAction = 'refit';
      await runAfterOpen(overlay);
      const refitSpy = sinon.spy(overlay, 'refit');
      dispatchScroll(overlay, 0, 10);
      await nextFrame();
      assert.equal(refitSpy.callCount, 0, 'did not refit on scroll inside');
    });

    it('refit scrollAction refits the overlay on scroll outside', async () => {
      overlay.scrollAction = 'refit';
      await runAfterOpen(overlay);
      const refitSpy = sinon.spy(overlay, 'refit');
      dispatchScroll(scrollable, 0, 10);
      await nextFrame();
      await nextFrame();
      assert.notEqual(refitSpy.callCount, 0, 'did refit on scroll outside');
    });

    it('cancel scrollAction does NOT close the overlay on scroll inside', async () => {
      overlay.scrollAction = 'cancel';
      await runAfterOpen(overlay);
      dispatchScroll(overlay, 0, 10);
      assert.isTrue(overlay.opened, 'overlay was not closed');
    });

    it('cancel scrollAction closes the overlay on scroll outside', (done) => {
      overlay.scrollAction = 'cancel';
      runAfterOpen(overlay)
      .then(() => {
        overlay.addEventListener('iron-overlay-canceled', function(event) {
          assert.equal(
              event.detail.type, 'scroll', 'detail contains original event');
          assert.equal(
              event.detail.target,
              scrollable,
              'original scroll event target ok');
          overlay.addEventListener('iron-overlay-closed', function() {
            done();
          });
        });
        dispatchScroll(scrollable, 0, 10);
      });
    });
  });
});
