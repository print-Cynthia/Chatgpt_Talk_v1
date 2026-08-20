import {
  SELECTORS,
  querySelectorAllFallback,
  closestFallback,
  matchesAny,
} from './chatgptSelectors';

export interface PromptTimelineItem {
  id: string;
  matchKey: string;
  turnId: string | null;
  order: number;
  text: string;
  previewText: string;
  timestampText?: string;
  timestampSource?: 'dom' | 'user_send_event' | 'none';
  hasAttachment: boolean;
  attachmentNames: string[];
  attachmentSummary: string | null;
  element: HTMLElement;
  highlightElement: HTMLElement;
}

interface TimestampInfo {
  timestampText?: string;
  timestampSource: 'dom' | 'none';
}

interface ParsedTimestamp {
  text: string;
}

interface AttachmentInfo {
  names: string[];
  imageCount: number;
  hasAttachment: boolean;
}

type PendingPromptSend = {
  id: string;
  text: string;
  normalizedText: string;
  timestamp: number;
  used: boolean;
};

const USER_MESSAGE_SELECTOR = SELECTORS.userMessage[0];

const elementIdMap = new WeakMap<Element, string>();
let elementIdCounter = 1;
const historicalPromptIds = new Set<string>();
const userSendTimeByPromptId = new Map<string, number>();
const pendingPromptSends: PendingPromptSend[] = [];
let hasCompletedInitialPromptScan = false;
let initialPromptScanTimer: number | null = null;
let hasStartedPromptSendTimeCapture = false;

const PENDING_PROMPT_SEND_TTL_MS = 120000;

const IMAGE_EXTENSIONS = 'png|jpe?g|webp|gif|heic';
const VIDEO_EXTENSIONS = 'mp4|mov';
const DOCUMENT_EXTENSIONS = 'pdf|docx?|xlsx?|pptx?|zip|rar|7z|txt|csv';
const AUDIO_EXTENSIONS = 'mp3|wav';

const FILE_EXTENSIONS = `${VIDEO_EXTENSIONS}|${IMAGE_EXTENSIONS}|${DOCUMENT_EXTENSIONS}|${AUDIO_EXTENSIONS}`;

const FILE_EXTENSION_PATTERN = new RegExp(`\\.(${FILE_EXTENSIONS})\\b`, 'i');
const IMAGE_EXTENSION_PATTERN = new RegExp(`\\.(${IMAGE_EXTENSIONS})\\b`, 'i');

const FILE_NAME_TOKEN_PATTERN = new RegExp(
  `[A-Za-z0-9\\u4e00-\\u9fff._()\\[\\]{}+@#$%&=!,~'^-]{1,160}\\.(${FILE_EXTENSIONS})\\b`,
  'gi',
);

const UUID_FILE_NAME_PATTERN = new RegExp(
  `[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(${FILE_EXTENSIONS})\\b`,
  'gi',
);

const BROKEN_UUID_FILE_NAME_PATTERN = new RegExp(
  `[a-f0-9]{8}\\s*-\\s*[a-f0-9]{4}\\s*-\\s*[a-f0-9]{4}\\s*-\\s*[a-f0-9]{4}\\s*-\\s*[a-f0-9]{12}\\.(${FILE_EXTENSIONS})\\b`,
  'gi',
);

const STRICT_FILE_NAME_ONLY_PATTERN = new RegExp(
  `^[A-Za-z0-9\\u4e00-\\u9fff._()\\[\\]{}+@#$%&=!,~'^-]{1,180}\\.(${FILE_EXTENSIONS})$`,
  'i',
);

const UUID_BASENAME_PATTERN =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

const UI_LINE_SET = new Set([
  'copy',
  'copied',
  'edit',
  'share',
  'download',
  'open',
  'regenerate',
  '复制',
  '已复制',
  '编辑',
  '分享',
  '下载',
  '打开',
  '重新生成',
  '图片',
  '文件',
  '附件',
  '上传',
  '已上传',
]);

function getTurnId(element: HTMLElement) {
  const candidates = [
    element,
    element.closest('article'),
    element.closest('[data-testid^="conversation-turn"]'),
    element.closest('[data-turn-id]'),
    element.closest('[data-message-id]'),
  ].filter(Boolean) as HTMLElement[];

  for (const candidate of candidates) {
    const turnId =
      candidate.getAttribute('data-turn-id') ||
      candidate.getAttribute('data-message-id') ||
      candidate.getAttribute('data-testid') ||
      null;

    if (turnId) {
      return turnId;
    }
  }

  return null;
}

