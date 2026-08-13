// Centralized DOM selectors for ChatGPT.
//
// All selectors the extension depends on live here so that, when ChatGPT
// changes its frontend, there is a single place to inspect and fix. Each key
// provides 1-N fallback candidates, ordered from the most stable (data-*
// attributes) to the most fragile (class-based) ones.

export const SELECTORS = {
  // User message anchor. ChatGPT (2026-07) wraps each turn in a
  // <section data-turn="user|assistant"> and only keeps the inner
  // [data-message-author-role="user"] div for older layouts. We list the
  // turn marker FIRST so we stay correct whether or not the inner role div
  // is present.
  userMessage: [
    '[data-turn="user"]',
    '[data-message-author-role="user"]',
    // Fallback for when ChatGPT wraps the role node in a slightly different
    // container but keeps the turn testid.
    '[data-testid^="conversation-turn"]:has([data-message-author-role="user"])',
  ],

  // AI (assistant) reply container. Used by the v0.7 Response Highlight
  // feature to know a text selection landed inside an assistant message
  // (and not the user's own prompt or the composer).
  //
  // IMPORTANT: only role/turn markers here — NOT class-based fallbacks like
  // [class*="markdown"]. A user prompt can also contain rendered markdown,
  // and a class fallback would wrongly classify the user's own message as an
  // assistant reply, popping the highlight toolbar on the wrong text.
  assistantMessage: [
    '[data-turn="assistant"]',
    '[data-message-author-role="assistant"]',
  ],

  // Prompt text container. Prefer the explicit message-content node; fall back
  // to the new highlighting-boundary wrapper ChatGPT (2026-07) uses, then to
  // generic content elements when ChatGPT drops the data-testid.
  messageContent: [
    '[data-testid="message-content"]',
    '[data-custom-highlighting-behavior="boundary"]',
    '[class*="whitespace-pre-wrap"]',
    '[class*="markdown"]',
    'p',
    'pre',
    'code',
  ],

  // Bubble wrapping a message (used to size the highlight overlay).
  messageBubble: [
    '[class*="rounded"]',
    '[class*="message"]',
    '[data-message-author-role="user"]',
  ],

  // Stable turn identifiers (preferred over class names).
  turnId: [
    '[data-turn-id]',
    '[data-message-id]',
    '[data-testid^="conversation-turn"]',
  ],

  // Scrollable container that represents one prompt turn.
  scrollContainer: ['article', '[data-testid^="conversation-turn"]'],

  // Any element that may represent an attachment.
  attachment: [
    'img',
    'picture',
    'video',
    'audio',
    'canvas',
    'a[href]',
    '[download]',
    '[data-testid*="file" i]',
    '[data-testid*="attachment" i]',
    '[data-testid*="image" i]',
    '[data-testid*="upload" i]',
    '[aria-label*="file" i]',
    '[aria-label*="attachment" i]',
    '[aria-label*="image" i]',
    '[aria-label*="upload" i]',
    '[aria-label*="文件"]',
    '[aria-label*="附件"]',
    '[aria-label*="图片"]',
    '[aria-label*="上传"]',
  ],

  // The composer where the user types a new prompt.
  composer: [
    '#prompt-textarea',
    '[data-testid="composer-text-input"]',
    '[data-testid*="composer" i]',
    '[class*="composer" i]',
    'textarea',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '.ProseMirror',
  ],

  // Timestamp sources.
  timestamp: ['time', '[datetime]'],
} as const;

// True if `doc` appears to contain ChatGPT conversation turns.
// Used by getConversationDocument to choose between the top-level document
// and an iframe that actually hosts the conversation.
function hasConversationContent(doc: Document): boolean {
  return (
    doc.querySelectorAll(
      '[data-turn], [data-message-author-role], [data-testid^="conversation-turn"], article',
    ).length > 0
  );
}

// Resolve the document that actually holds the ChatGPT conversation.
//
// On pages like /g/<gpt>/c/<conv> the real conversation renders inside a
// same-origin iframe, while the content script's `document` may be the
// (empty) top-level document. Callers that need to query the conversation
// (e.g. the highlight jump) must use this instead of the bare `document`
// global, otherwise they silently operate on the wrong document.
export function getConversationDocument(): Document {
  if (hasConversationContent(document)) {
    return document;
  }

  try {
    const topDoc = window.top?.document ?? document;
    const frames = Array.from(topDoc.querySelectorAll('iframe'));

    for (const frame of frames) {
      const idoc = frame.contentDocument;

      if (idoc && hasConversationContent(idoc)) {
        return idoc;
      }
    }
  } catch {
    // Cross-origin iframe — skip silently.
  }

  return document;
}

