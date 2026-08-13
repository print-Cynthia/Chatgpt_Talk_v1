import ReactDOM from 'react-dom/client';
import { Sidebar } from '../src/components/Sidebar';
import { ErrorBoundary } from '../src/components/sidebar/ErrorBoundary';
import { startNativeChatGPTTimelineHider } from '../src/services/chatgptNativeTimelineHider';
import { SELECTION_PING_EVENT } from '../src/services/selectionBridge';

const ROOT_ID = 'ai-chat-navigator-root';

const TIMELINE_TOP_OFFSET = 160;
const TIMELINE_BOTTOM_OFFSET = 140;
const TIMELINE_NODE_GAP = 32;
const TIMELINE_VISIBLE_COUNT = 12;
const TIMELINE_VERTICAL_PADDING = 24;

const TIMELINE_MAX_HEIGHT =
  TIMELINE_NODE_GAP * TIMELINE_VISIBLE_COUNT + TIMELINE_VERTICAL_PADDING;

// Visible, dismissable error banner. Any uncaught error (module eval, content
// script logic, or a React error boundary escalation) now shows ON PAGE instead
// of silently disappearing. So a runtime failure is diagnosable from the user's
// console/screen rather than looking like the plugin vanished.
const ERROR_OVERLAY_ID = 'ai-chat-navigator-error-overlay';

function showFatalOverlay(error: unknown) {
  try {
    // Ignore benign browser-level warnings that are not plugin faults. Chrome
    // fires a "ResizeObserver loop completed with undelivered notifications"
    // error event on layout shifts (e.g. switching to voice mode, our own
    // React re-renders). It does not break anything, so surfacing it as a
    // fatal red bar is misleading noise.
    const rawMessage =
      error instanceof Error ? error.message : String(error);

    if (rawMessage.includes('ResizeObserver loop completed')) {
      return;
    }

    const doc = document;
    if (!doc.body) {
      return;
    }

    const message =
      error instanceof Error
        ? `${error.message}\n${error.stack ?? ''}`
        : String(error);

    let overlay = doc.getElementById(ERROR_OVERLAY_ID) as HTMLDivElement | null;

    if (!overlay) {
      overlay = doc.createElement('div');
      overlay.id = ERROR_OVERLAY_ID;
      overlay.style.position = 'fixed';
      overlay.style.left = '12px';
      overlay.style.bottom = '12px';
      overlay.style.maxWidth = '360px';
      overlay.style.zIndex = '2147483647';
      overlay.style.background = '#7f1d1d';
      overlay.style.color = '#fff';
      overlay.style.padding = '10px 12px';
      overlay.style.borderRadius = '8px';
      overlay.style.font =
        '12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace';
      overlay.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
      overlay.style.whiteSpace = 'pre-wrap';
      overlay.style.wordBreak = 'break-word';
      overlay.style.cursor = 'pointer';
      overlay.title = '点击关闭';
      overlay.addEventListener('click', () => overlay?.remove());
      doc.body.appendChild(overlay);
    }

    overlay.textContent = `AI Chat Navigator 运行出错：\n${message}`;
    console.error('[AI Chat Navigator] fatal error overlay', error);
  } catch {
    // Last-resort: at least log it.
    console.error('[AI Chat Navigator] fatal error', error);
  }
}