function getStableElementId(element: HTMLElement, turnId: string | null) {
  if (turnId) {
    return `turn-${turnId}`;
  }

  const existingId = elementIdMap.get(element);

  if (existingId) {
    return existingId;
  }

  const newId = `prompt-${elementIdCounter}`;
  elementIdCounter += 1;
  elementIdMap.set(element, newId);

  return newId;
}

function getMessageScrollElement(roleNode: HTMLElement) {
  return closestFallback(roleNode, 'scrollContainer') ?? roleNode;
}

function getMessageHighlightElement(roleNode: HTMLElement) {
  const content = querySelectorAllFallback(roleNode, 'messageContent')[0] ?? null;

  if (content instanceof HTMLElement) {
    const bubble = closestFallback(content, 'messageBubble');

    if (bubble) {
      return bubble;
    }

    return content;
  }

  return roleNode;
}

function isConnectedToDocument(element: HTMLElement) {
  return element.isConnected && document.contains(element);
}

function removeZeroWidthChars(text: string) {
  return text.replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function compactBrokenFileName(text: string) {
  return text.replace(/\s*-\s*/g, '-').replace(/\s*\.\s*/g, '.');
}

function normalizeAttachmentName(rawName: string) {
  return compactBrokenFileName(rawName)
    .replace(/^附件[:：]\s*/i, '')
    .replace(/^文件[:：]\s*/i, '')
    .replace(/^图片[:：]\s*/i, '')
    .replace(/^视频[:：]\s*/i, '')
    .replace(/^uploaded?[:：]?\s*/i, '')
    .replace(/\s+/g, '')
    .trim();
}

function getFileBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '');
}

function isUuidFileName(fileName: string) {
  return UUID_BASENAME_PATTERN.test(getFileBaseName(fileName));
}

function isImageFileName(fileName: string) {
  return IMAGE_EXTENSION_PATTERN.test(fileName);
}

function isUiImagePreviewText(text: string) {
  const normalized = removeZeroWidthChars(text).replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();

  if (!normalized) {
    return false;
  }

  return (
    /打开第\s*\d+\s*张/.test(normalized) ||
    /共\s*\d+\s*张/.test(normalized) ||
    /打开.*图片/.test(normalized) ||
    /查看.*图片/.test(normalized) ||
    /图片\s*[:：]/.test(normalized) ||
    /open\s+image/.test(lower) ||
    /view\s+image/.test(lower) ||
    /image\s*\d+\s*of\s*\d+/.test(lower) ||
    /image\s*[:：]/i.test(normalized)
  );
}

function extractImageCountHint(text: string) {
  const normalized = removeZeroWidthChars(text).replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();

  const chineseTotalMatch = normalized.match(/共\s*(\d+)\s*张/);
  if (chineseTotalMatch?.[1]) {
    return Number(chineseTotalMatch[1]);
  }

  const englishTotalMatch = lower.match(/image\s*\d+\s*of\s*(\d+)/);
  if (englishTotalMatch?.[1]) {
    return Number(englishTotalMatch[1]);
  }

  return 0;
}

function pushUnique(list: string[], value: string) {
  const cleaned = normalizeAttachmentName(value);

  if (!cleaned) {
    return;
  }

  if (!FILE_EXTENSION_PATTERN.test(cleaned)) {
    return;
  }

  if (!STRICT_FILE_NAME_ONLY_PATTERN.test(cleaned)) {
    return;
  }

  if (!list.includes(cleaned)) {
    list.push(cleaned);
  }
}

function mergeWrappedFileNameLines(lines: string[]) {
  const mergedLines: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index]?.trim() || '';
    const next = lines[index + 1]?.trim() || '';

    if (!current) {
      continue;
    }

    const joinedWithoutSpace = `${current}${next}`.replace(/\s+/g, '');
    const currentLooksLikeFilePrefix = /[A-Za-z0-9_-]{6,}[-_]$/.test(current);
    const nextHasFileExtension = FILE_EXTENSION_PATTERN.test(next);

    if (
      next &&
      currentLooksLikeFilePrefix &&
      nextHasFileExtension &&
      STRICT_FILE_NAME_ONLY_PATTERN.test(joinedWithoutSpace)
    ) {
      mergedLines.push(joinedWithoutSpace);
      index += 1;
      continue;
    }

    mergedLines.push(current);
  }

  return mergedLines;
}

