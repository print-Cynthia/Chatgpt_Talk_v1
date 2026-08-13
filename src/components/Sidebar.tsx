import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import {
  collectPromptTimelineItems,
  resolveLivePromptTimelineItem,
  type PromptTimelineItem,
} from '../services/chatgptPromptTimeline';
import {
  runDriftCheck,
  closestFallback,
  getConversationDocument,
  getConversationScroller,
} from '../services/chatgptSelectors';
import {
  addPromptFavorite,
  createPromptFavoriteTitle,
  getConversationIdentity,
  getFavoriteSourceKey,
  getPromptStorageId,
  loadImportantPromptIds,
  loadPromptFavorites,
  removePromptFavorite,
  setImportantPrompt,
  updatePromptFavorite,
  type ConversationIdentity,
  type PromptFavorite,
} from '../services/promptSaveStorage';
import {
  addHighlight,
  createHighlightId,
  loadHighlights,
  removeHighlight as removeStoredHighlight,
  updateHighlight,
  type HighlightColor,
  type HighlightStyle,
  type ResponseHighlight,
} from '../services/highlightStorage';
import {
  applyHighlightsForConversation,
  computeOffsets,
  extractTurnNumberFromElement,
  findAssistantRootByText,
  findHighlightTarget,
  getAssistantMessageRoot,
  getAssistantMessageRootFromRange,
  getContextAround,
  resolveTargetTurnNumber,
  getMessageId,
  removeHighlightMark,
  restoreHighlight,
  scrollConversationBy,
  wrapRange,
} from '../services/highlightRange';
import { SELECTION_PING_EVENT } from '../services/selectionBridge';
import {
  computeToolbarPosition,
  type ToolbarPlacement,
} from '../services/selectionLayout';
import { prefillComposer } from '../services/composerPrefill';
import { UI_VERSION_LABEL } from '../utils/version';
import { railShellStyle, highlightToastStyle } from './sidebar/styles';
import {
  getTimelineSignature,
  getClosestVisibleTimelineItem,
  scrollElementToContainerCenter,
  getClosestTimelineItemFromPointer,
  getFavoritesAnchorPosition,
  getHighlightsAnchorPosition,
  normalizeSearchValue,
  getSearchHaystack,
  parseTagsInput,
} from './sidebar/utils';
import { TimelineRail } from './sidebar/TimelineRail';
import { FinderPanel } from './sidebar/FinderPanel';
import { FavoritesPanel } from './sidebar/FavoritesPanel';
import { FavoriteDialog } from './sidebar/FavoriteDialog';
import { PreviewCard } from './sidebar/PreviewCard';
import { HighlightQuickBar } from './sidebar/HighlightQuickBar';
import { HighlightStylePanel } from './sidebar/HighlightStylePanel';
import { HighlightCard } from './sidebar/HighlightCard';
import { HighlightsPanel } from './sidebar/HighlightsPanel';

const STYLE_ID = 'ai-chat-navigator-timeline-style';
const LEGACY_STYLE_ID = 'ai-chat-navigator-page-highlight-style';
const HIGHLIGHT_CLASS_NAME = 'ai-chat-navigator-soft-glow';
const SCROLL_TARGET_CLASS_NAME = 'ai-chat-navigator-scroll-target';

const JUMP_CORRECTION_DELAYS = [50, 160, 380, 800];
const ACTIVE_LOCK_AFTER_JUMP_MS = 1900;
const PREVIEW_DISMISS_DELAY_MS = 550;

