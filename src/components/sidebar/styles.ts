import type { CSSProperties } from 'react';
import type {
  HighlightColor,
  HighlightStyle,
} from '../../services/highlightStorage';

const TIMELINE_NODE_GAP = 16;
const TIMELINE_VERTICAL_PADDING = 12;

function getWaveScale(distance: number | null) {
  if (distance === null) {
    return 0;
  }

  if (distance === 0) {
    return 1;
  }

  if (distance === 1) {
    return 0.68;
  }

  if (distance === 2) {
    return 0.48;
  }

  if (distance === 3) {
    return 0.3;
  }

  if (distance === 4) {
    return 0.16;
  }

  if (distance === 5) {
    return 0;
  }

  return 0;
}

const railShellStyle: CSSProperties = {
  position: 'relative',
  width: '88px',
  height: '100%',
  pointerEvents: 'none',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const railTrackStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  right: '0px',
  width: '72px',
  height: '100%',
  borderRadius: '999px',
  pointerEvents: 'auto',
  overflow: 'visible',
};

const nodeListStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  listStyle: 'none',
  margin: 0,
  padding: `${TIMELINE_VERTICAL_PADDING}px 0`,
  overflowY: 'auto',
  overflowX: 'visible',
  scrollbarWidth: 'none',
};

const nodeRowStyle: CSSProperties = {
  position: 'relative',
  height: `${TIMELINE_NODE_GAP}px`,
  pointerEvents: 'auto',
};

const emptyDotStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  right: '31px',
  width: '11px',
  height: '2px',
  transform: 'translateY(-50%)',
  borderRadius: '999px',
  background: '#cfd4dc',
  opacity: 0.9,
};

const previewCardBaseStyle: CSSProperties = {
  position: 'fixed',
  right: '82px',
  width: '226px',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: '12px',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  background: 'var(--main-surface-primary, Canvas)',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.09)',
  color: 'var(--text-primary, CanvasText)',
  pointerEvents: 'auto',
};

const previewTextStyle: CSSProperties = {
  fontSize: '13px',
  lineHeight: 1.34,
  fontWeight: 500,
  color: '#1f2937',
  display: '-webkit-box',
  WebkitLineClamp: 4,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const previewTimestampStyle: CSSProperties = {
  marginBottom: '6px',
  color: '#8fa0b7',
  fontSize: '12px',
  lineHeight: 1.2,
};

const attachmentRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexWrap: 'wrap',
  marginTop: '8px',
  color: '#94a3b8',
};

const attachmentChipStyle: CSSProperties = {
  maxWidth: '78px',
  height: '20px',
  padding: '0 6px',
  borderRadius: '5px',
  background: '#f3f4f6',
  color: '#94a3b8',
  fontSize: '11px',
  lineHeight: '20px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const previewActionsStyle: CSSProperties = {
  display: 'flex',
  gap: '6px',
  marginTop: '8px',
};

const previewVersionStyle: CSSProperties = {
  marginLeft: 'auto',
  alignSelf: 'center',
  fontSize: '10px',
  lineHeight: 1,
  color: '#cbd5e1',
  userSelect: 'none',
};

const previewActionButtonStyle: CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '7px',
  border: '1px solid #e5e7eb',
  background: 'var(--main-surface-primary, Canvas)',
  color: '#94a3b8',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'default',
};

const finderToggleStyle: CSSProperties = {
  position: 'absolute',
  right: '26px',
  bottom: '-42px',
  width: '32px',
  height: '32px',
  borderRadius: '9px',
  border: '1px solid rgba(203, 213, 225, 0.95)',
  background: 'var(--main-surface-primary, Canvas)',
  color: '#8fa0b7',
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
  pointerEvents: 'auto',
};

