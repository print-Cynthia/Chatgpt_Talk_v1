import type { CSSProperties } from 'react';
import type { HighlightColor, HighlightStyle } from '../../services/highlightStorage';
import { HIGHLIGHT_COLORS, HIGHLIGHT_STYLES } from '../../services/highlightStorage';
import type { ToolbarPlacement } from '../../services/selectionLayout';
import {
  HIGHLIGHT_DOT_COLORS,
  highlightColorDotStyle,
  highlightColorDotActiveStyle,
  highlightNoteInputStyle,
  highlightStylePanelStyle,
  highlightStylePanelRowStyle,
  highlightStyleOptionStyle,
  highlightStyleOptionActiveStyle,
  highlightConfirmButtonStyle,
  getHighlightStylePreview,
} from './styles';

export interface HighlightStylePanelProps {
  position: { top: number; left: number };
  placement?: ToolbarPlacement;
  color: HighlightColor;
  style: HighlightStyle;
  note: string;
  onColorChange: (color: HighlightColor) => void;
  onStyleChange: (style: HighlightStyle) => void;
  onNoteChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const STYLE_LABELS: Record<HighlightStyle, string> = {
  background: '背景',
  marker: '荧光',
  underline: '下划线',
  textColor: '文字色',
};

export function HighlightStylePanel({
  position,
  placement = 'above',
  color,
  style,
  note,
  onColorChange,
  onStyleChange,
  onNoteChange,
  onConfirm,
}: HighlightStylePanelProps) {
  const transform =
    placement === 'below'
      ? 'translate(-50%, 10px)'
      : 'translate(-50%, calc(-100% - 10px))';

  const base: CSSProperties = {
    ...highlightStylePanelStyle,
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform,
  };

  return (
    <div style={base} onMouseDown={(event) => event.stopPropagation()}>
      <div style={highlightStylePanelRowStyle}>
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`用 ${c} 高亮`}
            title={`${c} 高亮`}
            style={{
              ...highlightColorDotStyle,
              background: HIGHLIGHT_DOT_COLORS[c],
              width: '22px',
              height: '22px',
              ...(c === color ? highlightColorDotActiveStyle : {}),
            }}
            onClick={() => onColorChange(c)}
          />
        ))}
      </div>

      <div style={{ ...highlightStylePanelRowStyle, gap: '6px' }}>
        {HIGHLIGHT_STYLES.map((s) => {
          const isActive = s === style;
          return (
            <button
              key={s}
              type="button"
              aria-label={STYLE_LABELS[s]}
              title={STYLE_LABELS[s]}
              style={{
                ...highlightStyleOptionStyle,
                ...(isActive ? highlightStyleOptionActiveStyle : {}),
              }}
              onClick={() => onStyleChange(s)}
            >
              <span style={getHighlightStylePreview(s, color)}>AaBb</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          value={note}
          placeholder="想法…（可选）"
          style={{ ...highlightNoteInputStyle, flex: 1 }}
          onChange={(event) => onNoteChange(event.target.value)}
        />
        <button
          type="button"
          aria-label="确认高亮"
          title="确认高亮"
          style={highlightConfirmButtonStyle}
          onClick={onConfirm}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
