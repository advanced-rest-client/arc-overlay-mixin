/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at
http://polymer.github.io/LICENSE.txt The complete set of authors may be found at
http://polymer.github.io/AUTHORS.txt The complete set of contributors may be
found at http://polymer.github.io/CONTRIBUTORS.txt Code distributed by Google as
part of the polymer project is also subject to an additional IP rights grant
found at http://polymer.github.io/PATENTS.txt
*/
/**
 * Used to calculate the scroll direction during touch events.
 * @type {!Object}
 */
let lastTouchPosition = {pageX: 0, pageY: 0};
/**
 * Used to avoid computing event.path and filter scrollable nodes (better perf).
 * @type {?EventTarget}
 */
let lastRootTarget = null;
/**
 * @type {!Array<!Node>}
 */
let lastScrollableNodes = [];
/**
 * @type {!Array<string>}
 */
let scrollEvents = [
  // Modern `wheel` event for mouse wheel scrolling:
  'wheel',
  // Older, non-standard `mousewheel` event for some FF:
  'mousewheel',
  // IE:
  'DOMMouseScroll',
  // Touch enabled devices
  'touchstart',
  'touchmove'
];
// must be defined for modulizer
let _boundScrollHandler;
let currentLockingElement;

export const _lockingElements = [];
export let _lockedElementCache = null;
export let _unlockedElementCache = null;

/**
 * The IronScrollManager is intended to provide a central source
 * of authority and control over which elements in a document are currently
 * allowed to scroll.
 *
 */

/**
 * The current element that defines the DOM boundaries of the
 * scroll lock. This is always the most recently locking element.
 *
 * @return {!Node|undefined}
 */
export {currentLockingElement};

export function _hasCachedLockedElement(element) {
  return _lockedElementCache.indexOf(element) > -1;
}

export function _hasCachedUnlockedElement(element) {
  return _unlockedElementCache.indexOf(element) > -1;
}

export function _composedTreeContains(element, child) {
  // NOTE(cdata): This method iterates over content elements and their
  // corresponding distributed nodes to implement a contains-like method
  // that pierces through the composed tree of the ShadowDOM. Results of
  // this operation are cached (elsewhere) on a per-scroll-lock basis, to
  // guard against potentially expensive lookups happening repeatedly as
  // a user scrolls / touchmoves.
  let contentElements;
  let distributedNodes;
  let contentIndex;
  let nodeIndex;

  if (element.contains(child)) {
    return true;
  }

  contentElements = element.querySelectorAll('slot');

  for (contentIndex = 0; contentIndex < contentElements.length; ++contentIndex) {
    const slot = contentElements[contentIndex];
    distributedNodes = slot.assignedNodes();
    for (nodeIndex = 0; nodeIndex < distributedNodes.length; ++nodeIndex) {
      // Polymer 2.x returns slot.assignedNodes which can contain text nodes.
      if (distributedNodes[nodeIndex].nodeType !== Node.ELEMENT_NODE) {
        continue;
      }
      if (_composedTreeContains(distributedNodes[nodeIndex], child)) {
        return true;
      }
    }
  }

  return false;
}

export function _scrollInteractionHandler(event) {
  // Avoid canceling an event with cancelable=false, e.g. scrolling is in
  // progress and cannot be interrupted.
  if (event.cancelable && _shouldPreventScrolling(event)) {
    event.preventDefault();
  }
  // If event has targetTouches (touch event), update last touch position.
  if (event.targetTouches) {
    const touch = event.targetTouches[0];
    lastTouchPosition.pageX = touch.pageX;
    lastTouchPosition.pageY = touch.pageY;
  }
}
/**
 * Returns true if the provided element is "scroll locked", which is to
 * say that it cannot be scrolled via pointer or keyboard interactions.
 *
 * @param {!HTMLElement} element An HTML element instance which may or may
 * not be scroll locked.
 * @return {Boolean}
 */