function extractStrictFileNamesFromText(rawText: string) {
  const names: string[] = [];
  const cleanedRawText = removeZeroWidthChars(rawText);

  for (const match of cleanedRawText.matchAll(BROKEN_UUID_FILE_NAME_PATTERN)) {
    pushUnique(names, match[0]);
  }

  for (const match of cleanedRawText.matchAll(FILE_NAME_TOKEN_PATTERN)) {
    pushUnique(names, match[0]);
  }

  const compactText = cleanedRawText.replace(/\s+/g, '');

  for (const match of compactText.matchAll(UUID_FILE_NAME_PATTERN)) {
    pushUnique(names, match[0]);
  }

  const rawLines = cleanedRawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const mergedLines = mergeWrappedFileNameLines(rawLines);

  for (const line of mergedLines) {
    const compactLine = compactBrokenFileName(line).replace(/\s+/g, '');

    if (STRICT_FILE_NAME_ONLY_PATTERN.test(compactLine)) {
      pushUnique(names, compactLine);
    }
  }

  return names;
}

function removeFileNameTokens(text: string) {
  return removeZeroWidthChars(text)
    .replace(BROKEN_UUID_FILE_NAME_PATTERN, ' ')
    .replace(FILE_NAME_TOKEN_PATTERN, ' ')
    .replace(UUID_FILE_NAME_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isProbablyAttachmentOrUiLine(line: string) {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();

  if (!trimmed) {
    return true;
  }

  if (UI_LINE_SET.has(trimmed) || UI_LINE_SET.has(lower)) {
    return true;
  }

  if (isUiImagePreviewText(trimmed)) {
    return true;
  }

  const compactLine = compactBrokenFileName(trimmed).replace(/\s+/g, '');

  if (STRICT_FILE_NAME_ONLY_PATTERN.test(compactLine)) {
    return true;
  }

  if (FILE_EXTENSION_PATTERN.test(compactLine) && compactLine.length <= 220) {
    return true;
  }

  if (/^\d+(\.\d+)?\s?(B|KB|MB|GB)$/i.test(trimmed)) {
    return true;
  }

  if (/^(image|file|attachment|upload|uploaded)$/i.test(trimmed)) {
    return true;
  }

  if (/^(图片|文件|附件|上传|已上传)$/.test(trimmed)) {
    return true;
  }

  return false;
}

// ChatGPT injects accessibility labels like "You said:" / "你说：" at the
// start of user turns. These labels are not part of the user's actual prompt
// and should not appear in the timeline preview or favorite title.
const USER_PROMPT_LABEL_TOKENS = ['你说：', 'You said:', 'You said'];

function stripPromptAccessibilityLabel(text: string): string {
  let result = text.trim();

  for (const token of USER_PROMPT_LABEL_TOKENS) {
    if (result.startsWith(token)) {
      result = result.slice(token.length).trim();
      break;
    }
  }

  return result;
}

function normalizeText(rawText: string) {
  const cleanedRawText = removeZeroWidthChars(rawText);
  const rawLines = cleanedRawText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const mergedLines = mergeWrappedFileNameLines(rawLines);

  const promptLines = mergedLines
    .map((line) => removeFileNameTokens(line))
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isProbablyAttachmentOrUiLine(line));

  const joinedText = promptLines.join(' ');
  const cleanedText = removeFileNameTokens(joinedText)
    .replace(/\s+/g, ' ')
    .trim();

  if (isProbablyAttachmentOrUiLine(cleanedText)) {
    return '';
  }

  return stripPromptAccessibilityLabel(cleanedText);
}

function hasRealPromptText(text: string) {
  const meaningfulChars = text.match(/[A-Za-z0-9\u4e00-\u9fff]/g);
  return Boolean(meaningfulChars && meaningfulChars.length >= 2);
}

function nodeContainsFileName(element: HTMLElement) {
  const text = element.textContent || '';
  const ariaLabel = element.getAttribute('aria-label') || '';
  const title = element.getAttribute('title') || '';
  const alt = element.getAttribute('alt') || '';

  return [text, ariaLabel, title, alt].some((value) => {
    return FILE_EXTENSION_PATTERN.test(value);
  });
}

function cloneAndRemoveNonPromptElements(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement;

  const selectorsToRemove = [
    'button',
    'svg',
    'img',
    'picture',
    'video',
    'audio',
    'canvas',
    'a[href]',
    '[download]',
    '[role="button"]',
    '[aria-hidden="true"]',
    '[contenteditable="true"]',
    '[data-testid*="copy" i]',
    '[data-testid*="edit" i]',
    '[data-testid*="share" i]',
    '[data-testid*="download" i]',
    '[data-testid*="file" i]',
    '[data-testid*="attachment" i]',
    '[data-testid*="image" i]',
    '[data-testid*="upload" i]',
    '[aria-label*="copy" i]',
    '[aria-label*="edit" i]',
    '[aria-label*="share" i]',
    '[aria-label*="download" i]',
    '[aria-label*="file" i]',
    '[aria-label*="attachment" i]',
    '[aria-label*="image" i]',
    '[aria-label*="upload" i]',
    '[aria-label*="复制"]',
    '[aria-label*="编辑"]',
    '[aria-label*="分享"]',
    '[aria-label*="下载"]',
    '[aria-label*="文件"]',
    '[aria-label*="附件"]',
    '[aria-label*="图片"]',
    '[aria-label*="上传"]',
  ];

  clone.querySelectorAll(selectorsToRemove.join(',')).forEach((node) => {
    node.remove();
  });

  clone.querySelectorAll<HTMLElement>('*').forEach((node) => {
    if (!nodeContainsFileName(node)) {
      return;
    }

    const text = (node.textContent || '').trim();
    const compactText = compactBrokenFileName(text).replace(/\s+/g, '');

    const isLikelyAttachmentNode =
      STRICT_FILE_NAME_ONLY_PATTERN.test(compactText) ||
      isUiImagePreviewText(text) ||
      node.matches(
        [
          'a',
          '[role="button"]',
          '[data-testid*="file" i]',
          '[data-testid*="attachment" i]',
          '[data-testid*="image" i]',
          '[data-testid*="upload" i]',
        ].join(','),
      );

    if (isLikelyAttachmentNode) {
      node.remove();
    }
  });

  return clone;
}

function readCleanText(element: HTMLElement) {
  const clone = cloneAndRemoveNonPromptElements(element);
  return normalizeText(clone.textContent || '');
}

function extractPromptText(roleNode: HTMLElement) {
  const textCandidates: string[] = [];

  const contentContainers = querySelectorAllFallback(roleNode, 'messageContent');

  for (const container of contentContainers) {
    const text = readCleanText(container);

    if (hasRealPromptText(text)) {
      textCandidates.push(text);
    }
  }

  const fallbackText = readCleanText(roleNode);

  if (hasRealPromptText(fallbackText)) {
    textCandidates.push(fallbackText);
  }

  if (textCandidates.length === 0) {
    return '';
  }

  return textCandidates.sort((a, b) => b.length - a.length)[0];
}

function getAttachmentLikeElements(roleNode: HTMLElement) {
  return querySelectorAllFallback(roleNode, 'attachment');
}

function getImageElementKey(element: HTMLElement) {
  if (element instanceof HTMLImageElement) {
    return element.currentSrc || element.src || element.getAttribute('alt') || '';
  }

  const image = element.querySelector('img');

  if (image instanceof HTMLImageElement) {
    return image.currentSrc || image.src || image.getAttribute('alt') || '';
  }

  return '';
}

function extractAttachmentInfo(roleNode: HTMLElement): AttachmentInfo {
  const attachmentLikeElements = getAttachmentLikeElements(roleNode);
  const names: string[] = [];
  const imageElementKeys = new Set<string>();
  let imageCountHint = 0;

  const scanPossibleFileNameSource = (text: string | null) => {
    if (!text) {
      return;
    }

    imageCountHint = Math.max(imageCountHint, extractImageCountHint(text));

    const fileNames = extractStrictFileNamesFromText(text);

    for (const fileName of fileNames) {
      pushUnique(names, fileName);
    }
  };

  for (const element of attachmentLikeElements) {
    const imageKey = getImageElementKey(element);

    if (imageKey) {
      imageElementKeys.add(imageKey);
    }

    scanPossibleFileNameSource(element.textContent);

    const ariaLabel = element.getAttribute('aria-label');
    const title = element.getAttribute('title');
    const alt = element.getAttribute('alt');

    scanPossibleFileNameSource(ariaLabel);
    scanPossibleFileNameSource(title);
    scanPossibleFileNameSource(alt);
  }

  scanPossibleFileNameSource(roleNode.textContent || '');

  const imageFileNameCount = names.filter((name) => isImageFileName(name)).length;
  const imageCount = Math.max(imageCountHint, imageElementKeys.size, imageFileNameCount);

  return {
    names,
    imageCount,
    hasAttachment: attachmentLikeElements.length > 0 || names.length > 0,
  };
}

function createAttachmentSummary(info: AttachmentInfo) {
  if (!info.hasAttachment) {
    return null;
  }

  const imageNames = info.names.filter((name) => isImageFileName(name));
  const nonImageNames = info.names.filter((name) => !isImageFileName(name));

  const displayImageNames = imageNames.filter((name) => !isUuidFileName(name));
  const uuidImageCount = imageNames.filter((name) => isUuidFileName(name)).length;

  const genericImageCount = Math.max(
    0,
    info.imageCount - displayImageNames.length,
    uuidImageCount,
  );

  const displayParts: string[] = [];

  if (genericImageCount > 0) {
    displayParts.push(genericImageCount === 1 ? '图片' : `图片 ×${genericImageCount}`);
  }

  for (const imageName of displayImageNames) {
    if (!displayParts.includes(imageName)) {
      displayParts.push(imageName);
    }
  }

  for (const name of nonImageNames) {
    if (!displayParts.includes(name)) {
      displayParts.push(name);
    }
  }

  if (displayParts.length === 0) {
    return '附件：文件';
  }

  if (displayParts.length <= 3) {
    return `附件：${displayParts.join('、')}`;
  }

  return `附件：${displayParts.slice(0, 2).join('、')} +${displayParts.length - 2}`;
}

function truncateText(text: string, maxLength: number) {
  const chars = Array.from(text);

  if (chars.length <= maxLength) {
    return text;
  }

  return `${chars.slice(0, maxLength).join('')}…`;
}

function createMatchKey(text: string, order: number, turnId: string | null) {
  if (turnId) {
    return `turn:${turnId}`;
  }

  return `${order}:${text.slice(0, 160)}`;
}

function createFallbackKey(text: string, order: number, element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const positionKey = Math.round(rect.top + window.scrollY);

  return `${order}-${positionKey}-${text.slice(0, 80)}`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatTimelineDateTimeSafe(date: Date) {
  return `${date.getMonth() + 1}\u6708${date.getDate()}\u65e5 ${padDatePart(
    date.getHours(),
  )}:${padDatePart(date.getMinutes())}`;
}

function formatUserSendEventTime(timestamp: number) {
  return formatTimelineDateTimeSafe(new Date(timestamp));
}

function normalizePromptTextForTimeMatch(text: string) {
  return removeZeroWidthChars(text)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function cleanupPendingPromptSends(now = Date.now()) {
  for (let index = pendingPromptSends.length - 1; index >= 0; index -= 1) {
    const pending = pendingPromptSends[index];

    if (pending.used || now - pending.timestamp > PENDING_PROMPT_SEND_TTL_MS) {
      pendingPromptSends.splice(index, 1);
    }
  }
}

function getEditableText(element: Element | null) {
  if (!element) {
    return '';
  }

  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    return element.value;
  }

  return element.textContent || '';
}

function getComposerScope(target?: EventTarget | null) {
  if (!(target instanceof Element)) {
    return document;
  }

  return (
    target.closest('form') ||
    target.closest('[data-testid*="composer" i]') ||
    target.closest('[class*="composer" i]') ||
    document
  );
}

function isLikelyComposerElement(element: Element | null) {
  if (!(element instanceof Element)) {
    return false;
  }

  if (matchesAny(element, 'composer')) {
    return true;
  }

  if (closestFallback(element, 'composer')) {
    return true;
  }

  const form = element instanceof HTMLFormElement ? element : element.closest('form');

  if (form && querySelectorAllFallback(form, 'composer').length > 0) {
    return true;
  }

  if (querySelectorAllFallback(element, 'composer').length > 0) {
    return true;
  }

  return false;
}

function readComposerText(target?: EventTarget | null) {
  const scope = getComposerScope(target);
  if (target instanceof Element) {
    const directEditable =
      target.closest('textarea, input, [contenteditable="true"], [role="textbox"], .ProseMirror') ||
      null;
    const directText = getEditableText(directEditable);

    if (directText.trim()) {
      return directText;
    }
  }

  for (const selector of SELECTORS.composer) {
    const element = scope.querySelector(selector) || document.querySelector(selector);
    const text = getEditableText(element);

    if (text.trim()) {
      return text;
    }
  }

  return '';
}

function capturePendingPromptSend(target?: EventTarget | null) {
  const now = Date.now();
  cleanupPendingPromptSends(now);

  const text = readComposerText(target);
  const normalizedText = normalizePromptTextForTimeMatch(text);
  const recentDuplicate = pendingPromptSends.some((pending) => {
    if (pending.used || now - pending.timestamp > 1000) {
      return false;
    }

    return pending.normalizedText === normalizedText;
  });

  if (recentDuplicate) {
    return;
  }

  pendingPromptSends.push({
    id: `${now}-${Math.random().toString(36).slice(2)}`,
    text,
    normalizedText,
    timestamp: now,
    used: false,
  });
}

function looksLikeSendButton(button: HTMLButtonElement) {
  const labels = [
    button.getAttribute('aria-label') || '',
    button.getAttribute('title') || '',
    button.getAttribute('data-testid') || '',
    button.textContent || '',
  ]
    .join(' ')
    .toLowerCase();

  if (/(send|submit|发送|傳送|送出)/i.test(labels)) {
    return true;
  }

  return button.type === 'submit' && isLikelyComposerElement(button);
}

function startPromptSendTimeCapture() {
  if (hasStartedPromptSendTimeCapture) {
    return;
  }

  hasStartedPromptSendTimeCapture = true;

  document.addEventListener(
    'submit',
    (event) => {
      if (isLikelyComposerElement(event.target as Element | null)) {
        capturePendingPromptSend(event.target);
      }
    },
    true,
  );

  document.addEventListener(
    'click',
    (event) => {
      const button =
        event.target instanceof Element
          ? event.target.closest<HTMLButtonElement>('button')
          : null;

      if (button && looksLikeSendButton(button)) {
        capturePendingPromptSend(button);
      }
    },
    true,
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (
        event.key !== 'Enter' ||
        event.shiftKey ||
        event.isComposing ||
        !isLikelyComposerElement(event.target as Element | null)
      ) {
        return;
      }

      capturePendingPromptSend(event.target);
    },
    true,
  );
}

function findMatchingPendingSend(item: PromptTimelineItem) {
  cleanupPendingPromptSends();

  const normalizedItemText = normalizePromptTextForTimeMatch(item.text);
  const unusedPending = pendingPromptSends.filter((pending) => !pending.used);

  const exactMatch = unusedPending.find(
    (pending) =>
      pending.normalizedText &&
      normalizedItemText &&
      pending.normalizedText === normalizedItemText,
  );

  if (exactMatch) {
    return exactMatch;
  }

  const containsMatch = unusedPending.find((pending) => {
    if (!pending.normalizedText || !normalizedItemText) {
      return false;
    }

    return (
      pending.normalizedText.includes(normalizedItemText) ||
      normalizedItemText.includes(pending.normalizedText)
    );
  });

  if (containsMatch) {
    return containsMatch;
  }

  return unusedPending.find((pending) => !pending.normalizedText) || null;
}

function parseDomTimestampCandidate(value: string | null): ParsedTimestamp | null {
  if (!value) {
    return null;
  }

  const trimmed = removeZeroWidthChars(value).replace(/\s+/g, ' ').trim();

  if (!trimmed) {
    return null;
  }

  const dateTimeMatch = trimmed.match(
    /(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?\s+(\d{1,2}):(\d{2})/,
  );

  if (dateTimeMatch) {
    const [, year, month, day, hour, minute] = dateTimeMatch;

    return {
      text: `${Number(month)}月${Number(day)}日 ${padDatePart(
        Number(hour),
      )}:${minute}`,
    };
  }

  const monthDayTimeMatch = trimmed.match(
    /(\d{1,2})月(\d{1,2})日?\s+(\d{1,2}):(\d{2})/,
  );

  if (monthDayTimeMatch) {
    const [, month, day, hour, minute] = monthDayTimeMatch;

    return {
      text: `${Number(month)}月${Number(day)}日 ${padDatePart(
        Number(hour),
      )}:${minute}`,
    };
  }

  const isoDateTimeMatch = trimmed.match(
    /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/,
  );

  if (isoDateTimeMatch) {
    const parsed = new Date(isoDateTimeMatch[0]);

    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
      return {
        text: formatTimelineDateTimeSafe(parsed),
      };
    }
  }

  const visibleTimeMatch = trimmed.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);

  if (visibleTimeMatch) {
    return {
      text: `${padDatePart(Number(visibleTimeMatch[1]))}:${visibleTimeMatch[2]}`,
    };
  }

  return null;
}

