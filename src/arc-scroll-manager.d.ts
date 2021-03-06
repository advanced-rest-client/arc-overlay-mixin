export {_hasCachedLockedElement};

declare function _hasCachedLockedElement(): any;

export {_hasCachedUnlockedElement};

declare function _hasCachedUnlockedElement(): any;

export {_composedTreeContains};

declare function _composedTreeContains(): any;

export {_scrollInteractionHandler};

declare function _scrollInteractionHandler(): void;

export {elementIsScrollLocked};


/**
 * Returns true if the provided element is "scroll locked", which is to
 * say that it cannot be scrolled via pointer or keyboard interactions.
 */
declare function elementIsScrollLocked(element: HTMLElement): Boolean|null;

export {_lockScrollInteractions};

declare function _lockScrollInteractions(): void;

export {_unlockScrollInteractions};

declare function _unlockScrollInteractions(): void;

export {pushScrollLock};


/**
 * Push an element onto the current scroll lock stack. The most recently
 * pushed element and its children will be considered scrollable. All
 * other elements will not be scrollable.
 *
 * Scroll locking is implemented as a stack so that cases such as
 * dropdowns within dropdowns are handled well.
 */
declare function pushScrollLock(element: HTMLElement): void;

export {removeScrollLock};


/**
 * Remove an element from the scroll lock stack. The element being
 * removed does not need to be the most recently pushed element. However,
 * the scroll lock constraints only change when the most recently pushed
 * element is removed.
 */
declare function removeScrollLock(element: HTMLElement): void;

export {_shouldPreventScrolling};


/**
 * Returns true if the event causes scroll outside the current locking
 * element, e.g. pointer/keyboard interactions, or scroll "leaking"
 * outside the locking element when it is already at its scroll boundaries.
 */
declare function _shouldPreventScrolling(event: Event): boolean;

export {_getScrollableNodes};


/**
 * Returns an array of scrollable nodes up to the current locking element,
 * which is included too if scrollable.
 *
 * @returns scrollables
 */
declare function _getScrollableNodes(nodes: Node[]): Node[];

export {_getScrollingNode};


/**
 * Returns the node that is scrolling. If there is no scrolling,
 * returns undefined.
 */
declare function _getScrollingNode(nodes: Node[], deltaX: number, deltaY: number): Node|undefined;

export {_getScrollInfo};


/**
 * Returns scroll `deltaX` and `deltaY`.
 *
 * @returns Object containing the
 * x-axis scroll delta (positive: scroll right, negative: scroll left,
 * 0: no scroll), and the y-axis scroll delta (positive: scroll down,
 * negative: scroll up, 0: no scroll).
 */
declare function _getScrollInfo(event: Event): {deltaX: number, deltaY: number};
