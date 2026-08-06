interface NativeTimelineCandidate {
  element: HTMLElement;
  lineCount: number;
  score: number;
  rect: DOMRect;
  path: string;
  position: string;
  zIndex: string;
  text: string;
}

const PLUGIN_ROOT_SELECTOR = '#ai-chat-navigator-root';
const HIDDEN_ATTR = 'data-ai-chat-navigator-hidden-native-timeline';

function isInsidePlugin(element: HTMLElement) {
  return Boolean(element.closest(PLUGIN_ROOT_SELECTOR));
}

function isVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity) > 0
  );
}

function getElementText(element: HTMLElement) {
  return (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
}

function getDomPath(element: HTMLElement, doc: Document) {
  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== doc.body && parts.length < 7) {
    let part = current.tagName.toLowerCase();

    if (current.id) {
      part += `#${current.id}`;
    }

    if (typeof current.className === 'string' && current.className.trim()) {
      const classes = current.className
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 4)
        .join('.');

      if (classes) {
        part += `.${classes}`;
      }
    }

    const testId = current.getAttribute('data-testid');
    if (testId) {
      part += `[data-testid="${testId}"]`;
    }

    const role = current.getAttribute('role');
    if (role) {
      part += `[role="${role}"]`;
    }

    parts.unshift(part);
    current = current.parentElement;
  }

  return parts.join(' > ');
}

function isProtectedArea(element: HTMLElement) {
  if (isInsidePlugin(element)) {
    return true;
  }

  if (
    element.matches(
      [
        'html',
        'body',
        'main',
        'form',
        'textarea',
        'input',
        'select',
        '[contenteditable="true"]',
        '[data-message-author-role]',
      ].join(','),
    )
  ) {
    return true;
  }

  if (
    element.querySelector(
      [
        'textarea',
        'input',
        'select',
        '[contenteditable="true"]',
        '[data-message-author-role]',
      ].join(','),
    )
  ) {
    return true;
  }

  return false;
}

function looksLikeShortNativeTimelineLine(element: HTMLElement) {
  if (!isVisible(element)) {
    return false;
  }

  if (isInsidePlugin(element)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const text = getElementText(element);

  const nearRightButNotScrollbar =
    rect.left > window.innerWidth - 190 &&
    rect.right < window.innerWidth - 14 &&
    rect.right > window.innerWidth - 130;

  const shortHorizontalLine =
    rect.width >= 8 &&
    rect.width <= 76 &&
    rect.height >= 1 &&
    rect.height <= 8 &&
    rect.width >= rect.height * 2.5;

  const hasVisiblePaint =
    style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
    style.borderTopColor !== 'rgba(0, 0, 0, 0)' ||
    style.borderBottomColor !== 'rgba(0, 0, 0, 0)';

  const textIsTiny = text.length <= 3;

  return nearRightButNotScrollbar && shortHorizontalLine && hasVisiblePaint && textIsTiny;
}

function getPotentialContainer(lineElement: HTMLElement, doc: Document) {
  let current = lineElement.parentElement;
  let best: HTMLElement | null = null;

  while (current && current !== doc.body) {
    if (isInsidePlugin(current)) {
      return null;
    }

    const rect = current.getBoundingClientRect();
    const text = getElementText(current);

    const rightSideContainer =
      rect.left > window.innerWidth - 230 &&
      rect.right < window.innerWidth - 8 &&
      rect.width <= 220 &&
      rect.height >= 48;

    const textIsSmall = text.length <= 80;

    if (rightSideContainer && textIsSmall && !isProtectedArea(current)) {
      best = current;
    }

    current = current.parentElement;
  }

  return best;
}

function scoreContainer(container: HTMLElement, lineElements: HTMLElement[]) {
  const rect = container.getBoundingClientRect();
  const style = window.getComputedStyle(container);
  const text = getElementText(container);

  const lineCount = lineElements.filter((line) => container.contains(line)).length;

  let score = 0;

  if (lineCount >= 3) score += 3;
  if (lineCount >= 6) score += 2;
  if (rect.left > window.innerWidth - 230) score += 2;
  if (rect.right < window.innerWidth - 8) score += 2;
  if (rect.width <= 180) score += 2;
  if (rect.height >= 80) score += 1;
  if (text.length <= 40) score += 1;
  if (['fixed', 'sticky', 'absolute'].includes(style.position)) score += 1;

  return {
    lineCount,
    score,
    rect,
    position: style.position,
    zIndex: style.zIndex,
    text,
  };
}

function findNativeTimelineCandidates(doc: Document): NativeTimelineCandidate[] {
  const allElements = Array.from(doc.querySelectorAll<HTMLElement>('body *'));

  const lineElements = allElements.filter((element) =>
    looksLikeShortNativeTimelineLine(element),
  );

  const containerSet = new Set<HTMLElement>();

  for (const lineElement of lineElements) {
    const container = getPotentialContainer(lineElement, doc);

    if (container) {
      containerSet.add(container);
    }
  }

  return Array.from(containerSet)
    .map((container) => {
      const scored = scoreContainer(container, lineElements);

      return {
        element: container,
        lineCount: scored.lineCount,
        score: scored.score,
        rect: scored.rect,
        path: getDomPath(container, doc),
        position: scored.position,
        zIndex: scored.zIndex,
        text: scored.text,
      };
    })
    .filter((candidate) => {
      if (candidate.lineCount < 3) return false;
      if (candidate.score < 7) return false;
      if (isProtectedArea(candidate.element)) return false;

      return true;
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.rect.width - b.rect.width;
    });
}

function selectSafeCandidates(candidates: NativeTimelineCandidate[]) {
  const selected: NativeTimelineCandidate[] = [];

  for (const candidate of candidates) {
    const overlapsSelected = selected.some((selectedCandidate) => {
      return (
        selectedCandidate.element.contains(candidate.element) ||
        candidate.element.contains(selectedCandidate.element)
      );
    });

    if (!overlapsSelected) {
      selected.push(candidate);
    }

    if (selected.length >= 2) {
      break;
    }
  }

  return selected;
}

function hideCandidate(candidate: NativeTimelineCandidate) {
  const element = candidate.element;

  if (element.hasAttribute(HIDDEN_ATTR)) {
    return;
  }

  element.setAttribute(HIDDEN_ATTR, 'true');
  element.style.setProperty('display', 'none', 'important');
}

export function hideNativeChatGPTTimelineOnce(doc: Document = document) {
  const candidates = findNativeTimelineCandidates(doc);

  if (candidates.length === 0) {
    return;
  }

  const safeCandidates = selectSafeCandidates(candidates);

  for (const candidate of safeCandidates) {
    hideCandidate(candidate);
  }
}

export function startNativeChatGPTTimelineHider(doc: Document = document) {
  let debounceTimer: number | null = null;

  const run = () => {
    const win = doc.defaultView || window;
    win.requestAnimationFrame(() => {
      hideNativeChatGPTTimelineOnce(doc);
    });
  };

  run();

  const win = doc.defaultView || window;
  const delayedTimers = [
    win.setTimeout(run, 500),
    win.setTimeout(run, 1200),
    win.setTimeout(run, 2200),
  ];

  const observer = new (win.MutationObserver || MutationObserver)(() => {
    if (debounceTimer) {
      win.clearTimeout(debounceTimer);
    }

    debounceTimer = win.setTimeout(() => {
      run();
    }, 600);
  });

  observer.observe(doc.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();

    delayedTimers.forEach((timer) => {
      win.clearTimeout(timer);
    });

    if (debounceTimer) {
      win.clearTimeout(debounceTimer);
    }
  };
}