const finderPanelStyle: CSSProperties = {
  position: 'fixed',
  right: '86px',
  top: '118px',
  width: '318px',
  maxHeight: 'min(560px, calc(100vh - 250px))',
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  background: 'var(--main-surface-primary, Canvas)',
  boxShadow: '0 18px 48px rgba(15, 23, 42, 0.12)',
  color: 'var(--text-primary, CanvasText)',
  overflow: 'hidden',
  pointerEvents: 'auto',
  boxSizing: 'border-box',
};

const finderHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px 10px',
  borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
};

const finderTitleStyle: CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.2,
  fontWeight: 720,
  color: '#0f172a',
};

const finderCloseButtonStyle: CSSProperties = {
  width: '26px',
  height: '26px',
  border: 'none',
  borderRadius: '7px',
  background: 'transparent',
  color: '#94a3b8',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
};

const finderSearchWrapStyle: CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
};

const finderSearchRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const finderSearchBoxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flex: 1,
  minWidth: 0,
  height: '38px',
  padding: '0 11px',
  borderRadius: '10px',
  border: '1px solid rgba(203, 213, 225, 0.95)',
  color: '#94a3b8',
  boxSizing: 'border-box',
};

const finderFilterButtonStyle: CSSProperties = {
  flex: '0 0 auto',
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  border: '1px solid rgba(203, 213, 225, 0.95)',
  background: 'var(--main-surface-primary, Canvas)',
  color: '#94a3b8',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
};

const finderFilterButtonActiveStyle: CSSProperties = {
  borderColor: 'rgba(245, 181, 27, 0.55)',
  background: 'rgba(245, 181, 27, 0.1)',
  color: '#d99a00',
};

const finderSearchInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: '#0f172a',
  fontSize: '13px',
  lineHeight: 1,
};

const finderListStyle: CSSProperties = {
  maxHeight: 'calc(min(560px, 100vh - 250px) - 118px)',
  overflowY: 'auto',
  padding: '6px 0',
};

const finderEmptyStyle: CSSProperties = {
  padding: '26px 18px',
  color: '#94a3b8',
  fontSize: '13px',
  textAlign: 'center',
};

const finderItemBaseStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  display: 'grid',
  gridTemplateColumns: '34px minmax(0, 1fr) 20px',
  gap: '8px',
  padding: '10px 14px',
  border: 'none',
  borderLeft: '3px solid transparent',
  background: 'transparent',
  textAlign: 'left',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const finderItemImportantStyle: CSSProperties = {
  borderLeftColor: '#f5b51b',
};

const finderItemActiveStyle: CSSProperties = {
  borderLeftColor: '#111827',
  background: 'rgba(15, 23, 42, 0.045)',
};

const finderItemIndexStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '18px',
  fontWeight: 700,
};

const finderItemIndexActiveStyle: CSSProperties = {
  color: '#111827',
};