function installGlobalErrorOverlay() {
  window.addEventListener('error', (event) => {
    showFatalOverlay(event.error ?? event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    showFatalOverlay(event.reason);
  });
}

// Register the overlay as early as possible so any subsequent runtime error
// (content-script logic, React render) is surfaced on-page.
installGlobalErrorOverlay();

function cleanupOwnNavigatorDom(doc: Document) {
  const ownSelectors = [
    `#${ROOT_ID}`,
    '#ai-chat-navigator-timeline-style',
    '#ai-chat-navigator-page-highlight-style',
  ];

  doc.querySelectorAll(ownSelectors.join(',')).forEach((element) => {
    element.remove();
  });
}

function hasConversationContent(doc: Document): boolean {
  return (
    doc.querySelectorAll(
      '[data-turn], [data-message-author-role], [data-testid^="conversation-turn"], article',
    ).length > 0
  );
}

function attachSelectionWatcher(doc: Document) {
  const flag = '__aiChatNavigatorSelectionWatcher';
  const owner = doc as unknown as { [flag]?: boolean };

  if (owner[flag]) {
    return;
  }

  owner[flag] = true;

  const onActivity = () => {
    const selection = doc.defaultView?.getSelection() ?? null;

    console.log('[AI Chat Navigator][diag] sel-event', {
      isCollapsed: selection?.isCollapsed ?? null,
      rangeCount: selection?.rangeCount ?? null,
    });

    doc.dispatchEvent(new CustomEvent(SELECTION_PING_EVENT));
  };

  // selectionchange is unreliable in the content-script isolated world, so we
  // also listen for mouseup (drag selection) and keyup (keyboard selection).
  // Any of them re-evaluates the current selection.
  doc.addEventListener('selectionchange', onActivity);
  doc.addEventListener('mouseup', onActivity);
  doc.addEventListener('keyup', onActivity);

  console.log('[AI Chat Navigator][diag] selection watcher attached', {
    isTopDoc: doc === document,
    dataTurn: doc.querySelectorAll('[data-turn]').length,
  });
}

function mountSidebarInto(doc: Document) {
  if (doc.getElementById(ROOT_ID)) return;

  console.log('[AI Chat Navigator] mount', {
    dataTurn: doc.querySelectorAll('[data-turn]').length,
    isTopDoc: doc === document,
    hasBody: !!doc.body,
  });

  cleanupOwnNavigatorDom(doc);

  const rootElement = doc.createElement('div');
  rootElement.id = ROOT_ID;
  rootElement.setAttribute('data-ai-chat-navigator-root', 'true');

  rootElement.style.position = 'fixed';
  rootElement.style.top = `${TIMELINE_TOP_OFFSET}px`;
  rootElement.style.right = '22px';
  rootElement.style.width = '88px';
  rootElement.style.height = `min(calc(100vh - ${
    TIMELINE_TOP_OFFSET + TIMELINE_BOTTOM_OFFSET
  }px), ${TIMELINE_MAX_HEIGHT}px)`;
  rootElement.style.zIndex = '2147483646';
  rootElement.style.pointerEvents = 'none';

  doc.body.appendChild(rootElement);

  // The native timeline hider must operate on the same document that ChatGPT
  // renders the conversation in, otherwise it hides nothing.
  startNativeChatGPTTimelineHider(doc);

  // Selection listeners MUST live at the content-script module scope and not
  // inside a React effect, so they attach regardless of React mount timing or
  // the isolated-world event quirks. They ping the React tree via a CustomEvent.
  attachSelectionWatcher(doc);

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <Sidebar />
      </ErrorBoundary>,
    );
  } catch (error) {
    console.error('[AI Chat Navigator] React mount failed', error);
    showFatalOverlay(error);
  }
}

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  runAt: 'document_idle',
  // ChatGPT can render a conversation in a same-origin iframe. Running in each
  // frame keeps React, DOM queries, selection listeners, and storage access in
  // one execution context. A frame only mounts after it sees conversation DOM.
  allFrames: true,
  matchAboutBlank: true,
  matchOriginAsFallback: true,

  main() {
    try {
      const isTop = window.self === window.top;

      console.log('[AI Chat Navigator] frame check', {
        isTop,
        href: window.location.href,
        hasContentNow: hasConversationContent(document),
        dataTurn: document.querySelectorAll('[data-turn]').length,
        article: document.querySelectorAll('article').length,
      });

      const tryRender = () => {
        if (hasConversationContent(document)) {
          mountSidebarInto(document);
          return true;
        }

        return false;
      };

      if (tryRender()) {
        return;
      }

      const observer = new MutationObserver((mutations) => {
        const mayContainConversation = mutations.some((mutation) =>
          Array.from(mutation.addedNodes).some((node) => {
            if (!(node instanceof Element)) {
              return false;
            }

            return (
              node.matches(
                '[data-turn], [data-message-author-role], [data-testid^="conversation-turn"], article',
              ) ||
              Boolean(
                node.querySelector(
                  '[data-turn], [data-message-author-role], [data-testid^="conversation-turn"], article',
                ),
              )
            );
          }),
        );

        if (mayContainConversation && tryRender()) {
          observer.disconnect();
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    } catch (error) {
      console.error('[AI Chat Navigator] main() failed', error);
      showFatalOverlay(error);
    }
  },
});