// Find the element that actually scrolls the conversation. ChatGPT does NOT
// use the documentElement for scrolling — the conversation lives in a nested
// scroll container (typically a <main> descendant). Scrolling the wrong node
// (e.g. documentElement.scrollTo) silently does nothing, so jump-to-old-turn
// would never trigger history loading. We pick the scrollable ancestor that
// contains the most [data-turn] nodes.
export function getConversationScroller(doc: Document): HTMLElement {
  const turns = Array.from(doc.querySelectorAll<HTMLElement>('[data-turn]'));

  if (turns.length === 0) {
    return (doc.scrollingElement as HTMLElement) ?? doc.documentElement;
  }

  // Score every scrollable ancestor of every rendered turn. The REAL
  // conversation scroller contains the most turns; inner wrappers contain
  // only a few. Picking the highest-scoring one is robust across ChatGPT's
  // nested scroll layouts and matches what makes the timeline jump work.
  // MUST use AND (overflowY matches AND real overflow) so we never climb onto
  // a giant outer wrapper that has overflow but is not the real viewport
  // scroller (that was the v0.7.35 bug: scrollerClientHeight 467228).
  const isScrollable = (node: HTMLElement): boolean => {
    const style = doc.defaultView?.getComputedStyle(node);
    return (
      !!style &&
      /(auto|scroll|overlay)/.test(style.overflowY) &&
      node.scrollHeight > node.clientHeight + 2
    );
  };

  const score = new Map<HTMLElement, number>();
  for (const turn of turns) {
    let node: HTMLElement | null = turn.parentElement;
    while (node && node !== doc.body) {
      if (isScrollable(node)) {
        score.set(node, (score.get(node) ?? 0) + 1);
      }
      node = node.parentElement;
    }
  }

  let best: HTMLElement | null = null;
  let bestScore = -1;
  for (const [el, s] of score) {
    if (s > bestScore) {
      bestScore = s;
      best = el;
    }
  }

  return best ?? (doc.scrollingElement as HTMLElement) ?? doc.documentElement;
}

export type SelectorKey = keyof typeof SELECTORS;

// Selectors whose disappearance most likely means ChatGPT changed its UI.
// Checked by runDriftCheck after every scan.
export const CRITICAL_SELECTOR_KEYS: SelectorKey[] = [
  'userMessage',
  'messageContent',
  'composer',
];

// Query every candidate selector and return the union of matches (deduped,
// document order). If the primary selector is still present we use it; if it
// is gone we transparently fall back to the next candidate.
export function querySelectorAllFallback(
  root: ParentNode,
  key: SelectorKey,
): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const result: HTMLElement[] = [];

  for (const selector of SELECTORS[key]) {
    for (const element of root.querySelectorAll<HTMLElement>(selector)) {
      if (!seen.has(element)) {
        seen.add(element);
        result.push(element);
      }
    }
  }

  return result;
}

// Climb ancestors (including the element itself) and return the first match
// across all candidates.
export function closestFallback(
  element: Element | null,
  key: SelectorKey,
): HTMLElement | null {
  if (!element) {
    return null;
  }

  for (const selector of SELECTORS[key]) {
    const match = element.closest<HTMLElement>(selector);

    if (match) {
      return match;
    }
  }

  return null;
}

// True if the element itself matches any candidate selector.
export function matchesAny(element: Element, key: SelectorKey): boolean {
  return SELECTORS[key].some((selector) => {
    try {
      return element.matches(selector);
    } catch {
      return false;
    }
  });
}

export interface DriftCheckResult {
  missingSelectors: SelectorKey[];
  detected: boolean;
}

function looksLikeConversationPage(doc: Document): boolean {
  const pathname = doc.defaultView?.location.pathname ?? window.location.pathname;

  if (/\/c\//.test(pathname)) {
    return true;
  }

  if (doc.querySelectorAll('article').length > 0) {
    return true;
  }

  return false;
}

// Early-warning canary: detect when ChatGPT's UI changed enough that our
// selectors no longer match. This turns a SILENT failure (empty timeline) into
// a VISIBLE signal, without preventing the break itself.
//
// The key gotcha (2026-07): ChatGPT routinely drops/replaces individual
// testids (e.g. message-content became a hashed class + a
// data-custom-highlighting-behavior wrapper) while KEEPING the higher-level
// turn structure (data-turn / data-message-author-role / conversation-turn
// wrappers). Flagging on a single missing primary selector produced permanent
// false alarms. So "blind" now means: no conversation structure visible at
// all — only then is the extension truly unable to see the page.
export function runDriftCheck(
  doc: Document = getConversationDocument(),
): DriftCheckResult {
  const missingSelectors: SelectorKey[] = [];

  for (const key of CRITICAL_SELECTOR_KEYS) {
    const found = SELECTORS[key].some(
      (selector) => doc.querySelectorAll(selector).length > 0,
    );

    if (!found) {
      missingSelectors.push(key);
    }
  }

  const canSeeConversation =
    doc.querySelectorAll(
      '[data-turn], [data-message-author-role], [data-testid^="conversation-turn"], article',
    ).length > 0;

  const detected =
    !canSeeConversation &&
    doc.readyState === 'complete' &&
    looksLikeConversationPage(doc);

  if (detected) {
    console.warn(
      '[AI Chat Navigator] 检测到关键 DOM 选择器缺失，当前 ChatGPT 版本可能不兼容：',
      missingSelectors.join(', '),
    );
  }

  return { missingSelectors, detected };
}
