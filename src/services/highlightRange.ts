// Range serialization, wrapping, and restore logic for v0.7 AI Response
// Highlights.
//
// Design principle: we NEVER store DOM nodes. A highlight is stored as a
// (messageId, startOffset, endOffset) triple plus the literal text and a
// little surrounding context. Offsets are character offsets into the
// assistant message's full text content. On restore we re-locate the text
// nodes by offset (with a fuzzy text-match fallback) and re-wrap them.

import {
  closestFallback,
  getConversationScroller,
  querySelectorAllFallback,
} from './chatgptSelectors';
import type {
  HighlightColor,
  HighlightStyle,
  ResponseHighlight,
} from './highlightStorage';

const HIGHLIGHT_CLASS = 'ai-chat-navigator-response-highlight';

function toElement(node: Node | null): Element | null {
  if (!node) {
    return null;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    return node as Element;
  }

  return node.parentElement;
}

export function getAssistantMessageRoot(node: Node | null): HTMLElement | null {
  const element = toElement(node);

  if (!element) {
    return null;
  }

  return closestFallback(element, 'assistantMessage');
}

// Same as getAssistantMessageRoot, but tolerates selections whose
// common ancestor sits above the assistant section (e.g. the user
// accidentally spans a sentence across two blocks, or ChatGPT nests
// the prose one level higher than the [data-turn] marker). It tries,
// in order: common ancestor, start container, end container, then any
// assistant section that fully contains the range.
export function getAssistantMessageRootFromRange(
  range: Range | null,
): HTMLElement | null {
  if (!range) {
    return null;
  }

  let root = getAssistantMessageRoot(range.commonAncestorContainer);

  if (root) {
    return root;
  }

  root =
    getAssistantMessageRoot(range.startContainer) ||
    getAssistantMessageRoot(range.endContainer);

  if (root) {
    return root;
  }

  const startElement = toElement(range.startContainer);
  const endElement = toElement(range.endContainer);

  if (!startElement || !endElement) {
    return null;
  }

  for (const section of querySelectorAllFallback(document.body, 'assistantMessage')) {
    if (section.contains(startElement) && section.contains(endElement)) {
      return section;
    }
  }

  return null;
}

function getMessageId(element: HTMLElement): string | null {
  const candidates = [
    element,
    element.closest('article'),
    element.closest('[data-testid^="conversation-turn"]'),
    element.closest('[data-turn-id]'),
    element.closest('[data-message-id]'),
  ].filter(Boolean) as HTMLElement[];

  for (const candidate of candidates) {
    const id =
      candidate.getAttribute('data-turn-id') ||
      candidate.getAttribute('data-message-id') ||
      candidate.getAttribute('data-testid');

    if (id) {
      return id;
    }
  }

  return null;
}

// Character offset of (container, offset) relative to the root's text content.
function getCharOffset(root: Element, container: Node, offset: number): number {
  const range = document.createRange();
  range.setStart(root, 0);
  range.setEnd(container, offset);

  return range.toString().length;
}

export function computeOffsets(range: Range, root: Element) {
  return {
    startOffset: getCharOffset(root, range.startContainer, range.startOffset),
    endOffset: getCharOffset(root, range.endContainer, range.endOffset),
  };
}

// Locate the text node + local offset that corresponds to a character offset
// within root. Returns null if the offset falls outside the text content.
export function locateOffset(
  root: Element,
  targetOffset: number,
): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let accumulated = 0;
  let last: Text | null = null;
  let lastLength = 0;
  let current = walker.nextNode() as Text | null;

  while (current) {
    const length = current.textContent?.length ?? 0;

    if (accumulated + length >= targetOffset) {
      return { node: current, offset: Math.max(0, targetOffset - accumulated) };
    }

    accumulated += length;
    last = current;
    lastLength = length;
    current = walker.nextNode() as Text | null;
  }

  if (last) {
    return { node: last, offset: lastLength };
  }

  return null;
}

// Read the literal text between two character offsets within root.
function getTextInRange(root: Element, fromOffset: number, toOffset: number): string {
  const start = locateOffset(root, fromOffset);
  const end = locateOffset(root, toOffset);

  if (!start || !end) {
    return '';
  }

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);

  return range.toString();
}