const finderItemImportantIconStyle: CSSProperties = {
  alignSelf: 'center',
  color: '#e5a900',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const finderItemTextStyle: CSSProperties = {
  color: '#334155',
  fontSize: '13px',
  lineHeight: 1.35,
  fontWeight: 520,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const finderItemTextActiveStyle: CSSProperties = {
  color: '#0f172a',
  fontWeight: 650,
};

const finderMetaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  marginTop: '5px',
  color: '#94a3b8',
  fontSize: '11px',
  lineHeight: 1.2,
  minWidth: 0,
};

const finderAttachmentBadgeStyle: CSSProperties = {
  maxWidth: '120px',
  height: '18px',
  padding: '0 6px',
  borderRadius: '5px',
  background: '#f3f4f6',
  color: '#8fa0b7',
  lineHeight: '18px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const highlightMarkStyle: CSSProperties = {
  background: 'rgba(250, 204, 21, 0.32)',
  color: 'inherit',
  borderRadius: '3px',
  padding: '0 1px',
};

const HIGHLIGHT_DOT_COLORS: Record<HighlightColor, string> = {
  yellow: '#f5b51b',
  pink: '#ec4899',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
};

// Translucent tints used for background/marker styles (matches the CSS vars).
const HIGHLIGHT_DOT_COLORS_TINT: Record<HighlightColor, string> = {
  yellow: 'rgba(250, 204, 21, 0.34)',
  pink: 'rgba(244, 114, 182, 0.30)',
  green: 'rgba(74, 222, 128, 0.30)',
  blue: 'rgba(96, 165, 250, 0.30)',
  purple: 'rgba(192, 132, 252, 0.30)',
};

// Stronger tones used for text color and underline accents.
const HIGHLIGHT_DOT_COLORS_STRONG: Record<HighlightColor, string> = {
  yellow: '#7c5e00',
  pink: '#9d174d',
  green: '#14532d',
  blue: '#1e3a8a',
  purple: '#4c1d95',
};

function getHighlightStylePreview(
  style: HighlightStyle,
  color: HighlightColor,
): CSSProperties {
  switch (style) {
    case 'background':
      return { background: HIGHLIGHT_DOT_COLORS_TINT[color] };
    case 'marker':
      return {
        background: `linear-gradient(to top, ${HIGHLIGHT_DOT_COLORS_TINT[color]} 55%, transparent 55%)`,
      };
    case 'underline':
      return {
        textDecoration: 'underline',
        textDecorationColor: HIGHLIGHT_DOT_COLORS[color],
        textDecorationThickness: '2px',
        textUnderlineOffset: '2px',
      };
    case 'textColor':
      return { color: HIGHLIGHT_DOT_COLORS_STRONG[color] };
    default:
      return {};
  }
}

const highlightToolbarStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 2147483647,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '8px 10px',
  width: '248px',
  boxSizing: 'border-box',
  borderRadius: '12px',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  background: 'var(--main-surface-primary, Canvas)',
  boxShadow: '0 14px 38px rgba(15, 23, 42, 0.16)',
  color: 'var(--text-primary, CanvasText)',
  pointerEvents: 'auto',
};

const highlightToolbarRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const highlightColorDotStyle: CSSProperties = {
  width: '20px',
  height: '20px',
  borderRadius: '999px',
  border: '1px solid rgba(15, 23, 42, 0.12)',
  cursor: 'pointer',
  padding: 0,
  boxSizing: 'border-box',
};

const highlightColorDotActiveStyle: CSSProperties = {
  border: '2px solid #111827',
  transform: 'scale(1.12)',
};

const highlightNoteInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: '30px',
  padding: '0 9px',
  borderRadius: '8px',
  border: '1px solid rgba(203, 213, 225, 0.95)',
  outline: 'none',
  background: 'var(--main-surface-primary, Canvas)',
  color: 'var(--text-primary, CanvasText)',
  fontSize: '12px',
  boxSizing: 'border-box',
};

const highlightToolbarButtonStyle: CSSProperties = {
  height: '28px',
  padding: '0 10px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  background: '#050505',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};

const quickActionBarStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 2147483647,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px',
  borderRadius: '10px',
  background: '#0f172a',
  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.28)',
  color: '#ffffff',
  pointerEvents: 'auto',
};

const quickActionButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  height: '30px',
  padding: '0 10px',
  borderRadius: '7px',
  border: 'none',
  background: 'transparent',
  color: '#e2e8f0',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
};

const quickActionButtonActiveStyle: CSSProperties = {
  background: 'rgba(255, 255, 255, 0.12)',
  color: '#ffffff',
};

const highlightStylePanelStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 2147483647,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '10px 12px',
  width: '276px',
  boxSizing: 'border-box',
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  background: 'var(--main-surface-primary, Canvas)',
  boxShadow: '0 14px 38px rgba(15, 23, 42, 0.16)',
  color: 'var(--text-primary, CanvasText)',
  pointerEvents: 'auto',
};

const highlightStylePanelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const highlightStyleOptionStyle: CSSProperties = {
  flex: 1,
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  border: '1px solid rgba(203, 213, 225, 0.85)',
  background: 'rgba(248, 250, 252, 0.6)',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  padding: 0,
};