function looksLikeTimestampElement(element: HTMLElement) {
  if (
    element.closest('#ai-chat-navigator-root') ||
    element.closest('button, a, input, textarea, select, [contenteditable="true"]')
  ) {
    return false;
  }

  const text = removeZeroWidthChars(element.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text || text.length > 36 || FILE_EXTENSION_PATTERN.test(text)) {
    return false;
  }

  return (
    /^(\d{4})[-/.年]\d{1,2}[-/.月]\d{1,2}日?\s+\d{1,2}:\d{2}$/.test(text) ||
    /^\d{1,2}月\d{1,2}日?\s+\d{1,2}:\d{2}$/.test(text) ||
    /^([01]?\d|2[0-3]):([0-5]\d)$/.test(text)
  );
}

function collectVisibleTimestampCandidates(scope: HTMLElement) {
  return Array.from(
    scope.querySelectorAll<HTMLElement>('time, span, div, p, [aria-label], [title]'),
  )
    .filter(looksLikeTimestampElement)
    .map((element) => element.textContent || '');
}

function getTimestampSearchScopes(...elements: HTMLElement[]) {
  const scopes: HTMLElement[] = [];

  for (const element of elements) {
    const candidates = [
      element,
      element.closest('article'),
      element.closest('[data-testid^="conversation-turn"]'),
      element.closest('[data-turn-id]'),
      element.closest('[data-message-id]'),
    ];

    for (const candidate of candidates) {
      if (candidate instanceof HTMLElement && !scopes.includes(candidate)) {
        scopes.push(candidate);
      }
    }
  }

  return scopes;
}