// Skip visually-hidden/accessibility-only text (e.g. "ChatGPT 说：", reasoning
// timing badges) so the highlight context preview shows only visible prose.
//
// A text node is considered hidden when:
//   - it renders to zero size (most common ChatGPT technique),
//   - it lives inside an sr-only / visually-hidden / aria-hidden / aria-live /
//     role=status / role=alert subtree,
//   - its ancestor is display:none / visibility:hidden / opacity:0,
//   - or the literal text is one of ChatGPT's known non-content labels.
const HIDDEN_CLASS_TOKENS = ['sr-only', 'visually-hidden', 'screen-reader'];
const HIDDEN_TEXT_TOKENS = [
  'ChatGPT 说：',
  'ChatGPT said:',
  '已思考',
  'Thought for',
  'reasoning',
  '语音模式',
  'Voice mode',
];

function isVisuallyHiddenText(node: Node, root: Element): boolean {
  const text = (node.textContent ?? '').trim();

  if (!text) {
    return true;
  }

  // Known non-content labels that ChatGPT injects near assistant turns.
  if (HIDDEN_TEXT_TOKENS.some((token) => text.includes(token))) {
    return true;
  }

  // Zero-size text nodes are not painted - skip them.
  if (node.nodeType === Node.TEXT_NODE) {
    try {
      const range = (node.ownerDocument ?? document).createRange();
      range.selectNodeContents(node);

      if (range.getClientRects().length === 0) {
        return true;
      }
    } catch {
      // If we can't measure, fall through to ancestor checks.
    }
  }

  let current: Node | null = node.parentNode;

  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as HTMLElement;
      const tag = el.tagName.toLowerCase();

      // UI controls are never message prose.
      if (tag === 'button' || tag === 'svg' || tag === 'path') {
        return true;
      }

      const role = el.getAttribute('role');
      if (
        role === 'toolbar' ||
        role === 'menu' ||
        role === 'button' ||
        role === 'option' ||
        role === 'status' ||
        role === 'alert'
      ) {
        return true;
      }

      const className = el.className?.toString().toLowerCase() ?? '';

      if (
        HIDDEN_CLASS_TOKENS.some((token) => className.includes(token)) ||
        el.getAttribute('aria-hidden') === 'true' ||
        el.getAttribute('aria-live')
      ) {
        return true;
      }

      const testid = el.getAttribute('data-testid') ?? '';
      if (
        /thought|reasoning|copy|read|regenerate|action|toolbar|menu|model|header|footnote|source/i.test(
          testid,
        )
      ) {
        return true;
      }

      const style = el.ownerDocument.defaultView?.getComputedStyle(el);

      if (
        style &&
        (style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0' ||
          (style.position === 'absolute' &&
            parseInt(style.height || '0', 10) <= 1 &&
            parseInt(style.width || '0', 10) <= 1))
      ) {
        return true;
      }
    }

    current = current.parentNode;
  }

  return false;
}

// Collect visible text between two character offsets (relative to `offsetRoot`),
// walking only nodes inside `walkRoot`. `walkRoot` is normally the assistant
// message content node, so header/footer UI chrome (model name, action
// buttons) is excluded even though the offsets are relative to the whole turn.
function getVisibleTextInRange(
  walkRoot: Element,
  offsetRoot: Element,
  fromOffset: number,
  toOffset: number,
): string {
  const walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_TEXT);
  let result = '';
  let current = walker.nextNode() as Text | null;

  while (current) {
    const text = current.textContent ?? '';
    const length = text.length;

    if (length > 0) {
      const nodeStartInRoot = getCharOffset(offsetRoot, current, 0);
      const nodeEndInRoot = nodeStartInRoot + length;

      if (
        nodeEndInRoot > fromOffset &&
        nodeStartInRoot < toOffset &&
        !isVisuallyHiddenText(current, offsetRoot)
      ) {
        const sliceStart = Math.max(0, fromOffset - nodeStartInRoot);
        const sliceEnd = Math.min(length, toOffset - nodeStartInRoot);
        result += text.slice(sliceStart, sliceEnd);
      }
    }

    current = walker.nextNode() as Text | null;
  }

  return result;
}

