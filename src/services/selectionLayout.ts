// Layout helpers for the AI Response Highlight floating toolbar.
//
// Problem: when the user selects text inside a ChatGPT reply, ChatGPT itself
// pops up its OWN native selection menu ("询问 ChatGPT" / "开始写作"). Our
// highlight toolbar reacts to the same selection and — by default — floats at
// the exact same spot, so the two overlap.
//
// Solution: detect ChatGPT's native popup (by known selector hints + a
// geometry probe) and place our toolbar on the OPPOSITE side of the selection
// so the two never stack.

export type ToolbarPlacement = 'above' | 'below';

export interface ToolbarPosition {
  top: number;
  left: number;
  placement: ToolbarPlacement;
}

const TOOLBAR_GAP = 10;
// A selection popup is a small floating overlay — ignore anything larger.
const MAX_POPUP_HEIGHT = 220;
const MAX_POPUP_WIDTH = 420;
// How close (px, center-to-center) a floating element must be to the
// selection to be considered "the native popup".
const MAX_POPUP_DISTANCE = 280;

// Selector hints that may match ChatGPT's native selection menu. Kept broad on
// purpose — the exact class changes often, so the geometry probe below is the
// real safety net.
const NATIVE_POPUP_HINTS = [
  '[role="menu"]',
  '[class*="selection" i]',
  '[class*="popover" i]',
  '[class*="menu" i]',
  '[data-testid*="menu" i]',
  '[data-testid*="selection" i]',
];

/**
 * Find ChatGPT's native selection popup near the given selection rect.
 * Returns its bounding rect, or null if nothing plausible is found.
 */
export function findNativeSelectionPopup(
  selRect: DOMRect,
  ourRoot: HTMLElement | null,
): DOMRect | null {
  const candidates: HTMLElement[] = [];

  // (a) Known selector hints.
  for (const hint of NATIVE_POPUP_HINTS) {
    try {
      document
        .querySelectorAll<HTMLElement>(hint)
        .forEach((el) => candidates.push(el));
    } catch {
      // ignore invalid selector
    }
  }

  // (b) Geometry probe: sample a point just above and just below the
  // selection. Whichever floating element is there (and isn't ours) is almost
  // certainly the native popup.
  const probeYAbove = selRect.top - 8;
  const probeYBelow = selRect.bottom + 8;
  const probeX = selRect.left + selRect.width / 2;
  for (const probeY of [probeYAbove, probeYBelow]) {
    try {
      for (const el of document.elementsFromPoint(probeX, probeY)) {
        if (el instanceof HTMLElement) {
          candidates.push(el);
        }
      }
    } catch {
      // elementsFromPoint not available / out of viewport
    }
  }

  const selCx = selRect.left + selRect.width / 2;
  const selCy = selRect.top + selRect.height / 2;
  const seen = new Set<HTMLElement>();
  let bestRect: DOMRect | null = null;
  let bestDist = Infinity;

  const consider = (el: HTMLElement) => {
    if (seen.has(el)) return;
    seen.add(el);

    if (ourRoot && ourRoot.contains(el)) return;
    if (el.offsetWidth === 0 || el.offsetHeight === 0) return;

    // Climb to the nearest floating ancestor so we measure the whole popup
    // box rather than an inner text node.
    let node: HTMLElement | null = el;
    let container: HTMLElement = el;
    while (node && node !== document.body) {
      const pos = getComputedStyle(node).position;
      if (pos === 'fixed' || pos === 'absolute') {
        container = node;
        break;
      }
      node = node.parentElement;
    }

    const rect = container.getBoundingClientRect();
    if (rect.height > MAX_POPUP_HEIGHT || rect.width > MAX_POPUP_WIDTH) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(cx - selCx, cy - selCy);
    if (dist > MAX_POPUP_DISTANCE) return;

    if (dist < bestDist) {
      bestRect = rect;
      bestDist = dist;
    }
  };

  for (const el of candidates) {
    consider(el);
  }

  return bestRect;
}

/**
 * Decide where the highlight toolbar should float so it does not overlap
 * ChatGPT's native selection popup.
 *
 * - If the native popup sits above (or roughly at) the selection, place our
 *   toolbar BELOW the selection.
 * - Otherwise place it ABOVE (the default).
 * - The result is clamped to the viewport so it never slides off-screen.
 */
export function computeToolbarPosition(
  range: Range,
  ourRoot: HTMLElement | null,
): ToolbarPosition {
  const rect = range.getBoundingClientRect();
  const selCx = rect.left + rect.width / 2;

  const popupRect = findNativeSelectionPopup(rect, ourRoot);

  let placement: ToolbarPlacement = 'above';
  if (popupRect) {
    const popupCy = popupRect.top + popupRect.height / 2;
    const selCy = rect.top + rect.height / 2;
    // If the popup is above (or near) the selection, dodge below.
    if (popupCy <= selCy + 40) {
      placement = 'below';
    }
  }

  let top = placement === 'above' ? rect.top : rect.bottom;
  let left = selCx;

  // Clamp horizontally.
  left = Math.max(60, Math.min(window.innerWidth - 60, left));

  // Edge fallback: if the chosen side would push us off-screen, flip.
  if (placement === 'above' && top < 70) {
    placement = 'below';
    top = rect.bottom;
  } else if (
    placement === 'below' &&
    top > window.innerHeight - 90
  ) {
    placement = 'above';
    top = rect.top;
  }

  return { top, left, placement };
}