export function elementIsScrollLocked(element) {
  const lockingElement = currentLockingElement;

  if (lockingElement === undefined) {
    return false;
  }

  let scrollLocked;

  if (_hasCachedLockedElement(element)) {
    return true;
  }

  if (_hasCachedUnlockedElement(element)) {
    return false;
  }

  scrollLocked = !!lockingElement && lockingElement !== element &&
      !_composedTreeContains(lockingElement, element);

  if (scrollLocked) {
    _lockedElementCache.push(element);
  } else {
    _unlockedElementCache.push(element);
  }

  return scrollLocked;
}

export function _lockScrollInteractions() {
  _boundScrollHandler = _boundScrollHandler || _scrollInteractionHandler.bind(undefined);
  for (let i = 0, l = scrollEvents.length; i < l; i++) {
    // NOTE: browsers that don't support objects as third arg will
    // interpret it as boolean, hence useCapture = true in this case.
    document.addEventListener(scrollEvents[i], _boundScrollHandler, {capture: true, passive: false});
  }
}

export function _unlockScrollInteractions() {
  for (let i = 0, l = scrollEvents.length; i < l; i++) {
    // NOTE: browsers that don't support objects as third arg will
    // interpret it as boolean, hence useCapture = true in this case.
    document.removeEventListener(scrollEvents[i], _boundScrollHandler, {capture: true, passive: false});
  }
}

/**
 * Push an element onto the current scroll lock stack. The most recently
 * pushed element and its children will be considered scrollable. All
 * other elements will not be scrollable.
 *
 * Scroll locking is implemented as a stack so that cases such as
 * dropdowns within dropdowns are handled well.
 *
 * @param {!HTMLElement} element The element that should lock scroll.
 */
export function pushScrollLock(element) {
  // Prevent pushing the same element twice
  if (_lockingElements.indexOf(element) >= 0) {
    return;
  }

  if (_lockingElements.length === 0) {
    _lockScrollInteractions();
  }

  _lockingElements.push(element);
  currentLockingElement = _lockingElements[_lockingElements.length - 1];

  _lockedElementCache = [];
  _unlockedElementCache = [];
}

/**
 * Remove an element from the scroll lock stack. The element being
 * removed does not need to be the most recently pushed element. However,
 * the scroll lock constraints only change when the most recently pushed
 * element is removed.
 *
 * @param {!HTMLElement} element The element to remove from the scroll
 * lock stack.
 */
export function removeScrollLock(element) {
  const index = _lockingElements.indexOf(element);

  if (index === -1) {
    return;
  }

  _lockingElements.splice(index, 1);
  currentLockingElement = _lockingElements[_lockingElements.length - 1];

  _lockedElementCache = [];
  _unlockedElementCache = [];

  if (_lockingElements.length === 0) {
    _unlockScrollInteractions();
  }
}

/**
 * @package
 */
export {_boundScrollHandler};

/**
 * Returns true if the event causes scroll outside the current locking
 * element, e.g. pointer/keyboard interactions, or scroll "leaking"
 * outside the locking element when it is already at its scroll boundaries.
 * @param {!Event} event
 * @return {boolean}
 * @package
 */
export function _shouldPreventScrolling(event) {
  // Update if root target changed. For touch events, ensure we don't
  // update during touchmove.
  const cp = event.composedPath && event.composedPath();
  const path = cp ? cp : event.path;
  const target = path[0];
  if (event.type !== 'touchmove' && lastRootTarget !== target) {
    lastRootTarget = target;
    lastScrollableNodes = _getScrollableNodes(path);
  }

  // Prevent event if no scrollable nodes.
  if (!lastScrollableNodes.length) {
    return true;
  }
  // Don't prevent touchstart event inside the locking element when it has
  // scrollable nodes.
  if (event.type === 'touchstart') {
    return false;
  }
  // Get deltaX/Y.
  const info = _getScrollInfo(event);
  // Prevent if there is no child that can scroll.
  return !_getScrollingNode(lastScrollableNodes, info.deltaX, info.deltaY);
}