export function getContextAround(
  root: Element,
  startOffset: number,
  endOffset: number,
  contentRoot?: Element | null,
  radius = 25,
): { before: string; after: string } {
  const walkRoot = contentRoot ?? root;
  const rawBefore = getVisibleTextInRange(
    walkRoot,
    root,
    Math.max(0, startOffset - radius),
    startOffset,
  );
  const rawAfter = getVisibleTextInRange(walkRoot, root, endOffset, endOffset + radius);

  // Truncate at sentence boundaries so context never bleeds into the next
  // sentence (the #1 source of "noise" complaints).
  const truncateAtSentence = (s: string): string => {
    const idx = s.search(/[。！？\.!\n]/);
    return idx > 0 ? s.slice(0, idx + 1) : s;
  };

  return {
    before: truncateAtSentence(rawBefore),
    after: truncateAtSentence(rawAfter),
  };
}

function createHighlightMark(
  id: string,
  color: HighlightColor,
  style: HighlightStyle,
): HTMLElement {
  const mark = document.createElement('span');
  mark.className = HIGHLIGHT_CLASS;
  mark.dataset.highlightId = id;
  mark.dataset.color = color;
  mark.dataset.style = style;

  return mark;
}

// Find the closest block-level ancestor that should act as the wrapping
// boundary for a highlight. Splitting the range at these boundaries prevents
// invalid DOM structures (e.g. an inline <span> containing <p>/<pre>) that
// can crash React-driven pages like ChatGPT.
function getWrapContainer(node: Node, root: Element): Element {
  let current: Node | null = node;

  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const tag = (current as Element).tagName.toLowerCase();

      if (
        [
          'p',
          'pre',
          'li',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'blockquote',
          'div',
        ].includes(tag)
      ) {
        return current as Element;
      }
    }

    current = current.parentNode;
  }

  return root;
}

// Wrap a user selection safely. If the selection spans multiple block-level
// elements, split it into one mark per block instead of creating a single
// invalid <span> that contains block children.
export function wrapRange(
  range: Range,
  id: string,
  color: HighlightColor,
  style: HighlightStyle,
): HTMLElement | null {
  const root =
    range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? (range.commonAncestorContainer as Element)
      : range.commonAncestorContainer.parentElement;

  if (!root) {
    return null;
  }

  const fragments: Range[] = [];
  let currentRange: Range | null = null;
  let currentContainer: Element | null = null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode() as Text | null;

  while (textNode) {
    const nodeRange = document.createRange();
    nodeRange.selectNode(textNode);

    const startsAfter = range.compareBoundaryPoints(Range.START_TO_END, nodeRange) < 0;
    const endsBefore = range.compareBoundaryPoints(Range.END_TO_START, nodeRange) > 0;

    if (startsAfter || endsBefore) {
      textNode = walker.nextNode() as Text | null;
      continue;
    }

    const container = getWrapContainer(textNode, root);

    let startOffset = 0;
    let endOffset = textNode.textContent?.length ?? 0;

    if (textNode === range.startContainer) {
      startOffset = range.startOffset;
    }

    if (textNode === range.endContainer) {
      endOffset = range.endOffset;
    }

    if (startOffset >= endOffset) {
      textNode = walker.nextNode() as Text | null;
      continue;
    }

    if (container !== currentContainer) {
      if (currentRange) {
        fragments.push(currentRange);
      }

      currentRange = document.createRange();
      currentRange.setStart(textNode, startOffset);
      currentContainer = container;
    }

    if (currentRange) {
      currentRange.setEnd(textNode, endOffset);
    }

    textNode = walker.nextNode() as Text | null;
  }

  if (currentRange) {
    fragments.push(currentRange);
  }

  const createdMarks: HTMLElement[] = [];

  for (const subRange of fragments) {
    const mark = createHighlightMark(id, color, style);

    try {
      subRange.surroundContents(mark);
      createdMarks.push(mark);
    } catch {
      // If a single block still can't be wrapped (e.g. selection crosses an
      // inline element boundary in a way surroundContents dislikes), fall back
      // to extracting and inserting, which is less safe but only affects this
      // small fragment.
      try {
        mark.appendChild(subRange.extractContents());
        subRange.insertNode(mark);
        createdMarks.push(mark);
      } catch {
        // Ignore fragments we can't wrap.
      }
    }
  }

  return createdMarks[0] ?? null;
}

function findAssistantRootById(
  container: ParentNode,
  messageId: string,
): HTMLElement | null {
  const candidates = querySelectorAllFallback(container, 'assistantMessage');

  for (const element of candidates) {
    const turn = element.closest(
      '[data-turn-id], [data-message-id], [data-testid^="conversation-turn"]',
    );
    const id =
      turn?.getAttribute('data-turn-id') ||
      turn?.getAttribute('data-message-id') ||
      turn?.getAttribute('data-testid');

    if (id === messageId) {
      return element;
    }
  }

  return null;
}

