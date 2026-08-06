import type { CSSProperties } from 'react';
import type {
  HighlightColor,
  HighlightStyle,
  ResponseHighlight,
} from '../../services/highlightStorage';
import { HIGHLIGHT_COLORS, HIGHLIGHT_STYLES } from '../../services/highlightStorage';
import {
  HIGHLIGHT_DOT_COLORS,
  highlightCardStyle,
  highlightToolbarRowStyle,
  highlightColorDotStyle,
  highlightColorDotActiveStyle,
  highlightNoteInputStyle,
  highlightToolbarButtonStyle,
  highlightStyleOptionStyle,
  highlightStyleOptionActiveStyle,
  getHighlightStylePreview,
} from './styles';

export interface HighlightCardProps {
  position: { top: number; left: number };
  highlight: ResponseHighlight;
  onRecolor: (color: HighlightColor) => void;
  onStyleChange: (style: HighlightStyle) => void;
  onNoteChange: (note: string) => void;
  onTagsChange: (tags: string[]) => void;
  onJump: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export function HighlightCard({
  position,
  highlight,
  onRecolor,
  onStyleChange,
  onNoteChange,
  onTagsChange,
  onJump,
  onRemove,
  onClose,
}: HighlightCardProps) {
  const base: CSSProperties = {
    ...highlightCardStyle,
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: 'translate(-50%, calc(-100% - 10px))',
  };

  return (
    <div style={base} onMouseDown={(event) => event.stopPropagation()}>
      <div style={highlightToolbarRowStyle}>
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`改为${color}高亮`}
            title={`${color} 高亮`}
            style={{
              ...highlightColorDotStyle,
              ...(highlight.color === color ? highlightColorDotActiveStyle : null),
              background: HIGHLIGHT_DOT_COLORS[color],
            }}
            onClick={() => {
              onRecolor(color);
            }}
          />
        ))}
      </div>

      <div style={{ ...highlightToolbarRowStyle, gap: '6px' }}>
        {HIGHLIGHT_STYLES.map((style) => (
          <button
            key={style}
            type="button"
            aria-label={style}
            title={style}
            style={{
              ...highlightStyleOptionStyle,
              ...(highlight.style === style ? highlightStyleOptionActiveStyle : null),
            }}
            onClick={() => onStyleChange(style)}
          >
            <span style={getHighlightStylePreview(style, highlight.color)}>
              AaBb
            </span>
          </button>
        ))}
      </div>

      <input
        type="text"
        value={highlight.note}
        placeholder="想法…"
        style={highlightNoteInputStyle}
        onChange={(event) => {
          onNoteChange(event.target.value);
        }}
      />

      <input
        type="text"
        value={highlight.tags.join(', ')}
        placeholder="标签，逗号分隔"
        style={highlightNoteInputStyle}
        onChange={(event) => {
          onTagsChange(
            event.target.value
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          );
        }}
      />

      <div style={highlightToolbarRowStyle}>
        <button
          type="button"
          style={highlightToolbarButtonStyle}
          onClick={onJump}
        >
          跳回
        </button>
        <button
          type="button"
          style={{
            ...highlightToolbarButtonStyle,
            background: 'transparent',
            color: '#ef4444',
            border: '1px solid #fecaca',
          }}
          onClick={onRemove}
        >
          删除
        </button>
        <button
          type="button"
          style={{
            ...highlightToolbarButtonStyle,
            background: 'transparent',
            color: '#94a3b8',
            border: '1px solid #e5e7eb',
            marginLeft: 'auto',
          }}
          onClick={onClose}
        >
          关闭
        </button>
      </div>
    </div>
  );
}
