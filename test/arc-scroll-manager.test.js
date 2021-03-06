import {fixture, assert} from '@open-wc/testing';
import './x-scrollable-element.js';
import {keyboardEventFor} from '@polymer/iron-test-helpers/mock-interactions.js';
import {elementIsScrollLocked, pushScrollLock, removeScrollLock} from '../arc-scroll-manager.js';

describe('ArcScrollManager', () => {
  async function basicFixture() {
    return (await fixture(`
      <x-scrollable-element id="Parent">
        <div id="LightElement"></div>
      </x-scrollable-element>
    `));
  }

  const scrollEvents = [
    'wheel',
    'mousewheel',
    'DOMMouseScroll',
    'touchstart',
    'touchmove',
  ];

  describe('IronScrollManager', function() {
    let parent;
    let childOne;
    let childTwo;
    let grandChildOne;
    let grandChildTwo;
    let ancestor;
    let lightElement;

    beforeEach(async () => {
      parent = await basicFixture();
      childOne = parent.shadowRoot.querySelector('#ChildOne');
      childTwo = parent.shadowRoot.querySelector('#ChildTwo');
      grandChildOne = parent.shadowRoot.querySelector('#GrandchildOne');
      grandChildTwo = parent.shadowRoot.querySelector('#GrandchildTwo');
      lightElement = parent.querySelector('#LightElement');
      ancestor = document.body;
    });

    describe('constraining scroll in the DOM', function() {
      beforeEach(function() {
        pushScrollLock(childOne);
      });

      afterEach(function() {
        removeScrollLock(childOne);
      });

      it('recognizes sibling as locked', function() {
        assert.isTrue(elementIsScrollLocked(childTwo));
      });

      it('recognizes neice as locked', function() {
        assert.isTrue(elementIsScrollLocked(grandChildTwo));
      });

      it('recognizes parent as locked', function() {
        assert.isTrue(elementIsScrollLocked(parent));
      });

      it('recognizes light DOM element as locked', function() {
        assert.isTrue(elementIsScrollLocked(lightElement));
      });

      it('recognizes ancestor as locked', function() {
        assert.isTrue(elementIsScrollLocked(ancestor));
      });

      it('recognizes locking child as unlocked', function() {
        assert.isFalse(elementIsScrollLocked(childOne));
      });

      it('recognizes descendant of locking child as unlocked', function() {
        assert.isFalse(elementIsScrollLocked(grandChildOne));
      });

      it('unlocks locked elements when there are no locking elements', function() {
        removeScrollLock(childOne);
        assert.isFalse(elementIsScrollLocked(parent));
      });

      describe('various scroll events', function() {
        let events;

        beforeEach(function() {
          events = scrollEvents.map(function(scrollEvent) {
            const event = new CustomEvent(
                scrollEvent, {bubbles: true, cancelable: true, composed: true});
            event.deltaX = 0;
            event.deltaY = 10;
            return event;
          });
        });

        it('prevents wheel events from locked elements', function() {
          events.forEach(function(event) {
            childTwo.dispatchEvent(event);
            assert.isTrue(event.defaultPrevented, event.type + ' ok');
          });
        });

        it('allows wheel events when there are no locking elements', function() {
          removeScrollLock(childOne);
          events.forEach(function(event) {
            childTwo.dispatchEvent(event);
            assert.isFalse(event.defaultPrevented, event.type + ' ok');
          });
        });

        it('allows wheel events from unlocked elements', function() {
          events.forEach(function(event) {
            childOne.dispatchEvent(event);
            assert.isFalse(event.defaultPrevented, event.type + ' ok');
          });
        });

        it('touchstart is prevented if dispatched by an element outside the locking element', () => {
          const event = new CustomEvent(
              'touchstart',
              {bubbles: true, cancelable: true, composed: true});
          childTwo.dispatchEvent(event);
          assert.isTrue(event.defaultPrevented, event.type + ' ok');
        });

        it('touchstart is not prevented if dispatched by an element inside the locking element', () => {
          const event = new CustomEvent(
              'touchstart',
              {bubbles: true, cancelable: true, composed: true});
          grandChildOne.dispatchEvent(event);
          assert.isFalse(event.defaultPrevented, event.type + ' ok');
        });

        it('arrow keyboard events not prevented by manager', function() {
          // Even if these events might cause scrolling, they should not be
          // prevented because they might cause a11y issues (e.g. arrow keys
          // used for navigating the content). iron-dropdown is capable of
          // restoring the scroll position of the document if necessary.
          const left = keyboardEventFor('keydown', 37);
          const up = keyboardEventFor('keydown', 38);
          const right = keyboardEventFor('keydown', 39);
          const down = keyboardEventFor('keydown', 40);
          grandChildOne.dispatchEvent(left);
          grandChildOne.dispatchEvent(up);
          grandChildOne.dispatchEvent(right);
          grandChildOne.dispatchEvent(down);
          assert.isFalse(left.defaultPrevented, 'left ok');
          assert.isFalse(up.defaultPrevented, 'up ok');
          assert.isFalse(right.defaultPrevented, 'right ok');
          assert.isFalse(down.defaultPrevented, 'down ok');
        });
      });
    });
  });
});