function extractTimestampInfo(...elements: HTMLElement[]): TimestampInfo {
  const explicitCandidates: string[] = [];
  const visibleCandidates: string[] = [];

  for (const scope of getTimestampSearchScopes(...elements)) {
    const timeElements = querySelectorAllFallback(scope, 'timestamp');

    for (const timeElement of timeElements) {
      if (timeElement.closest('#ai-chat-navigator-root')) {
        continue;
      }

      explicitCandidates.push(
        timeElement.getAttribute('datetime') || '',
        timeElement.getAttribute('title') || '',
        timeElement.getAttribute('aria-label') || '',
        timeElement.textContent || '',
      );
    }

    explicitCandidates.push(
      scope.getAttribute('datetime') || '',
      scope.getAttribute('title') || '',
      scope.getAttribute('aria-label') || '',
    );

    visibleCandidates.push(...collectVisibleTimestampCandidates(scope));
  }

  for (const candidate of [...explicitCandidates, ...visibleCandidates]) {
    const parsed = parseDomTimestampCandidate(candidate);

    if (parsed) {
      return {
        timestampText: parsed.text,
        timestampSource: 'dom',
      };
    }
  }

  return {
    timestampSource: 'none',
  };
}

function applyPromptTimestampRules(items: PromptTimelineItem[]) {
  if (!hasCompletedInitialPromptScan) {
    for (const item of items) {
      if (
        historicalPromptIds.has(item.id) ||
        userSendTimeByPromptId.has(item.id)
      ) {
        continue;
      }

      const matchingPendingSend = findMatchingPendingSend(item);

      if (matchingPendingSend) {
        matchingPendingSend.used = true;
        userSendTimeByPromptId.set(item.id, matchingPendingSend.timestamp);
      } else {
        historicalPromptIds.add(item.id);
      }
    }

    if (initialPromptScanTimer === null) {
      initialPromptScanTimer = window.setTimeout(() => {
        hasCompletedInitialPromptScan = true;
        initialPromptScanTimer = null;
      }, 1500);
    }

  }

  return items.map((item) => {
    if (item.timestampText && item.timestampSource === 'dom') {
      return item;
    }

    if (historicalPromptIds.has(item.id)) {
      return {
        ...item,
        timestampText: undefined,
        timestampSource: 'none' as const,
      };
    }

    const existingSendTime = userSendTimeByPromptId.get(item.id);

    if (existingSendTime) {
      return {
        ...item,
        timestampText: formatUserSendEventTime(existingSendTime),
        timestampSource: 'user_send_event' as const,
      };
    }

    const matchingPendingSend = findMatchingPendingSend(item);

    if (matchingPendingSend) {
      matchingPendingSend.used = true;
      userSendTimeByPromptId.set(item.id, matchingPendingSend.timestamp);

      return {
        ...item,
        timestampText: formatUserSendEventTime(matchingPendingSend.timestamp),
        timestampSource: 'user_send_event' as const,
      };
    }

    return {
      ...item,
      timestampText: undefined,
      timestampSource: 'none' as const,
    };
  });
}