const highlightStyleOptionActiveStyle: CSSProperties = {
  border: '2px solid #111827',
  background: '#ffffff',
};

const highlightConfirmButtonStyle: CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '999px',
  border: 'none',
  background: '#2563eb',
  color: '#ffffff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
  fontSize: '16px',
  lineHeight: 1,
};

const highlightCardStyle: CSSProperties = {
  position: 'fixed',
  zIndex: 2147483647,
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '10px 12px',
  width: '248px',
  boxSizing: 'border-box',
  borderRadius: '12px',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  background: 'var(--main-surface-primary, Canvas)',
  boxShadow: '0 14px 38px rgba(15, 23, 42, 0.18)',
  color: 'var(--text-primary, CanvasText)',
  pointerEvents: 'auto',
};

const highlightToastStyle: CSSProperties = {
  position: 'fixed',
  left: '50%',
  bottom: '28px',
  transform: 'translateX(-50%)',
  padding: '8px 14px',
  borderRadius: '999px',
  background: 'rgba(15, 23, 42, 0.92)',
  color: '#ffffff',
  fontSize: '12px',
  fontWeight: 600,
  boxShadow: '0 8px 22px rgba(15, 23, 42, 0.28)',
  pointerEvents: 'none',
  zIndex: 2147483647,
};

const highlightsToggleStyle: CSSProperties = {
  ...finderToggleStyle,
  bottom: '-84px',
};

const railVersionBadgeStyle: CSSProperties = {
  position: 'absolute',
  right: '14px',
  bottom: '14px',
  fontSize: '9px',
  lineHeight: 1,
  color: '#94a3b8',
  userSelect: 'none',
  pointerEvents: 'none',
};

const favoritesToggleBaseStyle: CSSProperties = {
  position: 'fixed',
  width: '40px',
  height: '40px',
  borderRadius: '11px',
  border: '1px solid rgba(203, 213, 225, 0.95)',
  background: 'var(--main-surface-primary, Canvas)',
  color: '#8fa0b7',
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  cursor: 'pointer',
  pointerEvents: 'auto',
};

const favoritesToggleActiveStyle: CSSProperties = {
  borderColor: '#f5b51b',
  background: '#fff8e6',
  color: '#d98b00',
};

const favoritesPanelBaseStyle: CSSProperties = {
  position: 'fixed',
  width: '344px',
  maxHeight: 'min(500px, calc(100vh - 150px))',
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.95)',
  background: 'var(--main-surface-primary, Canvas)',
  boxShadow: '0 18px 48px rgba(15, 23, 42, 0.14)',
  color: 'var(--text-primary, CanvasText)',
  overflow: 'hidden',
  pointerEvents: 'auto',
  boxSizing: 'border-box',
};

const highlightsPanelBaseStyle: CSSProperties = {
  ...favoritesPanelBaseStyle,
  width: '240px',
  border: '1px solid rgba(15, 23, 42, 0.16)',
};

const favoritesListStyle: CSSProperties = {
  maxHeight: 'calc(min(500px, 100vh - 150px) - 56px)',
  overflowY: 'auto',
};

const favoritesFilterBarStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '7px',
  padding: '10px 14px',
  borderBottom: '1px solid rgba(226, 232, 240, 0.7)',
};

const favoritesFilterChipStyle: CSSProperties = {
  maxWidth: '120px',
  height: '24px',
  padding: '0 9px',
  borderRadius: '999px',
  border: '1px solid rgba(203, 213, 225, 0.9)',
  background: 'transparent',
  color: '#64748b',
  fontSize: '11px',
  lineHeight: '22px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const favoritesFilterChipActiveStyle: CSSProperties = {
  borderColor: 'rgba(245, 181, 27, 0.65)',
  background: '#fff8e6',
  color: '#d98b00',
};

const favoriteItemStyle: CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid rgba(226, 232, 240, 0.72)',
};