export function findAssistantRootByText(
  container: ParentNode,
  text: string,
): HTMLElement | null {
  if (!text) {
    return null;
  }

  const needle = text.slice(0, 24);

  for (const element of querySelectorAllFallback(container, 'assistantMessage')) {
    if ((element.textContent || '').includes(needle)) {
      return element;
    }
  }

  return null;
}

export function restoreHighlight(highlight: ResponseHighlight, assistantRoot: HTMLElement) {
  if (assistantRoot.querySelector(`[data-highlight-id="${highlight.id}"]`)) {
    return;
  }

  let start = locateOffset(assistantRoot, highlight.startOffset);
  let end = locateOffset(assistantRoot, highlight.endOffset);

  if (!start || !end) {
    const content = assistantRoot.textContent || '';
    const index = content.indexOf(highlight.text);

    if (index >= 0) {
      const restoredStart = locateOffset(assistantRoot, index);
      const restoredEnd = locateOffset(assistantRoot, index + highlight.text.length);

      if (restoredStart && restoredEnd) {
        start = restoredStart;
        end = restoredEnd;
      }
    }
  }

  if (!start || !end) {
    console.warn('[AI Chat Navigator] 无法恢复高亮', highlight.id);
    return;
  }

  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  wrapRange(range, highlight.id, highlight.color, highlight.style);
}

export function applyHighlightsForConversation(
  highlights: ResponseHighlight[],
  container: ParentNode = document,
) {
  for (const highlight of highlights) {
    if (container.querySelector(`[data-highlight-id="${highlight.id}"]`)) {
      continue;
    }

    const assistantRoot =
      findAssistantRootById(container, highlight.messageId) ??
      findAssistantRootByText(container, highlight.text);

    if (assistantRoot) {
      restoreHighlight(highlight, assistantRoot);
    }
  }
}

export function removeHighlightMark(id: string, doc: Document = document) {
  const mark = doc.querySelector(`[data-highlight-id="${id}"]`);

  if (!mark || !mark.parentNode) {
    return;
  }

  const parent = mark.parentNode;
  while (mark.firstChild) {
    parent.insertBefore(mark.firstChild, mark);
  }
  parent.removeChild(mark);
  if (parent.normalize) {
    parent.normalize();
  }
}

// For long conversations ChatGPT only keeps a window of turns in the DOM. If
// the stored messageId refers to a turn outside that window, scroll to the
// corresponding edge to trigger loading older/newer messages.
//
// Returns the scroll direction we moved to ('top' | 'bottom' | null), so the
// caller can reverse direction on the next retry if the first guess didn't
// surface the target. Pass forceDirection to override the auto guess (used by
// the retry loop to try the opposite edge).
export function triggerLoadTargetTurn(
  highlight: ResponseHighlight,
  doc: Document,
  forceDirection?: 'top' | 'bottom',
): 'top' | 'bottom' | null {
  const scroller = getConversationScroller(doc);

  const turnElements = Array.from(
    doc.querySelectorAll('[data-testid^="conversation-turn"]'),
  );
  const numbers = turnElements
    .map((el) => {
      const m = el.getAttribute('data-testid')?.match(/conversation-turn-(\d+)/);

      return m ? parseInt(m[1], 10) : null;
    })
    .filter((n): n is number => n !== null);

  const turnMatch = highlight.messageId.match(/conversation-turn-(\d+)/);
  const targetN = turnMatch ? parseInt(turnMatch[1], 10) : null;

  let direction: 'top' | 'bottom';

  if (forceDirection) {
    direction = forceDirection;
  } else if (targetN !== null && numbers.length > 0) {
    const minN = Math.min(...numbers);
    const maxN = Math.max(...numbers);

    if (targetN >= minN && targetN <= maxN) {
      // Turn is already in the rendered window — no need to load.
      return null;
    }

    direction = targetN < minN ? 'top' : 'bottom';
  } else {
    // No numeric turn id in storage (older highlight) — assume the earliest
    // conversations live at the top. If the first guess fails, the caller's
    // retry will reverse direction.
    direction = 'top';
  }

  console.log('[AI Chat Navigator][diag] load-turn', {
    id: highlight.id,
    targetN,
    minN: numbers.length ? Math.min(...numbers) : null,
    maxN: numbers.length ? Math.max(...numbers) : null,
    direction,
  });

  if (direction === 'top') {
    scroller.scrollTop = 0;
  } else {
    scroller.scrollTop = scroller.scrollHeight;
  }

  return direction;
}