export function collectPromptTimelineItems(): PromptTimelineItem[] {
  startPromptSendTimeCapture();

  const roleNodes = Array.from(
    document.querySelectorAll<HTMLElement>(USER_MESSAGE_SELECTOR),
  ).filter((node) => {
    if (node.closest('#ai-chat-navigator-root')) {
      return false;
    }

    return true;
  });

  const seenElements = new Set<HTMLElement>();
  const seenKeys = new Set<string>();
  const items: PromptTimelineItem[] = [];

  for (const roleNode of roleNodes) {
    const scrollElement = getMessageScrollElement(roleNode);

    if (seenElements.has(scrollElement)) {
      continue;
    }

    const text = extractPromptText(roleNode);

    if (!hasRealPromptText(text)) {
      continue;
    }

    const order = items.length + 1;
    const fallbackKey = createFallbackKey(text, order, scrollElement);

    if (seenKeys.has(fallbackKey)) {
      continue;
    }

    const attachmentInfo = extractAttachmentInfo(roleNode);
    const turnId = getTurnId(scrollElement) || getTurnId(roleNode);
    const id = getStableElementId(scrollElement, turnId);
    const matchKey = createMatchKey(text, order, turnId);
    const timestampInfo = extractTimestampInfo(
      roleNode,
      scrollElement,
    );

    seenElements.add(scrollElement);
    seenKeys.add(fallbackKey);

    items.push({
      id,
      matchKey,
      turnId,
      order,
      text,
      previewText: truncateText(text, 96),
      timestampText: timestampInfo.timestampText,
      timestampSource: timestampInfo.timestampSource,
      hasAttachment: attachmentInfo.hasAttachment,
      attachmentNames: attachmentInfo.names,
      attachmentSummary: createAttachmentSummary(attachmentInfo),
      element: scrollElement,
      highlightElement: getMessageHighlightElement(roleNode),
    });
  }

  return applyPromptTimestampRules(items);
}

export function resolveLivePromptTimelineItem(
  staleItem: PromptTimelineItem,
): {
  item: PromptTimelineItem | null;
  items: PromptTimelineItem[];
} {
  const freshItems = collectPromptTimelineItems();

  const matchedItem =
    freshItems.find(
      (item) => staleItem.turnId && item.turnId === staleItem.turnId,
    ) ||
    freshItems.find((item) => item.id === staleItem.id) ||
    freshItems.find((item) => item.matchKey === staleItem.matchKey) ||
    freshItems.find(
      (item) => item.order === staleItem.order && item.text === staleItem.text,
    ) ||
    freshItems.find((item) => item.text === staleItem.text) ||
    null;

  if (
    !matchedItem &&
    isConnectedToDocument(staleItem.element) &&
    isConnectedToDocument(staleItem.highlightElement)
  ) {
    return {
      item: staleItem,
      items: freshItems,
    };
  }

  return {
    item: matchedItem,
    items: freshItems,
  };
}