const favoriteTitleInputStyle: CSSProperties = {
  width: '100%',
  border: 'none',
  outline: 'none',
  padding: 0,
  background: 'transparent',
  color: '#172033',
  fontSize: '13px',
  lineHeight: 1.35,
  fontWeight: 680,
  boxSizing: 'border-box',
};

const favoritePreviewStyle: CSSProperties = {
  marginTop: '6px',
  color: '#64748b',
  fontSize: '12px',
  lineHeight: 1.45,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const favoriteFullTextStyle: CSSProperties = {
  marginTop: '8px',
  padding: '9px 10px',
  borderRadius: '8px',
  background: '#f8fafc',
  color: '#334155',
  fontSize: '12px',
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const favoriteTagsRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: '6px',
  marginTop: '8px',
};

const favoriteTagPillStyle: CSSProperties = {
  maxWidth: '128px',
  height: '22px',
  padding: '0 8px',
  borderRadius: '999px',
  border: '1px solid rgba(203, 213, 225, 0.9)',
  background: '#f8fafc',
  color: '#64748b',
  fontSize: '11px',
  lineHeight: '20px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const favoriteTagAddPillStyle: CSSProperties = {
  ...favoriteTagPillStyle,
  borderStyle: 'dashed',
  background: 'transparent',
  color: '#94a3b8',
};

const favoriteTagsInlineInputStyle: CSSProperties = {
  width: '92px',
  maxWidth: '100%',
  height: '24px',
  padding: '0 8px',
  borderRadius: '999px',
  border: '1px solid rgba(203, 213, 225, 0.95)',
  outline: 'none',
  background: 'var(--main-surface-primary, Canvas)',
  color: '#64748b',
  fontSize: '11px',
  boxSizing: 'border-box',
};

const favoriteMetaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginTop: '8px',
};

const favoriteTextButtonStyle: CSSProperties = {
  height: '26px',
  padding: '0 8px',
  borderRadius: '7px',
  border: '1px solid #e5e7eb',
  background: 'transparent',
  color: '#64748b',
  fontSize: '11px',
  cursor: 'pointer',
};

const favoriteRemoveButtonStyle: CSSProperties = {
  ...favoriteTextButtonStyle,
  marginLeft: 'auto',
  color: '#94a3b8',
};

const favoriteDialogBackdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.38)',
  backdropFilter: 'blur(3px)',
  pointerEvents: 'auto',
  zIndex: 2147483646,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  boxSizing: 'border-box',
};

const favoriteDialogStyle: CSSProperties = {
  width: 'min(720px, calc(100vw - 48px))',
  borderRadius: '16px',
  background: 'var(--main-surface-primary, Canvas)',
  boxShadow: '0 28px 72px rgba(15, 23, 42, 0.24)',
  color: 'var(--text-primary, CanvasText)',
  overflow: 'hidden',
  pointerEvents: 'auto',
};

const favoriteDialogHeaderStyle: CSSProperties = {
  padding: '24px 34px',
  borderBottom: '1px solid rgba(226, 232, 240, 0.9)',
  fontSize: '20px',
  lineHeight: 1.2,
  fontWeight: 760,
  color: '#111827',
};

const favoriteDialogBodyStyle: CSSProperties = {
  padding: '26px 34px 24px',
};

const favoriteDialogRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '92px minmax(0, 1fr)',
  alignItems: 'center',
  gap: '14px',
  marginBottom: '18px',
};

const favoriteDialogLabelStyle: CSSProperties = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: 1.2,
  fontWeight: 520,
  textAlign: 'right',
};

const favoriteDialogRequiredStyle: CSSProperties = {
  color: '#ef4444',
};

const favoriteDialogInputStyle: CSSProperties = {
  width: '100%',
  height: '44px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  outline: 'none',
  padding: '0 14px',
  color: '#111827',
  background: 'var(--main-surface-primary, Canvas)',
  fontSize: '14px',
  boxSizing: 'border-box',
};

