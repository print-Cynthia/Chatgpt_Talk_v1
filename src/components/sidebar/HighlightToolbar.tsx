import type { CSSProperties } from 'react';
import type { HighlightColor } from '../../services/highlightStorage';
import { HIGHLIGHT_COLORS } from '../../services/highlightStorage';
import type { ToolbarPlacement } from '../../services/selectionLayout';
import {
  HIGHLIGHT_DOT_COLORS,
  highlightToolbarStyle,
  highlightToolbarRowStyle,
  highlightColorDotStyle,
  highlightColorDotActiveStyle,
  highlightNoteInputStyle,
  highlightToolbarButtonStyle,
} from './styles';

export interface HighlightToolbarProps {
  position: { top: number; left: number };
  placement?: ToolbarPlacement;
  note: string;
  onNoteChange: (value: string) => void;
  onPickColor: (color: HighlightColor) => void;
  onClose: () => void;
}

export function HighlightToolbar({
  position,
  placement = 'above',
  note,
  onNoteChange,
  onPickColor,
  onClose,
}: HighlightToolbarProps) {
  const transform =
    placement === 'below'
      ? 'translate(-50%, 10px)'
      : 'translate(-50%, calc(-100% - 10px))';

  const base: CSSProperties = {
    ...highlightToolbarStyle,
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform,
  };

  return (
    <div style={base} onMouseDown={(event) => event.stopPropagation()}>
      <div style={highlightToolbarRowStyle}>
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`用${color}高亮`}
            title={`${color} 高亮`}
            style={{
              ...highlightColorDotStyle,
              background: HIGHLIGHT_DOT_COLORS[color],
            }}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              onPickColor(color);
            }}
          />
        ))}
        <button
          type="button"
          aria-label="取消高亮"
          style={{
            ...highlightToolbarButtonStyle,
            background: 'transparent',
            color: '#94a3b8',
            border: '1px solid #e5e7eb',
          }}
          onClick={onClose}
        >
          取消
        </button>
      </div>

      <input
        type="text"
        value={note}
        placeholder="想法…（可选）"
        style={highlightNoteInputStyle}
        onChange={(event) => {
          onNoteChange(event.target.value);
        }}
      />
    </div>
  );
}