function injectTimelineStyles() {
  document.getElementById(LEGACY_STYLE_ID)?.remove();

  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .ai-chat-navigator-node-list::-webkit-scrollbar {
      width: 0;
      height: 0;
    }

    .ai-chat-navigator-node-button {
      appearance: none;
      -webkit-appearance: none;
      outline: none;
      -webkit-tap-highlight-color: transparent;
      pointer-events: none;
    }

    .ai-chat-navigator-node-button:focus-visible .ai-chat-navigator-stripe {
      box-shadow:
        0 0 0 4px rgba(17, 24, 39, 0.08),
        0 0 0 1px rgba(17, 24, 39, 0.16) !important;
    }

    .${SCROLL_TARGET_CLASS_NAME} {
      scroll-margin-top: 120px !important;
      scroll-margin-bottom: 160px !important;
    }

    @keyframes aiChatNavigatorSoftGlowPulse {
      0% {
        box-shadow:
          0 0 0 0 rgba(37, 99, 235, 0),
          0 0 0 rgba(37, 99, 235, 0);
        filter: drop-shadow(0 0 0 rgba(37, 99, 235, 0));
      }

      20% {
        box-shadow:
          0 0 0 5px rgba(37, 99, 235, 0.08),
          0 0 18px rgba(37, 99, 235, 0.18);
        filter: drop-shadow(0 0 10px rgba(37, 99, 235, 0.16));
      }

      65% {
        box-shadow:
          0 0 0 8px rgba(37, 99, 235, 0.04),
          0 0 22px rgba(37, 99, 235, 0.12);
        filter: drop-shadow(0 0 8px rgba(37, 99, 235, 0.10));
      }

      100% {
        box-shadow:
          0 0 0 12px rgba(37, 99, 235, 0),
          0 0 26px rgba(37, 99, 235, 0);
        filter: drop-shadow(0 0 0 rgba(37, 99, 235, 0));
      }
    }

    .${HIGHLIGHT_CLASS_NAME} {
      border-radius: 14px !important;
      animation: aiChatNavigatorSoftGlowPulse 1.15s ease-out forwards !important;
    }

    .ai-chat-navigator-response-highlight {
      border-radius: 3px;
      padding: 0 1px;
      cursor: pointer;
    }

    .ai-chat-navigator-response-highlight[data-color="yellow"] {
      --hl: rgba(250, 204, 21, 0.34);
      --hl-strong: #d99a00;
      --hl-text: #7c5e00;
    }
    .ai-chat-navigator-response-highlight[data-color="pink"] {
      --hl: rgba(244, 114, 182, 0.30);
      --hl-strong: #db2777;
      --hl-text: #9d174d;
    }
    .ai-chat-navigator-response-highlight[data-color="green"] {
      --hl: rgba(74, 222, 128, 0.30);
      --hl-strong: #16a34a;
      --hl-text: #14532d;
    }
    .ai-chat-navigator-response-highlight[data-color="blue"] {
      --hl: rgba(96, 165, 250, 0.30);
      --hl-strong: #2563eb;
      --hl-text: #1e3a8a;
    }
    .ai-chat-navigator-response-highlight[data-color="purple"] {
      --hl: rgba(192, 132, 252, 0.30);
      --hl-strong: #7c3aed;
      --hl-text: #4c1d95;
    }

    .ai-chat-navigator-response-highlight[data-style="background"] {
      background: var(--hl);
    }
    .ai-chat-navigator-response-highlight[data-style="marker"] {
      background: linear-gradient(to top, var(--hl) 55%, transparent 55%);
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
    }
    .ai-chat-navigator-response-highlight[data-style="underline"] {
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 2px;
      text-decoration-color: var(--hl-strong);
    }
    .ai-chat-navigator-response-highlight[data-style="textColor"] {
      color: var(--hl-text);
    }
  `;

  document.head.appendChild(style);
}

export function Sidebar() {
  const [items, setItems] = useState<PromptTimelineItem[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewTop, setPreviewTop] = useState(160);
  const [isFinderOpen, setIsFinderOpen] = useState(false);
  const [isImportantOnly, setIsImportantOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversation, setConversation] = useState<ConversationIdentity>(() =>
    getConversationIdentity(),
  );
  const [importantPromptIds, setImportantPromptIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [favorites, setFavorites] = useState<PromptFavorite[]>([]);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [selectedFavoriteTag, setSelectedFavoriteTag] = useState<string | null>(
    null,
  );
  const [copiedFavoriteId, setCopiedFavoriteId] = useState<string | null>(null);
  const [favoritesAnchor, setFavoritesAnchor] = useState(() =>
    getFavoritesAnchorPosition(),
  );
  const [favoriteDraftItem, setFavoriteDraftItem] =
    useState<PromptTimelineItem | null>(null);
  const [favoriteDraftTitle, setFavoriteDraftTitle] = useState('');
  const [favoriteDraftTagsInput, setFavoriteDraftTagsInput] = useState('');
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [favoriteSaveError, setFavoriteSaveError] = useState('');
  const [driftDetected, setDriftDetected] = useState(false);

  const [highlights, setHighlights] = useState<ResponseHighlight[]>([]);
  const highlightsRef = useRef<ResponseHighlight[]>([]);
  const [isHighlightsOpen, setIsHighlightsOpen] = useState(false);
  const [selectedHighlightTag, setSelectedHighlightTag] = useState<string | null>(
    null,
  );
  const [highlightAnchor, setHighlightAnchor] = useState(() =>
    getHighlightsAnchorPosition(),
  );
  const [toolbar, setToolbar] = useState<
    { top: number; left: number; placement: ToolbarPlacement } | null
  >(null);
  const [toolbarNote, setToolbarNote] = useState('');
  const [selectionStep, setSelectionStep] = useState<'none' | 'quick' | 'style'>(
    'none',
  );
  const [pendingColor, setPendingColor] = useState<HighlightColor>('yellow');
  const [pendingStyle, setPendingStyle] = useState<HighlightStyle>('background');
  useEffect(() => {
    console.log(`[AI Chat Navigator] content script active — ${UI_VERSION_LABEL}`);
  }, []);
  const [editingHighlight, setEditingHighlight] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const toolbarPositionTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const nodeListRef = useRef<HTMLOListElement | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const lastSignatureRef = useRef('');
  const itemCountRef = useRef(0);
  const shouldAutoScrollToBottomRef = useRef(false);
  const activeLockUntilRef = useRef(0);
  const jumpSequenceRef = useRef(0);
  const previewDismissTimerRef = useRef<number | null>(null);

  const cancelPreviewDismiss = useCallback(() => {
    if (previewDismissTimerRef.current === null) {
      return;
    }

    window.clearTimeout(previewDismissTimerRef.current);
    previewDismissTimerRef.current = null;
  }, []);

  const schedulePreviewDismiss = useCallback(() => {
    cancelPreviewDismiss();
    previewDismissTimerRef.current = window.setTimeout(() => {
      setHoveredId(null);
      previewDismissTimerRef.current = null;
    }, PREVIEW_DISMISS_DELAY_MS);
  }, [cancelPreviewDismiss]);

  const hoveredItem = useMemo(() => {
    return items.find((item) => item.id === hoveredId) || null;
  }, [items, hoveredId]);

  const hoveredIndex = useMemo(() => {
    return hoveredId ? items.findIndex((item) => item.id === hoveredId) : -1;
  }, [hoveredId, items]);

  const normalizedSearchQuery = useMemo(
    () => normalizeSearchValue(searchQuery),
    [searchQuery],
  );

  const finderItems = useMemo(() => {
    const viewItems = isImportantOnly
      ? items.filter((item) => importantPromptIds.has(getPromptStorageId(item)))
      : items;

    if (!normalizedSearchQuery) {
      return viewItems;
    }

    return viewItems.filter((item) =>
      getSearchHaystack(item).includes(normalizedSearchQuery),
    );
  }, [importantPromptIds, isImportantOnly, items, normalizedSearchQuery]);

  const favoriteIdBySource = useMemo(() => {
    return new Map(
      favorites.map((favorite) => [
        getFavoriteSourceKey(favorite.conversationId, favorite.promptId),
        favorite.favoriteId,
      ]),
    );
  }, [favorites]);

  const favoriteTagOptions = useMemo(() => {
    return Array.from(
      new Set(favorites.flatMap((favorite) => favorite.tags)),
    ).sort();
  }, [favorites]);

  const visibleFavorites = useMemo(() => {
    if (!selectedFavoriteTag) {
      return favorites;
    }

    return favorites.filter((favorite) =>
      favorite.tags.includes(selectedFavoriteTag),
    );
  }, [favorites, selectedFavoriteTag]);

  const favoriteDraftTagSet = useMemo(
    () => new Set(parseTagsInput(favoriteDraftTagsInput)),
    [favoriteDraftTagsInput],
  );

  const highlightTagOptions = useMemo(() => {
    return Array.from(
      new Set(highlights.flatMap((highlight) => highlight.tags)),
    ).sort();
  }, [highlights]);

  const visibleHighlights = useMemo(() => {
    if (!selectedHighlightTag) {
      return highlights;
    }

    return highlights.filter((highlight) =>
      highlight.tags.includes(selectedHighlightTag),
    );
  }, [highlights, selectedHighlightTag]);

  const editingHighlightData = useMemo(
    () => highlights.find((highlight) => highlight.id === editingHighlight?.id) || null,
    [highlights, editingHighlight],
  );

  useEffect(() => {
    if (selectedFavoriteTag && !favoriteTagOptions.includes(selectedFavoriteTag)) {
      setSelectedFavoriteTag(null);
    }
  }, [favoriteTagOptions, selectedFavoriteTag]);

  useEffect(() => {
    return () => {
      cancelPreviewDismiss();
    };
  }, [cancelPreviewDismiss]);

  const syncItems = useCallback((nextItems: PromptTimelineItem[]) => {
    const nextSignature = getTimelineSignature(nextItems);

    if (nextSignature === lastSignatureRef.current) {
      return;
    }

    const listElement = nodeListRef.current;
    const isNearBottom = listElement
      ? listElement.scrollHeight -
          listElement.scrollTop -
          listElement.clientHeight <
        80
      : true;

    const hasNewItems = nextItems.length > itemCountRef.current;

    shouldAutoScrollToBottomRef.current = hasNewItems && isNearBottom;
    lastSignatureRef.current = nextSignature;
    itemCountRef.current = nextItems.length;

    setItems(nextItems);
  }, []);

  const scanTimeline = useCallback(() => {
    const conversationDoc = getConversationDocument();
    const nextConversation = getConversationIdentity();

    setConversation((currentConversation) => {
      if (
        currentConversation.conversationId === nextConversation.conversationId &&
        currentConversation.conversationUrl === nextConversation.conversationUrl
      ) {
        return currentConversation;
      }

      return nextConversation;
    });

    const collected = collectPromptTimelineItems();
    syncItems(collected);

    // Self-healing drift flag: if we actually collected any prompts the page
    // is readable, so the warning bar must never show. We only consult the
    // (already conservative) drift check when the timeline is genuinely empty,
    // and even then it only reports "blind" when NO conversation structure is
    // visible at all. This prevents a single transient scan during page load
    // from permanently latching the bar on.
    const driftResult =
      collected.length > 0
        ? { detected: false, missingSelectors: [] as string[] }
        : runDriftCheck(conversationDoc);
    setDriftDetected(driftResult.detected);
    if (collected.length === 0 || driftResult.detected) {
      console.log('[AI Chat Navigator][diag] scan', {
        href: window.location.href,
        readyState: conversationDoc.readyState,
        dataTurn: conversationDoc.querySelectorAll('[data-turn]').length,
        dataTurnUser: conversationDoc.querySelectorAll('[data-turn="user"]').length,
        article: conversationDoc.querySelectorAll('article').length,
        collected: collected.length,
        drift: driftResult.detected,
        missing: driftResult.missingSelectors,
      });
    }
    applyHighlightsForConversation(highlightsRef.current, conversationDoc);
  }, [syncItems]);

  useEffect(() => {
    let isCancelled = false;

    loadImportantPromptIds(conversation.conversationId).then((promptIds) => {
      if (!isCancelled) {
        setImportantPromptIds(promptIds);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [conversation.conversationId]);

  useEffect(() => {
    let isCancelled = false;

    loadPromptFavorites().then((storedFavorites) => {
      if (!isCancelled) {
        setFavorites(storedFavorites);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const updateFavoritesAnchor = () => {
      setFavoritesAnchor(getFavoritesAnchorPosition());
    };
    const timers = [
      window.setTimeout(updateFavoritesAnchor, 0),
      window.setTimeout(updateFavoritesAnchor, 600),
      window.setTimeout(updateFavoritesAnchor, 1600),
    ];

    window.addEventListener('resize', updateFavoritesAnchor);
    window.addEventListener('scroll', updateFavoritesAnchor, { passive: true });
    document.addEventListener('focusin', updateFavoritesAnchor);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('resize', updateFavoritesAnchor);
      window.removeEventListener('scroll', updateFavoritesAnchor);
      document.removeEventListener('focusin', updateFavoritesAnchor);
    };
  }, []);

  useEffect(() => {
    const updateHighlightAnchor = () => {
      setHighlightAnchor(getHighlightsAnchorPosition());
    };
    const timers = [
      window.setTimeout(updateHighlightAnchor, 0),
      window.setTimeout(updateHighlightAnchor, 600),
      window.setTimeout(updateHighlightAnchor, 1600),
    ];

    window.addEventListener('resize', updateHighlightAnchor);
    window.addEventListener('scroll', updateHighlightAnchor, { passive: true });
    document.addEventListener('focusin', updateHighlightAnchor);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('resize', updateHighlightAnchor);
      window.removeEventListener('scroll', updateHighlightAnchor);
      document.removeEventListener('focusin', updateHighlightAnchor);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    loadHighlights(conversation.conversationId).then((storedHighlights) => {
      if (isCancelled) {
        return;
      }

      highlightsRef.current = storedHighlights;
      setHighlights(storedHighlights);
    });

    return () => {
      isCancelled = true;
    };
  }, [conversation.conversationId]);

  useEffect(() => {
    const root = document.getElementById('ai-chat-navigator-root');
    const lastSelectionDiag = { current: 0 };
    const handleSelectionChange = () => {
      console.log('[AI Chat Navigator][diag] sel-ping-received');

      const activeElement = document.activeElement as Node | null;

      if (root && activeElement && root.contains(activeElement)) {
        console.log('[AI Chat Navigator][diag] early-return', { reason: 'activeElement in root' });
        return;
      }

      const selection = window.getSelection();

      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        console.log('[AI Chat Navigator][diag] early-return', {
          reason: 'collapsed/empty',
          isCollapsed: selection?.isCollapsed,
          rangeCount: selection?.rangeCount,
        });
        setToolbar(null);
        setSelectionStep('none');

        return;
      }

      const range = selection.getRangeAt(0);
      const node = range.commonAncestorContainer;
      const element =
        node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;

      if (!element) {
        console.log('[AI Chat Navigator][diag] early-return', { reason: 'no element' });
        setToolbar(null);

        return;
      }

      if (root && root.contains(element)) {
        console.log('[AI Chat Navigator][diag] early-return', { reason: 'element in root' });
        return;
      }

      const assistantRoot = getAssistantMessageRootFromRange(range);

      // Only treat the selection as "in composer" when it is NOT inside an
      // assistant message. ChatGPT's assistant replies sometimes contain
      // elements (e.g. contenteditable wrappers or role=textbox nodes) that
      // happen to match our broad composer fallbacks, so the assistant check
      // must win.
      if (!assistantRoot && closestFallback(element, 'composer')) {
        console.log('[AI Chat Navigator][diag] early-return', {
          reason: 'in composer',
          tagName: element.tagName,
          textPreview: (element.textContent ?? '').slice(0, 60),
        });
        setToolbar(null);

        return;
      }

      console.log('[AI Chat Navigator][diag] selection', {
        tagName: element.tagName,
        textPreview: (element.textContent ?? '').slice(0, 60),
        closestTurn:
          element?.closest?.('[data-turn]')?.getAttribute?.('data-turn') ?? null,
        startClosestTurn:
          range.startContainer.parentElement
            ?.closest?.('[data-turn]')
            ?.getAttribute?.('data-turn') ?? null,
        endClosestTurn:
          range.endContainer.parentElement
            ?.closest?.('[data-turn]')
            ?.getAttribute?.('data-turn') ?? null,
        assistantRoot: assistantRoot?.tagName ?? null,
        assistantRootSelector: assistantRoot?.getAttribute?.('data-turn') ?? null,
      });

      if (!assistantRoot) {
        const now = Date.now();
        if (now - lastSelectionDiag.current > 2000) {
          lastSelectionDiag.current = now;
          console.log('[AI Chat Navigator][diag] selection-ignored', {
            href: window.location.href,
            closestTurn:
              element?.closest?.('[data-turn]')?.getAttribute?.('data-turn') ?? null,
            startClosestTurn:
              range.startContainer.parentElement
                ?.closest?.('[data-turn]')
                ?.getAttribute?.('data-turn') ?? null,
            endClosestTurn:
              range.endContainer.parentElement
                ?.closest?.('[data-turn]')
                ?.getAttribute?.('data-turn') ?? null,
            inComposer: !!closestFallback(element, 'composer'),
            inRoot: !!(root && root.contains(element)),
          });
        }
        setToolbar(null);

        return;
      }

      selectionRangeRef.current = range;
      setToolbarNote('');
      setPendingColor('yellow');
      setPendingStyle('background');
      setSelectionStep('quick');
      // A new selection means the user is creating a highlight; close any
      // existing-highlight editor so the two panels don't overlap.
      setEditingHighlight(null);

      // Wait a tick for ChatGPT's OWN native selection popup to render, then
      // place our toolbar ONCE on the opposite side. Deciding only after the
      // native popup exists means we never have to flip placement later — the
      // earlier "show above, then jump below" jitter caused mis-clicks.
      if (toolbarPositionTimerRef.current) {
        window.clearTimeout(toolbarPositionTimerRef.current);
      }
      toolbarPositionTimerRef.current = window.setTimeout(() => {
        if (selectionRangeRef.current !== range) {
          return;
        }
        const pos = computeToolbarPosition(range, root);
        setToolbar(pos);
        console.log('[AI Chat Navigator][diag] quickbar-shown', {
          top: pos.top,
          left: pos.left,
          placement: pos.placement,
        });
      }, 130);
    };

    // The real DOM selection listeners live in the content-script module
    // scope (chatgpt.content.tsx) and ping this event so we don't depend on
    // React effect timing or isolated-world event quirks.
    document.addEventListener(SELECTION_PING_EVENT, handleSelectionChange);

    return () => {
      document.removeEventListener(SELECTION_PING_EVENT, handleSelectionChange);
    };
  }, []);

  useEffect(() => {
    const root = document.getElementById('ai-chat-navigator-root');
    const handleClick = (event: globalThis.MouseEvent) => {
      // If the user just finished a drag-to-select, the mouseup fires a click
      // event. Ignore it so we don't pop the highlight editor on top of the
      // quick-action bar.
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        return;
      }

      const target = event.target as HTMLElement | null;

      if (!target || (root && root.contains(target))) {
        return;
      }

      const mark = target.closest('[data-highlight-id]') as HTMLElement | null;

      if (!mark || !mark.dataset.highlightId) {
        setEditingHighlight(null);

        return;
      }

      const rect = mark.getBoundingClientRect();
      setEditingHighlight({
        id: mark.dataset.highlightId,
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Dismiss the transient highlight toolbar and the highlights collection
  // panel when the user clicks anywhere outside our own UI. This keeps the
  // floating panels from getting "stuck" on screen (issue: 悬浮板收起).
  useEffect(() => {
    if (!toolbar && !isHighlightsOpen) {
      return;
    }

    const root = document.getElementById('ai-chat-navigator-root');
    const handleOutside = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target || (root && root.contains(target))) {
        return;
      }

      if (toolbar) {
        setToolbar(null);
        setSelectionStep('none');
        selectionRangeRef.current = null;
      }

      if (isHighlightsOpen) {
        setIsHighlightsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [toolbar, isHighlightsOpen]);

  useEffect(() => {
    if (!shouldAutoScrollToBottomRef.current) {
      return;
    }

    window.requestAnimationFrame(() => {
      const listElement = nodeListRef.current;

      if (!listElement) {
        return;
      }

      listElement.scrollTop = listElement.scrollHeight;
      shouldAutoScrollToBottomRef.current = false;
    });
  }, [items.length]);

  useEffect(() => {
    const updateActiveFromScroll = () => {
      window.requestAnimationFrame(() => {
        if (Date.now() < activeLockUntilRef.current) {
          return;
        }

        const closestItem = getClosestVisibleTimelineItem(items);

        if (closestItem && closestItem.id !== activeId) {
          setActiveId(closestItem.id);
        }
      });
    };

    window.addEventListener('scroll', updateActiveFromScroll, { passive: true });
    window.addEventListener('resize', updateActiveFromScroll);
    updateActiveFromScroll();

    return () => {
      window.removeEventListener('scroll', updateActiveFromScroll);
      window.removeEventListener('resize', updateActiveFromScroll);
    };
  }, [items, activeId]);

  useEffect(() => {
    injectTimelineStyles();

    scanTimeline();

    const initialTimers = [
      window.setTimeout(scanTimeline, 500),
      window.setTimeout(scanTimeline, 1200),
      window.setTimeout(scanTimeline, 2200),
    ];

    const observer = new MutationObserver(() => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        scanTimeline();
      }, 300);
    });

    const conversationDoc = getConversationDocument();
    const observerRoot =
      conversationDoc.querySelector('main') ?? conversationDoc.body;

    observer.observe(observerRoot, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();

      initialTimers.forEach((timer) => {
        window.clearTimeout(timer);
      });

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [scanTimeline]);

  const handleNodeClick = useCallback(
    (itemId: string) => {
      const item = items.find((currentItem) => currentItem.id === itemId);

      if (!item) {
        return;
      }

      const resolved = resolveLivePromptTimelineItem(item);

      if (resolved.items.length > 0) {
        syncItems(resolved.items);
      }

      const liveItem = resolved.item;

      if (!liveItem) {
        return;
      }

      setActiveId(liveItem.id);
      activeLockUntilRef.current = Date.now() + ACTIVE_LOCK_AFTER_JUMP_MS;
      jumpSequenceRef.current += 1;
      const jumpSequence = jumpSequenceRef.current;

      document
        .querySelectorAll(
          `.${HIGHLIGHT_CLASS_NAME}, .${SCROLL_TARGET_CLASS_NAME}`,
        )
        .forEach((element) => {
          element.classList.remove(HIGHLIGHT_CLASS_NAME);
          element.classList.remove(SCROLL_TARGET_CLASS_NAME);
        });

      liveItem.element.classList.add(SCROLL_TARGET_CLASS_NAME);

      scrollElementToContainerCenter(liveItem.element);

      JUMP_CORRECTION_DELAYS.forEach((delay) => {
        window.setTimeout(() => {
          if (jumpSequence !== jumpSequenceRef.current) {
            return;
          }

          const currentResolved = resolveLivePromptTimelineItem(liveItem);
          const currentItem = currentResolved.item || liveItem;

          scrollElementToContainerCenter(currentItem.element);
          setActiveId(currentItem.id);
        }, delay);
      });

      const glowTarget = liveItem.highlightElement || liveItem.element;
      glowTarget.classList.add(HIGHLIGHT_CLASS_NAME);

      window.setTimeout(() => {
        liveItem.element.classList.remove(SCROLL_TARGET_CLASS_NAME);
        glowTarget.classList.remove(HIGHLIGHT_CLASS_NAME);
      }, 1150);
    },
    [items, syncItems],
  );

  const handleToggleImportant = useCallback(
    async (item: PromptTimelineItem) => {
      const promptId = getPromptStorageId(item);
      const wasImportant = importantPromptIds.has(promptId);
      const optimisticPromptIds = new Set(importantPromptIds);

      if (wasImportant) {
        optimisticPromptIds.delete(promptId);
      } else {
        optimisticPromptIds.add(promptId);
      }

      setImportantPromptIds(optimisticPromptIds);

      try {
        const savedPromptIds = await setImportantPrompt(
          conversation.conversationId,
          promptId,
          !wasImportant,
        );
        setImportantPromptIds(savedPromptIds);
      } catch (error) {
        console.error('AI Chat Navigator could not save important marker.', error);
        setImportantPromptIds(importantPromptIds);
      }
    },
    [conversation.conversationId, importantPromptIds],
  );

  const handleToggleFavorite = useCallback(
    async (item: PromptTimelineItem) => {
      const promptId = getPromptStorageId(item);
      const sourceKey = getFavoriteSourceKey(
        conversation.conversationId,
        promptId,
      );
      const existingFavoriteId = favoriteIdBySource.get(sourceKey);

      if (!existingFavoriteId) {
        cancelPreviewDismiss();
        setFavoriteDraftItem(item);
        setFavoriteDraftTitle(createPromptFavoriteTitle(item.text));
        setFavoriteDraftTagsInput('');
        setIsFavoritesOpen(false);
        setIsFinderOpen(false);
        return;
      }

      try {
        setFavorites(await removePromptFavorite(existingFavoriteId));
      } catch (error) {
        console.error('AI Chat Navigator could not update favorites.', error);
      }
    },
    [cancelPreviewDismiss, conversation.conversationId, favoriteIdBySource],
  );

  const handleCloseFavoriteDialog = useCallback(() => {
    setFavoriteDraftItem(null);
    setFavoriteDraftTitle('');
    setFavoriteDraftTagsInput('');
    setIsSavingFavorite(false);
    setFavoriteSaveError('');
  }, []);

  const handleToggleFavoriteDraftTag = useCallback(
    (tag: string) => {
      const nextTags = new Set(parseTagsInput(favoriteDraftTagsInput));

      if (nextTags.has(tag)) {
        nextTags.delete(tag);
      } else {
        nextTags.add(tag);
      }

      setFavoriteDraftTagsInput(Array.from(nextTags).join(', '));
    },
    [favoriteDraftTagsInput],
  );

  const handleConfirmFavoriteDialog = useCallback(async () => {
    if (!favoriteDraftItem || isSavingFavorite) {
      return;
    }

    setFavoriteSaveError('');
    setIsSavingFavorite(true);

    try {
      const nextFavorites = await addPromptFavorite(
        favoriteDraftItem,
        conversation,
        {
          title: favoriteDraftTitle,
          tags: parseTagsInput(favoriteDraftTagsInput),
        },
      );

      setFavorites(nextFavorites);
      handleCloseFavoriteDialog();
    } catch (error) {
      console.error('AI Chat Navigator could not save favorite.', error);
      setIsSavingFavorite(false);
      setFavoriteSaveError('保存失败，请重试');
    }
  }, [
    conversation,
    favoriteDraftItem,
    favoriteDraftTagsInput,
    favoriteDraftTitle,
    handleCloseFavoriteDialog,
    isSavingFavorite,
  ]);

  const handleRemoveFavorite = useCallback(async (favoriteId: string) => {
    try {
      setFavorites(await removePromptFavorite(favoriteId));
    } catch (error) {
      console.error('AI Chat Navigator could not remove favorite.', error);
    }
  }, []);

  const handleSaveFavorite = useCallback(
    async (favoriteId: string, title: string, tags: string[]) => {
      try {
        setFavorites(
          await updatePromptFavorite(favoriteId, {
            title,
            tags,
          }),
        );
      } catch (error) {
        console.error('AI Chat Navigator could not save favorite edits.', error);
      }
    },
    [],
  );

  const handleCopyFavorite = useCallback(async (favorite: PromptFavorite) => {
    try {
      await navigator.clipboard.writeText(favorite.promptFullText);
      setCopiedFavoriteId(favorite.favoriteId);
      window.setTimeout(() => {
        setCopiedFavoriteId((currentId) =>
          currentId === favorite.favoriteId ? null : currentId,
        );
      }, 1400);
    } catch (error) {
      console.error('AI Chat Navigator could not copy favorite.', error);
    }
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 1900);
  }, []);

  const isStreaming = useCallback(() => {
    return Boolean(
      document.querySelector('[data-testid="stop-button"]') ||
        document.querySelector('button[aria-label*="Stop" i]') ||
        document.querySelector('button[aria-label*="停止" i]'),
    );
  }, []);

  const handleCreateHighlight = useCallback(
    async (
      color: HighlightColor,
      style: HighlightStyle,
      note: string,
    ) => {
      const range = selectionRangeRef.current;

      if (!range) {
        return;
      }

      const assistantRoot = getAssistantMessageRootFromRange(range);

      if (!assistantRoot) {
        setToolbar(null);
        setSelectionStep('none');

        return;
      }

      if (isStreaming()) {
        showToast('AI 正在生成，稍后再标');
        setToolbar(null);
        setSelectionStep('none');

        return;
      }

      const messageId = getMessageId(assistantRoot) || '';
      const { startOffset, endOffset } = computeOffsets(range, assistantRoot);
      const text = range.toString();

      // Capture the stable conversation-turn-N number as a reliable jump
      // anchor. data-turn-id (UUID) can change on re-render/refresh and the
      // literal text can mismatch formatted replies, but this positional
      // number never changes for a given message in a conversation.
      const turnNumber = (() => {
        let ancestor: Element | null = assistantRoot;
        while (ancestor) {
          const m = ancestor
            .getAttribute('data-testid')
            ?.match(/conversation-turn-(\d+)/);
          if (m) {
            return parseInt(m[1], 10);
          }
          ancestor = ancestor.parentElement;
        }
        return undefined;
      })();

      // Narrow context collection to the actual message prose container,
      // excluding header/footer UI chrome (model name, action buttons, etc.).
      // Try multiple selectors because ChatGPT changes class names frequently.
      //
      // IMPORTANT: we deliberately avoid falling back to `assistantRoot` (the
      // whole <section data-turn="assistant">) because it contains sr-only
      // labels, action toolbars, model badges and sometimes text from adjacent
      // turns — all of which pollute the gray context preview with garbage
      // like "...AI summary etc." fragments (issue #1).
      //
      // If no dedicated content node is found, we narrow to the block-level
      // element that actually contains the selection (<p>, <pre>, <div>, …).
      // This keeps context inside the same paragraph/block as the highlighted
      // text and eliminates cross-boundary leakage.
      let contentRoot: Element | null =
        assistantRoot.querySelector('[data-testid="message-content"]') ||
        assistantRoot.querySelector('[data-custom-highlighting-behavior="boundary"]') ||
        assistantRoot.querySelector('.markdown') ||
        assistantRoot.querySelector('[class*="whitespace-pre-wrap"]');

      if (!contentRoot && range.startContainer) {
        // Walk up from the selection to the nearest block-level ancestor
        // that still lives inside assistantRoot.
        let walk: Node | null = range.startContainer;
        while (walk && walk !== assistantRoot) {
          if (walk.nodeType === Node.ELEMENT_NODE) {
            const tag = (walk as Element).tagName.toLowerCase();
            if (
              ['p', 'pre', 'li', 'div', 'blockquote', 'article', 'section'].includes(tag)
            ) {
              contentRoot = walk as Element;
              break;
            }
          }
          walk = walk.parentNode;
        }
      }

      if (!contentRoot) {
        contentRoot = assistantRoot;
      }
      const { before, after } = getContextAround(
        assistantRoot,
        startOffset,
        endOffset,
        contentRoot,
      );
      const highlight: ResponseHighlight = {
        id: createHighlightId(),
        conversationId: conversation.conversationId,
        messageId,
        turnNumber,
        startOffset,
        endOffset,
        text,
        contextBefore: before,
        contextAfter: after,
        color,
        style,
        note: note.trim(),
        tags: [],
        createdAt: Date.now(),
      };

      const wrapped = wrapRange(range, highlight.id, color, style);

      if (!wrapped) {
        showToast('高亮失败，请重试');

        return;
      }

      const nextList = [highlight, ...highlightsRef.current];
      highlightsRef.current = nextList;
      setHighlights(nextList);

      try {
        await addHighlight(highlight);
      } catch (error) {
        console.error('AI Chat Navigator could not save highlight.', error);
      }

      setToolbar(null);
      setSelectionStep('none');
      selectionRangeRef.current = null;
      window.getSelection()?.removeAllRanges();
    },
    [conversation.conversationId, isStreaming, showToast],
  );

  const handleAskFollowUp = useCallback(() => {
    const range = selectionRangeRef.current;
    const text = range ? range.toString() : '';

    if (text) {
      const ok = prefillComposer(text);
      if (!ok) {
        navigator.clipboard?.writeText(text).catch(() => {});
        showToast('未找到输入框，已复制到剪贴板');
      }
    }

    setToolbar(null);
    setSelectionStep('none');
    selectionRangeRef.current = null;
    window.getSelection()?.removeAllRanges();
  }, [showToast]);

  const handleConfirmHighlight = useCallback(
    async (color: HighlightColor, style: HighlightStyle, note: string) => {
      await handleCreateHighlight(color, style, note);
    },
    [handleCreateHighlight],
  );

  const handleRemoveHighlight = useCallback(
    async (id: string) => {
      removeHighlightMark(id, getConversationDocument());

      const nextList = highlightsRef.current.filter(
        (highlight) => highlight.id !== id,
      );
      highlightsRef.current = nextList;
      setHighlights(nextList);

      if (editingHighlight?.id === id) {
        setEditingHighlight(null);
      }

      try {
        await removeStoredHighlight(conversation.conversationId, id);
      } catch (error) {
        console.error('AI Chat Navigator could not remove highlight.', error);
      }
    },
    [conversation.conversationId, editingHighlight],
  );

  const handleUpdateHighlight = useCallback(
    async (
      id: string,
      patch: {
        color?: HighlightColor;
        style?: HighlightStyle;
        note?: string;
        tags?: string[];
      },
    ) => {
      const updated = highlightsRef.current.map((highlight) =>
        highlight.id === id ? { ...highlight, ...patch } : highlight,
      );
      highlightsRef.current = updated;
      setHighlights(updated);

      const target = updated.find((highlight) => highlight.id === id);

      if (target) {
        const doc = getConversationDocument();
        removeHighlightMark(id, doc);
        const element = doc.querySelector(
          `[data-turn-id="${target.messageId}"], [data-message-id="${target.messageId}"], [data-testid="${target.messageId}"]`,
        ) as HTMLElement | null;
        const root =
          element?.closest<HTMLElement>('[data-turn="assistant"]') ??
          getAssistantMessageRoot(element) ??
          findAssistantRootByText(doc, target.text);

        if (root) {
          restoreHighlight(target, root);
        }
      }

      try {
        await updateHighlight(conversation.conversationId, id, patch);
      } catch (error) {
        console.error('AI Chat Navigator could not update highlight.', error);
      }
    },
    [conversation.conversationId],
  );

  const handleToggleHighlights = useCallback(() => {
    setHighlightAnchor(getHighlightsAnchorPosition());
    setIsHighlightsOpen((currentValue) => !currentValue);
    setIsFinderOpen(false);
    setIsFavoritesOpen(false);
  }, []);

  const handleJumpToHighlight = useCallback(
    (id: string) => {
    console.log('[AI Chat Navigator][diag] jump-click', { id });

    // Resolve the turn number of the conversation-turn element closest to the
    // viewport CENTER. This is the ground-truth "where am I" signal used to
    // steer the long-distance highlight jump far more reliably than the global
    // min/max turn bounds, which include always-mounted head/tail buffers and
    // gaps and wrongly report an un-mounted target as "in range".
    const getViewportCenterTurn = (
      probeDoc: Document,
      probeScroller: HTMLElement,
    ): number | null => {
      const turns = Array.from(
        probeDoc.querySelectorAll<HTMLElement>('[data-testid^="conversation-turn"]'),
      );
      if (!turns.length) return null;
      const rect = probeScroller.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      let best: HTMLElement | null = null;
      let bestDist = Infinity;
      for (const el of turns) {
        const r = el.getBoundingClientRect();
        const elCenter = r.top + r.height / 2;
        const d = Math.abs(elCenter - centerY);
        if (d < bestDist) {
          bestDist = d;
          best = el;
        }
      }
      if (!best) return null;
      const m = best.getAttribute('data-testid')?.match(/conversation-turn-(\d+)/);
      return m ? parseInt(m[1], 10) : null;
    };

    const highlight = highlightsRef.current.find((item) => item.id === id);

      if (!highlight) {
        showToast('未找到高亮');
        console.log('[AI Chat Navigator][diag] jump', { id, found: false });

        return;
      }

      const doc = getConversationDocument();
      const target = findHighlightTarget(highlight, doc);

      console.log('[AI Chat Navigator][diag] jump', {
        id,
        messageId: highlight.messageId,
        textPreview: (highlight.text ?? '').slice(0, 24),
        resolvedDocIsTop: doc === document,
        docTurns: doc.querySelectorAll('[data-turn]').length,
        spanFound: !!doc.querySelector(`[data-highlight-id="${id}"]`),
        targetFound: !!target,
      });

      if (target) {
        // REPAIR (v0.7.34): persist missing turnNumber for old highlights.
        if (typeof highlight.turnNumber !== 'number') {
          const repaired = extractTurnNumberFromElement(target);
          if (repaired !== null) {
            highlight.turnNumber = repaired;
            updateHighlight(highlight.conversationId, highlight.id, {
              turnNumber: repaired,
            }).catch(() => {});
            console.log('[AI Chat Navigator][diag] jump-repair', {
              id,
              turnNumber: repaired,
            });
          }
        }

        // Use the same scrolling helper as the timeline/favorites jumps — it
        // correctly resolves ChatGPT's nested scroll container and centers the
        // target in the viewport.
        scrollElementToContainerCenter(target);

        JUMP_CORRECTION_DELAYS.forEach((delay) => {
          window.setTimeout(() => {
            const retryTarget = findHighlightTarget(
              highlight,
              getConversationDocument(),
            );

            if (retryTarget) {
              scrollElementToContainerCenter(retryTarget);
            }
          }, delay);
        });

        return;
      }

      // The turn is outside the currently-rendered window (ChatGPT uses
      // virtual scrolling for long conversations). We need to scroll the real
      // conversation container so ChatGPT lazily loads the target turn, then
      // re-locate it.
      //
      // KEY FIX (v0.7.32): the previous strategy jumped to the absolute
      // top/bottom edge and reversed direction when it got "stuck". That
      // skipped the MIDDLE of the conversation — a highlight created in turn 50
      // of a 200-turn chat could never be reached because we'd oscillate
      // between the two edges. The new strategy scrolls ONE WINDOW at a time
      // (never jumping to a far edge) and sweeps across the whole conversation
      // if the target position is unknown, so it passes through every turn.

      let targetN = resolveTargetTurnNumber(highlight, doc);

      // Which way to sweep first. If we already know the target's turn number,
      // steer by it (handled in the loop). Otherwise guess from the current
      // scroll position: if the user is near the bottom, older content is
      // probably above us (the common "highlight early, jump from recent" case).
      const initialSweepDown = (() => {
        if (targetN !== null) return false;
        try {
          const scroller = getConversationScroller(doc);
          const ratio =
            scroller.scrollTop /
            Math.max(1, scroller.scrollHeight - scroller.clientHeight);
          return ratio <= 0.5; // near top -> sweep down for newer content
        } catch {
          return false; // default: sweep up (load older) first
        }
      })();

      let staleTicks = 0;
      let ticks = 0;
      let lastScrollTop = -1;
      const MAX_TICKS = 140;

      const readTurnBounds = (probeDoc: Document) => {
        const nums = Array.from(
          probeDoc.querySelectorAll('[data-testid^="conversation-turn"]'),
        )
          .map((el) => {
            const m = el
              .getAttribute('data-testid')
              ?.match(/conversation-turn-(\d+)/);
            return m ? parseInt(m[1], 10) : null;
          })
          .filter((n): n is number => n !== null);
        return {
          min: nums.length ? Math.min(...nums) : null,
          max: nums.length ? Math.max(...nums) : null,
        };
      };

      console.log('[AI Chat Navigator][diag] jump-sweep-start', {
        id,
        messageId: highlight.messageId,
        targetN,
        initialSweepDown,
      });

      const timer = window.setInterval(() => {
        ticks += 1;
        const rdoc = getConversationDocument();
        const retryTarget = findHighlightTarget(highlight, rdoc);
        const turnEl =
          targetN !== null
            ? rdoc.querySelector<HTMLElement>(
                `[data-testid="conversation-turn-${targetN}"]`,
              )
            : null;

        if (retryTarget || turnEl) {
          window.clearInterval(timer);

          const finalTarget = retryTarget ?? turnEl;
          if (typeof highlight.turnNumber !== 'number') {
            const repaired = extractTurnNumberFromElement(finalTarget);
            if (repaired !== null) {
              highlight.turnNumber = repaired;
              updateHighlight(highlight.conversationId, highlight.id, {
                turnNumber: repaired,
              }).catch(() => {});
              console.log('[AI Chat Navigator][diag] jump-repair', {
                id,
                turnNumber: repaired,
              });
            }
          }

          // Center immediately (timeline-style single instant scroll), then
          // re-center on a short delay so we land exactly on the wrapped
          // highlight span once ChatGPT finishes rendering/applying it. This
          // mirrors the immediate-jump path and the timeline node click, and
          // is what removes the "last bit I had to scroll by hand" gap.
          scrollElementToContainerCenter(finalTarget);
          let settled = false;
          // Add one longer tail delay so an asynchronously-applied highlight
          // span has time to appear. We do NOT modify JUMP_CORRECTION_DELAYS
          // because the timeline path also uses it (its target is already in
          // the DOM, so the extra delay is harmless there).
          const correctionDelays = [...JUMP_CORRECTION_DELAYS, 1400];
          correctionDelays.forEach((delay) => {
            window.setTimeout(() => {
              const retryTarget2 = findHighlightTarget(
                highlight,
                getConversationDocument(),
              );
              const turnEl2 =
                targetN !== null
                  ? getConversationDocument().querySelector<HTMLElement>(
                      `[data-testid="conversation-turn-${targetN}"]`,
                    )
                  : null;
              if (settled) return;
              // The span is only present after ChatGPT applies the highlight
              // (async, after the turn mounts). findHighlightTarget falls back
              // to the whole turn section when the span is missing, so we must
              // check for the exact span before declaring victory - otherwise
              // we center the whole turn and stop short of the real highlight.
              const isSpan =
                !!retryTarget2 &&
                retryTarget2.getAttribute('data-highlight-id') === highlight.id;
              const t = isSpan ? retryTarget2 : (turnEl2 ?? finalTarget);
              scrollElementToContainerCenter(t);
              if (isSpan) settled = true;
            }, delay);
          });
          return;
        }

        if (targetN === null) {
          const freshN = resolveTargetTurnNumber(highlight, rdoc);
          if (freshN !== null) {
            targetN = freshN;
            if (typeof highlight.turnNumber !== 'number') {
              highlight.turnNumber = freshN;
              updateHighlight(highlight.conversationId, highlight.id, {
                turnNumber: freshN,
              }).catch(() => {});
            }
            console.log('[AI Chat Navigator][diag] jump-resolved', {
              ticks,
              targetN,
            });
          }
        }

        const bounds = readTurnBounds(rdoc);
        const scroller = (() => {
          try {
            return getConversationScroller(rdoc);
          } catch {
            return null;
          }
        })();

        if (!scroller || bounds.min === null || bounds.max === null) {
          if (ticks >= MAX_TICKS) {
            window.clearInterval(timer);
            console.log('[AI Chat Navigator][diag] jump-failed', {
              id,
              messageId: highlight.messageId,
              turnNumber: highlight.turnNumber ?? null,
              targetN,
              loadedMin: bounds.min,
              loadedMax: bounds.max,
            });
            showToast('未找到原回复，该对话可能已过长或已刷新');
          }
          return;
        }

        const liveMax = Math.max(
          1,
          scroller.scrollHeight - scroller.clientHeight,
        );

        // Steer by the turn number nearest the VIEWPORT CENTER (ground truth),
        // NOT by the global min/max bounds. Global bounds include always-
        // mounted head/tail buffers and gaps, so they wrongly report the
        // target "in range" and made v0.7.38 jiggle in place then bail as
        // "driver dead" (diag showed rendered 11-286 but turn 208 un-mounted).
        const curN = getViewportCenterTurn(rdoc, scroller);
        let dirSign: -1 | 1;
        if (curN !== null) {
          if (curN < targetN) dirSign = 1; // target below viewport -> scroll down
          else if (curN > targetN) dirSign = -1; // target above -> scroll up
          else dirSign = 1; // right spot but not mounted yet; nudge down
        } else {
          // No visible turn (rare) -> fall back to the ratio estimate.
          const estTotal = Math.max(bounds.max ?? targetN, targetN, 1);
          const est = (targetN / estTotal) * liveMax;
          dirSign = est > scroller.scrollTop ? 1 : -1;
        }

        // Exponential approach: each tick jump a large fraction of the
        // estimated pixel gap so a far-away turn loads in ~log time. The
        // timeline jump is instant only because its target is already in the
        // DOM; here we must first load it, so we make the load phase fast
        // while still steering by the viewport-center turn (ground truth).
        const estTotal = Math.max(bounds.max ?? targetN, targetN, 1);
        const avgTurnPx = liveMax / estTotal;

        let step: number;
        if (ticks === 1 && curN === null) {
          const est = Math.round((targetN / estTotal) * liveMax);
          step = est - scroller.scrollTop;
        } else if (curN !== null) {
          const turnGap = Math.abs(curN - targetN);
          const desired = turnGap * avgTurnPx * 0.72; // ~72% of the gap per tick
          step = dirSign * Math.max(450, Math.min(desired, 60000));
        } else {
          const est = Math.round((targetN / estTotal) * liveMax);
          const rem = est - scroller.scrollTop;
          step =
            Math.sign(rem) * Math.max(450, Math.min(Math.abs(rem) * 0.72, 60000));
        }
        scrollConversationBy(rdoc, step);

        // Real stall detection: bail ONLY if scrollTop truly stops moving (the
        // driver is dead). An unchanged bounds string is NOT a stall.
        if (Math.abs(scroller.scrollTop - lastScrollTop) < 2) {
          staleTicks += 1;
        } else {
          staleTicks = 0;
        }
        lastScrollTop = scroller.scrollTop;

        if (staleTicks === 4) {
          try {
            if (dirSign === -1) window.scrollTo(0, 0);
            else window.scrollTo(0, 1e9);
          } catch {
            /* noop */
          }
        } else if (staleTicks >= 12) {
          window.clearInterval(timer);
          console.log('[AI Chat Navigator][diag] jump-driver-dead', {
            id,
            turnNumber: highlight.turnNumber ?? null,
            targetN,
            rendered: `${bounds.min}-${bounds.max}`,
            scrollerTag: scroller.tagName,
            scrollerScrollTop: scroller.scrollTop,
            scrollerScrollHeight: scroller.scrollHeight,
            viewportCenterTurn: curN,
          });
          showToast('未找到原回复，该对话可能已过长或已刷新');
          return;
        }

        if (ticks >= MAX_TICKS) {
          window.clearInterval(timer);
          console.log('[AI Chat Navigator][diag] jump-failed', {
            id,
            messageId: highlight.messageId,
            turnNumber: highlight.turnNumber ?? null,
            targetN,
            loadedMin: bounds.min,
            loadedMax: bounds.max,
            scrollerTag: scroller.tagName,
            scrollerScrollable:
              scroller.scrollHeight > scroller.clientHeight + 2,
            scrollerScrollTop: scroller.scrollTop,
            scrollerScrollHeight: scroller.scrollHeight,
            scrollerClientHeight: scroller.clientHeight,
            viewportCenterTurn: curN,
          });
          showToast('未找到原回复，该对话可能已过长或已刷新');
        }
      }, 55);

    },
    [showToast],
  );

  const handleRailMouseMove = useCallback(
    (event: MouseEvent<HTMLOListElement>) => {
      cancelPreviewDismiss();
      const closestItem = getClosestTimelineItemFromPointer(event, items);

      if (!closestItem || closestItem.id === hoveredId) {
        return;
      }

      const nextTop = Math.min(
        Math.max(event.clientY, 82),
        window.innerHeight - 82,
      );

      setPreviewTop(nextTop);
      setHoveredId(closestItem.id);
    },
    [cancelPreviewDismiss, items, hoveredId],
  );

  const handleRailMouseLeave = useCallback(() => {
    schedulePreviewDismiss();
  }, [schedulePreviewDismiss]);

  const handleNodeMouseEnter = useCallback(
    (item: PromptTimelineItem, event: MouseEvent<HTMLButtonElement>) => {
      cancelPreviewDismiss();
      const rect = event.currentTarget.getBoundingClientRect();
      const nextTop = Math.min(
        Math.max(rect.top + rect.height / 2, 92),
        window.innerHeight - 92,
      );

      setPreviewTop(nextTop);
      setHoveredId(item.id);
    },
    [cancelPreviewDismiss],
  );

  const hoveredPromptId = hoveredItem
    ? getPromptStorageId(hoveredItem)
    : null;
  const isHoveredImportant = Boolean(
    hoveredPromptId && importantPromptIds.has(hoveredPromptId),
  );
  const hoveredFavoriteId = hoveredPromptId
    ? favoriteIdBySource.get(
        getFavoriteSourceKey(conversation.conversationId, hoveredPromptId),
      ) || null
    : null;

  return (
    <aside id="ai-chat-navigator-timeline-rail" style={railShellStyle}>
      <TimelineRail
        items={items}
        activeId={activeId}
        hoveredId={hoveredId}
        hoveredIndex={hoveredIndex}
        importantPromptIds={importantPromptIds}
        driftDetected={driftDetected}
        uiVersion={UI_VERSION_LABEL}
        nodeListRef={nodeListRef}
        isFinderOpen={isFinderOpen}
        isHighlightsOpen={isHighlightsOpen}
        onRailMouseMove={handleRailMouseMove}
        onRailMouseLeave={handleRailMouseLeave}
        onNodeClick={handleNodeClick}
        onNodeMouseEnter={handleNodeMouseEnter}
        onToggleFinder={() => {
          setIsFinderOpen((currentValue) => !currentValue);
          setIsFavoritesOpen(false);
        }}
        onToggleHighlights={handleToggleHighlights}
      />

      {isFinderOpen ? (
        <FinderPanel
          searchQuery={searchQuery}
          isImportantOnly={isImportantOnly}
          finderItems={finderItems}
          activeId={activeId}
          importantPromptIds={importantPromptIds}
          onSearchChange={setSearchQuery}
          onToggleImportantOnly={() => {
            setIsImportantOnly((currentValue) => !currentValue);
          }}
          onItemClick={handleNodeClick}
          onClose={() => {
            setIsFinderOpen(false);
          }}
        />
      ) : null}

      <FavoritesPanel
        isOpen={isFavoritesOpen}
        favorites={favorites}
        visibleFavorites={visibleFavorites}
        favoriteTagOptions={favoriteTagOptions}
        selectedFavoriteTag={selectedFavoriteTag}
        copiedFavoriteId={copiedFavoriteId}
        favoritesAnchor={favoritesAnchor}
        onToggleOpen={() => {
          setFavoritesAnchor(getFavoritesAnchorPosition());
          setIsFavoritesOpen((currentValue) => !currentValue);
          setIsFinderOpen(false);
        }}
        onClose={() => {
          setIsFavoritesOpen(false);
        }}
        onSelectTag={(tag) => {
          setSelectedFavoriteTag(tag);
        }}
        onCopy={handleCopyFavorite}
        onRemove={handleRemoveFavorite}
        onSave={handleSaveFavorite}
      />

      <HighlightsPanel
        isOpen={isHighlightsOpen}
        highlights={highlights}
        visibleHighlights={visibleHighlights}
        tagOptions={highlightTagOptions}
        selectedTag={selectedHighlightTag}
        anchor={highlightAnchor}
        onToggleOpen={handleToggleHighlights}
        onClose={() => {
          setIsHighlightsOpen(false);
        }}
        onSelectTag={(tag) => {
          setSelectedHighlightTag(tag);
        }}
        onJump={(id) => {
          console.log('[AI Chat Navigator][diag] panel-onJump', { id });
          handleJumpToHighlight(id);
        }}
        onRemove={(id) => {
          void handleRemoveHighlight(id);
        }}
        onSave={(id, patch) => {
          void handleUpdateHighlight(id, patch);
        }}
      />

      {toolbar && selectionStep === 'quick' ? (
        <HighlightQuickBar
          position={toolbar}
          placement={toolbar.placement}
          onAskFollowUp={handleAskFollowUp}
          onHighlight={() => setSelectionStep('style')}
          onClose={() => {
            setToolbar(null);
            setSelectionStep('none');
            selectionRangeRef.current = null;
          }}
        />
      ) : null}

      {toolbar && selectionStep === 'style' ? (
        <HighlightStylePanel
          position={toolbar}
          placement={toolbar.placement}
          color={pendingColor}
          style={pendingStyle}
          note={toolbarNote}
          onColorChange={setPendingColor}
          onStyleChange={setPendingStyle}
          onNoteChange={setToolbarNote}
          onConfirm={() => {
            void handleConfirmHighlight(pendingColor, pendingStyle, toolbarNote);
          }}
          onClose={() => {
            setToolbar(null);
            setSelectionStep('none');
            selectionRangeRef.current = null;
          }}
        />
      ) : null}

      {editingHighlight && editingHighlightData && !toolbar ? (
        <HighlightCard
          position={{ top: editingHighlight.top, left: editingHighlight.left }}
          highlight={editingHighlightData}
          onRecolor={(color) => {
            void handleUpdateHighlight(editingHighlightData.id, { color });
          }}
          onStyleChange={(style) => {
            void handleUpdateHighlight(editingHighlightData.id, { style });
          }}
          onNoteChange={(note) => {
            void handleUpdateHighlight(editingHighlightData.id, { note });
          }}
          onTagsChange={(tags) => {
            void handleUpdateHighlight(editingHighlightData.id, { tags });
          }}
          onJump={() => {
            handleJumpToHighlight(editingHighlightData.id);
            setEditingHighlight(null);
          }}
          onRemove={() => {
            void handleRemoveHighlight(editingHighlightData.id);
          }}
          onClose={() => {
            setEditingHighlight(null);
          }}
        />
      ) : null}

      {toast ? (
        <div style={highlightToastStyle}>{toast}</div>
      ) : null}

      {favoriteDraftItem ? (
        <FavoriteDialog
          favoriteDraftItem={favoriteDraftItem}
          favoriteDraftTitle={favoriteDraftTitle}
          favoriteDraftTagsInput={favoriteDraftTagsInput}
          favoriteTagOptions={favoriteTagOptions}
          favoriteDraftTagSet={favoriteDraftTagSet}
          isSavingFavorite={isSavingFavorite}
          favoriteSaveError={favoriteSaveError}
          onTitleChange={setFavoriteDraftTitle}
          onTagsChange={setFavoriteDraftTagsInput}
          onToggleTag={handleToggleFavoriteDraftTag}
          onConfirm={() => void handleConfirmFavoriteDialog()}
          onClose={handleCloseFavoriteDialog}
        />
      ) : null}

      {hoveredItem ? (
        <PreviewCard
          hoveredItem={hoveredItem}
          previewTop={previewTop}
          isHoveredImportant={isHoveredImportant}
          hoveredFavoriteId={hoveredFavoriteId}
          onToggleImportant={handleToggleImportant}
          onToggleFavorite={handleToggleFavorite}
          onMouseEnter={cancelPreviewDismiss}
          onMouseLeave={schedulePreviewDismiss}
        />
      ) : null}
    </aside>
  );
}
