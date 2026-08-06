import type { CSSProperties, MouseEvent } from 'react';
import type { PromptTimelineItem } from '../../services/chatgptPromptTimeline';
import {
  TIMELINE_NODE_GAP,
  TIMELINE_VERTICAL_PADDING,
  highlightMarkStyle,
} from './styles';

function getTimelineSignature(items: PromptTimelineItem[]) {
  return items
    .map(
      (item) =>
        `${item.id}:${item.matchKey}:${item.text}:${item.attachmentSummary || ''}:${
          item.timestampText || ''
        }:${
          item.timestampSource || ''
        }`,
    )
    .join('|');
}

function getElementCenterDiffFromViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const elementCenter = rect.top + rect.height / 2;
  const viewportCenter = window.innerHeight / 2;

  return elementCenter - viewportCenter;
}

function isDocumentScrollContainer(element: Element) {
  return element === document.documentElement || element === document.body;
}

function getScrollContainerForElement(element: HTMLElement) {
  let current = element.parentElement;

  while (current && current !== document.body) {
    const style = window.getComputedStyle(current);
    const canScrollY =
      /(auto|scroll|overlay)/.test(style.overflowY) &&
      current.scrollHeight > current.clientHeight + 2;

    if (canScrollY) {
      return current;
    }

    current = current.parentElement;
  }

  return document.scrollingElement || document.documentElement;
}

function getScrollContainerViewportCenter(container: Element) {
  if (isDocumentScrollContainer(container)) {
    return window.innerHeight / 2;
  }

  const rect = container.getBoundingClientRect();
  return rect.top + rect.height / 2;
}

function scrollElementToContainerCenter(element: HTMLElement) {
  const container = getScrollContainerForElement(element);
  const rect = element.getBoundingClientRect();
  const elementCenter = rect.top + rect.height / 2;
  const containerCenter = getScrollContainerViewportCenter(container);
  const diff = elementCenter - containerCenter;

  if (Math.abs(diff) <= 2) {
    return 0;
  }

  if (isDocumentScrollContainer(container)) {
    window.scrollTo({
      top: window.scrollY + diff,
      behavior: 'auto',
    });
  } else {
    container.scrollTop += diff;
  }

  return diff;
}

function getClosestVisibleTimelineItem(items: PromptTimelineItem[]) {
  const visibleItems = items
    .map((item) => {
      const rect = item.element.getBoundingClientRect();
      return {
        item,
        rect,
        distance: Math.abs(getElementCenterDiffFromViewport(item.element)),
      };
    })
    .filter(({ rect }) => rect.bottom > 0 && rect.top < window.innerHeight);

  if (visibleItems.length === 0) {
    return null;
  }

  visibleItems.sort((a, b) => a.distance - b.distance);
  return visibleItems[0].item;
}

function getPreviewAttachmentParts(item: PromptTimelineItem) {
  if (item.attachmentNames.length > 0) {
    const visibleNames = item.attachmentNames.slice(0, 2);
    const hiddenCount = item.attachmentNames.length - visibleNames.length;

    return {
      names: visibleNames,
      overflowLabel: hiddenCount > 0 ? `+${hiddenCount}` : null,
    };
  }

  if (item.attachmentSummary) {
    return {
      names: [item.attachmentSummary.replace(/^附件：/, '')],
      overflowLabel: null,
    };
  }

  return {
    names: [],
    overflowLabel: null,
  };
}

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

function parseTagsInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function getSearchHaystack(item: PromptTimelineItem) {
  return [
    item.text,
    item.previewText,
    item.attachmentSummary || '',
    ...item.attachmentNames,
  ]
    .join(' ')
    .toLocaleLowerCase();
}

function getAttachmentBadgeText(item: PromptTimelineItem) {
  if (item.attachmentNames.length > 0) {
    const [firstName] = item.attachmentNames;

    if (item.attachmentNames.length === 1) {
      return firstName;
    }

    return `${firstName} +${item.attachmentNames.length - 1}`;
  }

  if (item.attachmentSummary) {
    return item.attachmentSummary.replace(/^附件：/, '');
  }

  return null;
}

function renderHighlightedText(text: string, query: string) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return text;
  }

  const lowerText = text.toLocaleLowerCase();
  const matchIndex = lowerText.indexOf(normalizedQuery);

  if (matchIndex === -1) {
    return text;
  }

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + normalizedQuery.length);
  const after = text.slice(matchIndex + normalizedQuery.length);

  return (
    <>
      {before}
      <mark style={highlightMarkStyle}>{match}</mark>
      {after}
    </>
  );
}

function getClosestTimelineItemFromPointer(
  event: MouseEvent<HTMLOListElement>,
  items: PromptTimelineItem[],
) {
  const listElement = event.currentTarget;
  const rect = listElement.getBoundingClientRect();
  const yInList = event.clientY - rect.top + listElement.scrollTop;
  const index = Math.round(
    (yInList - TIMELINE_VERTICAL_PADDING - TIMELINE_NODE_GAP / 2) /
      TIMELINE_NODE_GAP,
  );
  const boundedIndex = Math.min(Math.max(index, 0), items.length - 1);

  return items[boundedIndex] || null;
}

function getFavoritesAnchorPosition() {
  const editable = document.querySelector<HTMLElement>(
    [
      '#prompt-textarea',
      '[data-testid="composer-text-input"]',
      'form textarea',
      'form [contenteditable="true"]',
    ].join(','),
  );
  const composer =
    editable?.closest<HTMLElement>('form') ||
    editable?.closest<HTMLElement>('[data-testid*="composer" i]') ||
    editable;

  if (composer) {
    const rect = composer.getBoundingClientRect();

    if (rect.width > 160 && rect.height > 24) {
      return {
        left: Math.max(12, Math.round(rect.left - 50)),
        top: Math.max(
          12,
          Math.min(
            window.innerHeight - 52,
            Math.round(rect.bottom - 44),
          ),
        ),
      };
    }
  }

  return {
    left: Math.max(12, Math.round(window.innerWidth / 2 - 440)),
    top: window.innerHeight - 64,
  };
}

function getHighlightsAnchorPosition() {
  // Keep the highlights panel flush against the left viewport edge, well away
  // from the ChatGPT conversation. It expands upward from the bottom-left so
  // it never overlaps the main thread.
  return {
    left: 12,
    top: window.innerHeight - 64,
  };
}

export {
  getTimelineSignature,
  getElementCenterDiffFromViewport,
  isDocumentScrollContainer,
  getScrollContainerForElement,
  getScrollContainerViewportCenter,
  scrollElementToContainerCenter,
  getClosestVisibleTimelineItem,
  getPreviewAttachmentParts,
  normalizeSearchValue,
  parseTagsInput,
  getSearchHaystack,
  getAttachmentBadgeText,
  renderHighlightedText,
  getClosestTimelineItemFromPointer,
  getFavoritesAnchorPosition,
  getHighlightsAnchorPosition,
};