const favoriteDialogPreviewStyle: CSSProperties = {
  margin: '2px 0 20px 106px',
  padding: '10px 12px',
  borderRadius: '10px',
  background: '#f8fafc',
  color: '#64748b',
  fontSize: '12px',
  lineHeight: 1.45,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const favoriteDialogTagOptionsStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '7px',
  margin: '-6px 0 18px 106px',
};

const favoriteDialogTagButtonStyle: CSSProperties = {
  height: '26px',
  padding: '0 9px',
  borderRadius: '999px',
  border: '1px solid #dbe3ef',
  background: '#f8fafc',
  color: '#64748b',
  fontSize: '12px',
  cursor: 'pointer',
};

const favoriteDialogTagButtonActiveStyle: CSSProperties = {
  borderColor: 'rgba(245, 181, 27, 0.58)',
  background: '#fff8e6',
  color: '#d98b00',
};

const favoriteDialogFooterStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  padding: '20px 34px 24px',
  borderTop: '1px solid rgba(226, 232, 240, 0.9)',
};

const favoriteDialogSecondaryButtonStyle: CSSProperties = {
  height: '44px',
  minWidth: '86px',
  borderRadius: '10px',
  border: 'none',
  background: '#f1f5f9',
  color: '#334155',
  fontSize: '14px',
  fontWeight: 680,
  cursor: 'pointer',
};

const favoriteDialogPrimaryButtonStyle: CSSProperties = {
  ...favoriteDialogSecondaryButtonStyle,
  background: '#050505',
  color: '#ffffff',
};

function getNodeButtonStyle(): CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    right: '20px',
    width: '34px',
    height: '16px',
    transform: 'translateY(-50%)',
    border: 'none',
    background: 'transparent',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    pointerEvents: 'auto',
  };
}

function getStripeStyle(
  isActive: boolean,
  isHovered: boolean,
  distanceFromHovered: number | null,
): CSSProperties {
  const wave = getWaveScale(distanceFromHovered);
  const isNearHovered =
    distanceFromHovered !== null && distanceFromHovered > 0 && distanceFromHovered <= 4;
  const shouldEmphasize = isActive || isHovered;
  const normalWidth = 14;
  const width = isHovered
    ? 30
    : isActive
      ? 20
      : isNearHovered
        ? 16 + wave * 13
        : normalWidth;
  const height = isHovered ? 3.5 : isActive ? 3.5 : isNearHovered ? 2 + wave * 1.1 : 2;
  const translateX = 0;
  const background = shouldEmphasize ? '#111827' : '#cfd4dc';

  return {
    position: 'absolute',
    top: '50%',
    right: '7px',
    width: `${width}px`,
    height: `${height}px`,
    transform: `translateY(-50%) translateX(${translateX}px)`,
    transformOrigin: 'right center',
    borderRadius: '999px',
    background,
    opacity: shouldEmphasize ? 1 : isNearHovered ? 0.9 : 0.78,
    boxShadow: shouldEmphasize ? '0 1px 2px rgba(15, 23, 42, 0.14)' : 'none',
    transition:
      'width 150ms ease-out, height 150ms ease-out, transform 150ms ease-out, background 120ms ease-out, opacity 120ms ease-out, box-shadow 120ms ease-out',
  };
}

const importantMarkerStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  right: '29px',
  width: '3px',
  height: '11px',
  transform: 'translateY(-50%)',
  borderRadius: '999px',
  background: '#f5b51b',
  boxShadow: '0 0 0 1px rgba(245, 181, 27, 0.08)',
};

function getPreviewActionStyle(
  isActive: boolean,
  activeColor: 'important' | 'favorite',
): CSSProperties {
  if (!isActive) {
    return {
      ...previewActionButtonStyle,
      cursor: 'pointer',
    };
  }

  const isImportant = activeColor === 'important';

  return {
    ...previewActionButtonStyle,
    cursor: 'pointer',
    borderColor: isImportant
      ? 'rgba(245, 181, 27, 0.55)'
      : 'rgba(234, 148, 0, 0.5)',
    background: isImportant
      ? 'rgba(245, 181, 27, 0.1)'
      : 'rgba(234, 148, 0, 0.1)',
    color: isImportant ? '#d99a00' : '#dc8900',
  };
}