/**
 * Returns an array of scrollable nodes up to the current locking element,
 * which is included too if scrollable.
 * @param {!Array<!Node>} nodes
 * @return {!Array<!Node>} scrollables
 * @package
 */
export function _getScrollableNodes(nodes) {
  const scrollables = [];
  const lockingIndex = nodes.indexOf(currentLockingElement);
  // Loop from root target to locking element (included).
  for (let i = 0; i <= lockingIndex; i++) {
    // Skip non-Element nodes.
    if (nodes[i].nodeType !== Node.ELEMENT_NODE) {
      continue;
    }
    const node = /** @type {!Element} */ (nodes[i]);
    // Check inline style before checking computed style.
    let style = node.style;
    if (style.overflow !== 'scroll' && style.overflow !== 'auto') {
      style = window.getComputedStyle(node);
    }
    if (style.overflow === 'scroll' || style.overflow === 'auto') {
      scrollables.push(node);
    }
  }
  return scrollables;
}

/**
 * Returns the node that is scrolling. If there is no scrolling,
 * returns undefined.
 * @param {!Array<!Node>} nodes
 * @param {number} deltaX Scroll delta on the x-axis
 * @param {number} deltaY Scroll delta on the y-axis
 * @return {!Node|undefined}
 * @package
 */
export function _getScrollingNode(nodes, deltaX, deltaY) {
  // No scroll.
  if (!deltaX && !deltaY) {
    return;
  }
  // Check only one axis according to where there is more scroll.
  // Prefer vertical to horizontal.
  const verticalScroll = Math.abs(deltaY) >= Math.abs(deltaX);
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    let canScroll = false;
    if (verticalScroll) {
      // delta < 0 is scroll up, delta > 0 is scroll down.
      canScroll = deltaY < 0 ?
          node.scrollTop > 0 :
          node.scrollTop < node.scrollHeight - node.clientHeight;
    } else {
      // delta < 0 is scroll left, delta > 0 is scroll right.
      canScroll = deltaX < 0 ?
          node.scrollLeft > 0 :
          node.scrollLeft < node.scrollWidth - node.clientWidth;
    }
    if (canScroll) {
      return node;
    }
  }
}

/**
 * Returns scroll `deltaX` and `deltaY`.
 * @param {!Event} event The scroll event
 * @return {{deltaX: number, deltaY: number}} Object containing the
 * x-axis scroll delta (positive: scroll right, negative: scroll left,
 * 0: no scroll), and the y-axis scroll delta (positive: scroll down,
 * negative: scroll up, 0: no scroll).
 * @package
 */
export function _getScrollInfo(event) {
  const info = {deltaX: event.deltaX, deltaY: event.deltaY};
  // Already available.
  if ('deltaX' in event) {
    // do nothing, values are already good.
  } else if ('wheelDeltaX' in event && 'wheelDeltaY' in event) {
    // Safari has scroll info in `wheelDeltaX/Y`.
    info.deltaX = -event.wheelDeltaX;
    info.deltaY = -event.wheelDeltaY;
  } else if ('wheelDelta' in event) {
    // IE10 has only vertical scroll info in `wheelDelta`.
    info.deltaX = 0;
    info.deltaY = -event.wheelDelta;
  } else if ('axis' in event) {
    // Firefox has scroll info in `detail` and `axis`.
    info.deltaX = event.axis === 1 ? event.detail : 0;
    info.deltaY = event.axis === 2 ? event.detail : 0;
  } else if (event.targetTouches) {
    // On mobile devices, calculate scroll direction.
    const touch = event.targetTouches[0];
    // Touch moves from right to left => scrolling goes right.
    info.deltaX = lastTouchPosition.pageX - touch.pageX;
    // Touch moves from down to up => scrolling goes down.
    info.deltaY = lastTouchPosition.pageY - touch.pageY;
  }
  return info;
}
