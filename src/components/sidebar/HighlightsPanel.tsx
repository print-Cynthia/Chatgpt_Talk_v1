import { useState } from 'react';
import type {
  HighlightColor,
  HighlightStyle,
  ResponseHighlight,
} from '../../services/highlightStorage';
import { HIGHLIGHT_COLORS, HIGHLIGHT_STYLES } from '../../services/highlightStorage';
import {
  favoritesToggleBaseStyle,
  favoritesToggleActiveStyle,
  favoritesPanelBaseStyle,
  highlightsPanelBaseStyle,
  favoritesListStyle,
  favoritesFilterBarStyle,
  favoritesFilterChipStyle,
  favoritesFilterChipActiveStyle,
  finderHeaderStyle,
  finderTitleStyle,
  finderCloseButtonStyle,
  finderEmptyStyle,
  favoriteItemStyle,
  favoritePreviewStyle,
  favoriteTagsRowStyle,
  favoriteTagPillStyle,
  favoriteMetaRowStyle,
  favoriteTextButtonStyle,
  favoriteRemoveButtonStyle,
  highlightsToggleStyle,
  highlightToolbarButtonStyle,
  highlightColorDotStyle,
  highlightColorDotActiveStyle,
  highlightNoteInputStyle,
  HIGHLIGHT_DOT_COLORS,
  highlightStyleOptionStyle,
  highlightStyleOptionActiveStyle,
  getHighlightStylePreview,
} from './styles';
import { HighlightIcon, CloseIcon } from './icons';

// Labels / patterns ChatGPT injects as accessibility/UI chrome or structural
// markers (not real message prose). Stripped from the gray context preview so it
// never shows instruction leakage, reasoning badges, or meta-commentary picked up
// from the turn container.
const CONTEXT_NOISE_TOKENS = [
  'ChatGPT 说：',
  'ChatGPT said:',
  '已思考',
  'Thought for',
  'reasoning',
  '语音模式',
  'Voice mode',
];

// Sentence-ending punctuation (CJK + Latin). When context radius crosses a
// sentence boundary we truncate there instead of bleeding into the next
// sentence — this is the main source of "noise" complaints.
const SENTENCE_END = /[。！？\.!\n]/;

function sanitizeContext(value: string): string {
  let out = value;

  // Strip noise tokens at edges.
  for (const token of CONTEXT_NOISE_TOKENS) {
    if (out.startsWith(token)) {
      out = out.slice(token.length).replace(/^[\s:：]+/, '');
    }

    if (out.endsWith(token)) {
      out = out.slice(0, out.length - token.length).replace(/[\s:：]+$/, '');
    }
  }

  // Truncate at the FIRST sentence boundary inside the string so we never show
  // fragments of the next sentence. Keep leading … if present.
  const dotIdx = out.search(SENTENCE_END);
  if (dotIdx > 0) {
    out = out.slice(0, dotIdx + 1);
  }

  // Collapse multiple whitespace runs that result from stripping.
  out = out.replace(/\s{2,}/g, ' ').trim();

  return out;
}

export interface HighlightsAnchor {
  left: number;
  top: number;
}

export interface HighlightsPanelProps {
  isOpen: boolean;
  highlights: ResponseHighlight[];
  visibleHighlights: ResponseHighlight[];
  tagOptions: string[];
  selectedTag: string | null;
  anchor: HighlightsAnchor;
  onToggleOpen: () => void;
  onClose: () => void;
  onSelectTag: (tag: string | null) => void;
  onJump: (id: string) => void;
  onRemove: (id: string) => void;
  onSave: (
    id: string,
    patch: {
      color?: HighlightColor;
      style?: HighlightStyle;
      note?: string;
      tags?: string[];
    },
  ) => void;
}