export {
  TIMELINE_NODE_GAP,
  TIMELINE_VERTICAL_PADDING,
  railShellStyle,
  railTrackStyle,
  nodeListStyle,
  nodeRowStyle,
  emptyDotStyle,
  previewCardBaseStyle,
  previewTextStyle,
  previewTimestampStyle,
  attachmentRowStyle,
  attachmentChipStyle,
  previewActionsStyle,
  previewVersionStyle,
  previewActionButtonStyle,
  finderToggleStyle,
  finderPanelStyle,
  finderHeaderStyle,
  finderTitleStyle,
  finderCloseButtonStyle,
  finderSearchWrapStyle,
  finderSearchRowStyle,
  finderSearchBoxStyle,
  finderFilterButtonStyle,
  finderFilterButtonActiveStyle,
  finderSearchInputStyle,
  finderListStyle,
  finderEmptyStyle,
  finderItemBaseStyle,
  finderItemImportantStyle,
  finderItemActiveStyle,
  finderItemIndexStyle,
  finderItemIndexActiveStyle,
  finderItemImportantIconStyle,
  finderItemTextStyle,
  finderItemTextActiveStyle,
  finderMetaStyle,
  finderAttachmentBadgeStyle,
  highlightMarkStyle,
  HIGHLIGHT_DOT_COLORS,
  HIGHLIGHT_DOT_COLORS_TINT,
  HIGHLIGHT_DOT_COLORS_STRONG,
  getHighlightStylePreview,
  highlightToolbarStyle,
  highlightToolbarRowStyle,
  highlightColorDotStyle,
  highlightColorDotActiveStyle,
  highlightNoteInputStyle,
  highlightToolbarButtonStyle,
  quickActionBarStyle,
  quickActionButtonStyle,
  quickActionButtonActiveStyle,
  highlightStylePanelStyle,
  highlightStylePanelRowStyle,
  highlightStyleOptionStyle,
  highlightStyleOptionActiveStyle,
  highlightConfirmButtonStyle,
  highlightCardStyle,
  highlightToastStyle,
  highlightsToggleStyle,
  railVersionBadgeStyle,
  favoritesToggleBaseStyle,
  favoritesToggleActiveStyle,
  favoritesPanelBaseStyle,
  highlightsPanelBaseStyle,
  favoritesListStyle,
  favoritesFilterBarStyle,
  favoritesFilterChipStyle,
  favoritesFilterChipActiveStyle,
  favoriteItemStyle,
  favoriteTitleInputStyle,
  favoritePreviewStyle,
  favoriteFullTextStyle,
  favoriteTagsRowStyle,
  favoriteTagPillStyle,
  favoriteTagAddPillStyle,
  favoriteTagsInlineInputStyle,
  favoriteMetaRowStyle,
  favoriteTextButtonStyle,
  favoriteRemoveButtonStyle,
  favoriteDialogBackdropStyle,
  favoriteDialogStyle,
  favoriteDialogHeaderStyle,
  favoriteDialogBodyStyle,
  favoriteDialogRowStyle,
  favoriteDialogLabelStyle,
  favoriteDialogRequiredStyle,
  favoriteDialogInputStyle,
  favoriteDialogPreviewStyle,
  favoriteDialogTagOptionsStyle,
  favoriteDialogTagButtonStyle,
  favoriteDialogTagButtonActiveStyle,
  favoriteDialogFooterStyle,
  favoriteDialogSecondaryButtonStyle,
  favoriteDialogPrimaryButtonStyle,
  getNodeButtonStyle,
  getStripeStyle,
  getPreviewActionStyle,
  importantMarkerStyle,
};
