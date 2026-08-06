import type { CSSProperties } from 'react';
import type { ToolbarPlacement } from '../../services/selectionLayout';
import {
  quickActionBarStyle,
  quickActionButtonStyle,
} from './styles';

export interface HighlightQuickBarProps {
  position: { top: number; left: number };
  placement?: ToolbarPlacement;
  onAskFollowUp: () => void;
  onHighlight: () => void;
  onClose: () => void;
}

export function HighlightQuickBar({
  position,
  placement = 'above',
  onAskFollowUp,
  onHighlight,
}: HighlightQuickBarProps) {
  const transform =
    placement === 'below'
      ? 'translate(-50%, 10px)'
      : 'translate(-50%, calc(-100% - 10px))';

  const base: CSSProperties = {
    ...quickActionBarStyle,
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform,
  };

  return (
    <div style={base} onMouseDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        style={quickActionButtonStyle}
        onClick={onAskFollowUp}
        aria-label="追问"
        title="追问"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        追问
      </button>
      <button
        type="button"
        style={quickActionButtonStyle}
        onClick={onHighlight}
        aria-label="文本高亮"
        title="文本高亮"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m18.5 2.5 3 3" />
          <path d="m15 6 5 5" />
          <path d="m14 7 3 3-8.5 8.5L5 17l1.5-3.5Z" />
        </svg>
        文本高亮
      </button>
    </div>
  );
}