function HighlightRow({
  highlight,
  onJump,
  onRemove,
  onSave,
}: {
  highlight: ResponseHighlight;
  onJump: (id: string) => void;
  onRemove: (id: string) => void;
  onSave: (
    id: string,
    patch: {
      color?: HighlightColor;
      style?: HighlightStyle;
      note?: string;
      tags?: string[];
    },
  ) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [note, setNote] = useState(highlight.note);
  const [tagsInput, setTagsInput] = useState(highlight.tags.join(', '));
  const [color, setColor] = useState<HighlightColor>(highlight.color);
  const [style, setStyle] = useState<HighlightStyle>(highlight.style);

  return (
    <div style={favoriteItemStyle}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          cursor: 'pointer',
        }}
        onClick={() => {
          if (!isEditing) {
            onJump(highlight.id);
          }
        }}
      >
        <span
          style={{
            flex: '0 0 auto',
            width: '12px',
            height: '12px',
            marginTop: '3px',
            borderRadius: '3px',
            background: HIGHLIGHT_DOT_COLORS[highlight.color],
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              color: '#334155',
              fontSize: '13px',
              lineHeight: 1.4,
              fontWeight: 520,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {highlight.text}
          </div>
          {highlight.contextBefore || highlight.contextAfter ? (
            <div
              style={{
                marginTop: '4px',
                color: '#aab4c2',
                fontSize: '11px',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {highlight.contextBefore
                ? `…${sanitizeContext(highlight.contextBefore)}`
                : ''}
              {highlight.contextAfter
                ? `${sanitizeContext(highlight.contextAfter)}…`
                : ''}
            </div>
          ) : null}
          {highlight.note ? (
            <div style={favoritePreviewStyle}>{highlight.note}</div>
          ) : null}
          {highlight.tags.length > 0 ? (
            <div style={favoriteTagsRowStyle}>
              {highlight.tags.map((tag) => (
                <span key={tag} style={favoriteTagPillStyle}>
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div style={favoriteMetaRowStyle}>
        <button
          type="button"
          style={favoriteTextButtonStyle}
          onClick={() => {
            setIsEditing((current) => !current);
            setNote(highlight.note);
            setTagsInput(highlight.tags.join(', '));
            setColor(highlight.color);
            setStyle(highlight.style);
          }}
        >
          {isEditing ? '收起' : '编辑'}
        </button>
        <button
          type="button"
          style={favoriteRemoveButtonStyle}
          onClick={() => {
            onRemove(highlight.id);
          }}
        >
          删除
        </button>
      </div>

      {isEditing ? (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`改为${c}高亮`}
                style={{
                  ...highlightColorDotStyle,
                  ...(color === c ? highlightColorDotActiveStyle : null),
                  background: HIGHLIGHT_DOT_COLORS[c],
                }}
                onClick={() => {
                  setColor(c);
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {HIGHLIGHT_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                aria-label={s}
                title={s}
                style={{
                  ...highlightStyleOptionStyle,
                  ...(style === s ? highlightStyleOptionActiveStyle : null),
                }}
                onClick={() => setStyle(s)}
              >
                <span style={getHighlightStylePreview(s, color)}>AaBb</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={note}
            placeholder="想法…"
            style={highlightNoteInputStyle}
            onChange={(event) => {
              setNote(event.target.value);
            }}
          />
          <input
            type="text"
            value={tagsInput}
            placeholder="标签，逗号分隔"
            style={highlightNoteInputStyle}
            onChange={(event) => {
              setTagsInput(event.target.value);
            }}
          />
          <button
            type="button"
            style={highlightToolbarButtonStyle}
            onClick={() => {
              onSave(highlight.id, {
                color,
                style,
                note,
                tags: tagsInput
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              });
              setIsEditing(false);
            }}
          >
            保存
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function HighlightsPanel({
  isOpen,
  highlights,
  visibleHighlights,
  tagOptions,
  selectedTag,
  anchor,
  onToggleOpen,
  onClose,
  onSelectTag,
  onJump,
  onRemove,
  onSave,
}: HighlightsPanelProps) {
  return (
    <>
      <button
        type="button"
        aria-label="打开 AI 回复高亮"
        aria-expanded={isOpen}
        title="AI 回复高亮"
        style={{
          ...favoritesToggleBaseStyle,
          ...highlightsToggleStyle,
          ...(isOpen ? favoritesToggleActiveStyle : null),
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleOpen();
        }}
      >
        <HighlightIcon filled={isOpen} />
      </button>

      {isOpen ? (
        <section
          id="ai-chat-navigator-response-highlights"
          style={{
            ...highlightsPanelBaseStyle,
            left: '8px',
            bottom: '74px',
            maxWidth: 'min(240px, calc(100vw - 20px))',
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div style={finderHeaderStyle}>
            <div style={finderTitleStyle}>高亮</div>
            <button
              type="button"
              aria-label="关闭高亮面板"
              style={finderCloseButtonStyle}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClose();
              }}
            >
              <CloseIcon />
            </button>
          </div>

          {tagOptions.length > 0 ? (
            <div style={favoritesFilterBarStyle}>
              <button
                type="button"
                aria-pressed={!selectedTag}
                style={{
                  ...favoritesFilterChipStyle,
                  ...(!selectedTag ? favoritesFilterChipActiveStyle : null),
                }}
                onClick={() => {
                  onSelectTag(null);
                }}
              >
                全部
              </button>
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  title={tag}
                  aria-pressed={selectedTag === tag}
                  style={{
                    ...favoritesFilterChipStyle,
                    ...(selectedTag === tag
                      ? favoritesFilterChipActiveStyle
                      : null),
                  }}
                  onClick={() => {
                    onSelectTag(tag);
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}

          <div style={favoritesListStyle}>
            {highlights.length === 0 ? (
              <div style={finderEmptyStyle}>
                还没有高亮。在 AI 回复中选中文字即可高亮。
              </div>
            ) : visibleHighlights.length === 0 ? (
              <div style={finderEmptyStyle}>当前标签下还没有高亮。</div>
            ) : (
              visibleHighlights.map((highlight) => (
                <HighlightRow
                  key={highlight.id}
                  highlight={highlight}
                  onJump={onJump}
                  onRemove={onRemove}
                  onSave={onSave}
                />
              ))
            )}
          </div>
        </section>
      ) : null}
    </>
  );
}