// Find the best DOM target for a highlight jump. This mirrors the way the
// timeline jump works: locate the turn (by data-testid), then the assistant
// section inside it, then fall back to text match. We return the element so
// the caller can scroll it with the same `scrollElementToContainerCenter`
// helper used by the timeline — that's been proven to work for both recent
// and older turns.
//
// Returns null when the turn is not currently in the DOM (ChatGPT virtual-
// scrolls long conversations). The caller can then use `triggerLoadTargetTurn`
// to scroll the real conversation container and poll for the element.
export function findHighlightTarget(
  highlight: ResponseHighlight,
  doc: Document = document,
): HTMLElement | null {
  // 1. Exact wrapped span — always the best target.
  const span = doc.querySelector<HTMLElement>(
    `[data-highlight-id="${highlight.id}"]`,
  );

  if (span) {
    return span;
  }

  // 2. Exact turn match. Highlights store the messageId we read from the
  // assistant section; on modern ChatGPT that id is the data-testid of the
  // outer conversation-turn-* section.
  const turn = doc.querySelector<HTMLElement>(
    `[data-testid="${highlight.messageId}"]`,
  );

  if (turn) {
    return (
      turn.querySelector<HTMLElement>('[data-turn="assistant"]') ??
      querySelectorAllFallback(turn, 'assistantMessage')[0] ??
      turn
    );
  }

  // 3. Legacy id formats.
  let section = doc.querySelector<HTMLElement>(
    `[data-turn-id="${highlight.messageId}"], [data-message-id="${highlight.messageId}"]`,
  );

  if (section) {
    return section;
  }

  // 4. Full text match inside any assistant section.
  section = findAssistantRootByText(doc, highlight.text);

  if (section) {
    return section;
  }

  // 5. Broader fuzzy match using the first non-empty line of the stored text.
  if (highlight.text) {
    const needle = highlight.text.split('\n').find((line) => line.trim())?.trim();

    if (needle && needle.length >= 2) {
      for (const candidate of querySelectorAllFallback(doc.body, 'assistantMessage')) {
        if ((candidate.textContent || '').includes(needle)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

// Legacy helper kept for compatibility with any existing callers. It now
// delegates to `findHighlightTarget` and uses `scrollIntoView`, which matches
// the browser-native behaviour expected by highlight re-apply loops.
export function scrollHighlightIntoView(
  highlight: ResponseHighlight,
  doc: Document = document,
): { scrolled: boolean; needsRetry: boolean } {
  const target = findHighlightTarget(highlight, doc);

  if (!target) {
    return { scrolled: false, needsRetry: true };
  }

  target.scrollIntoView({ block: 'center', behavior: 'auto' });

  return { scrolled: true, needsRetry: false };
}

// When stored messageId is a UUID (not conversation-turn-N), we cannot
// determine scroll direction numerically. This fallback searches the current
// DOM for any assistant section whose text contains the highlight text, then
// reads the turn number from its ancestor's data-testid.
export function resolveTargetTurnNumber(
  highlight: ResponseHighlight,
  doc: Document = document,
): number | null {
  // 1. Try parsing directly from messageId (handles future-proof storage).
  const direct = (highlight.messageId ?? '').match(/conversation-turn-(\d+)/);
  if (direct) {
    return parseInt(direct[1], 10);
  }

  // 2. Search visible assistant turns for one containing the highlight text.
  const needle = (highlight.text ?? '').slice(0, 24).trim();
  if (!needle) return null;

  for (const el of querySelectorAllFallback(doc.body, 'assistantMessage')) {
    if (!(el.textContent || '').includes(needle)) continue;

    // Walk up to find the enclosing conversation-turn-* and read its number.
    let ancestor: Element | null = el;
    while (ancestor) {
      const m = ancestor
        .getAttribute('data-testid')
        ?.match(/conversation-turn-(\d+)/);
      if (m) return parseInt(m[1], 10);
      ancestor = ancestor.parentElement;
    }
  }

  return null;
}

export { getMessageId };
