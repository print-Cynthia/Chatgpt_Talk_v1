import { useEffect, useRef, useState } from 'react';
import type { PromptFavorite } from '../../services/promptSaveStorage';
import {
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
} from './styles';
import { parseTagsInput } from './utils';

export interface FavoriteItemProps {
  favorite: PromptFavorite;
  isCopied: boolean;
  onCopy: (favorite: PromptFavorite) => void;
  onRemove: (favoriteId: string) => void;
  onSave: (favoriteId: string, title: string, tags: string[]) => void;
}

export function FavoriteItem({
  favorite,
  isCopied,
  onCopy,
  onRemove,
  onSave,
}: FavoriteItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingTagIndex, setEditingTagIndex] = useState<number | null>(null);
  const [tagDraft, setTagDraft] = useState('');
  const [title, setTitle] = useState(favorite.title);
  const [tagsInput, setTagsInput] = useState(favorite.tags.join(', '));
  const skipNextBlurSaveRef = useRef(false);

  useEffect(() => {
    setTitle(favorite.title);
    setTagsInput(favorite.tags.join(', '));
    setEditingTagIndex(null);
    setTagDraft('');
  }, [favorite.favoriteId]);

  const saveEdits = (nextTags = parseTagsInput(tagsInput)) => {
    onSave(favorite.favoriteId, title, nextTags);
  };
  const tags = parseTagsInput(tagsInput);

  const closeTagEditor = () => {
    setEditingTagIndex(null);
    setTagDraft('');
  };

  const commitTagDraft = () => {
    if (editingTagIndex === null) {
      return;
    }

    const nextTags = [...tags];
    const nextTag = tagDraft.trim();

    if (editingTagIndex < nextTags.length) {
      if (nextTag) {
        nextTags[editingTagIndex] = nextTag;
      } else {
        nextTags.splice(editingTagIndex, 1);
      }
    } else if (nextTag) {
      nextTags.push(nextTag);
    }

    const normalizedTags = parseTagsInput(nextTags.join(', '));
    skipNextBlurSaveRef.current = true;
    setTagsInput(normalizedTags.join(', '));
    saveEdits(normalizedTags);
    closeTagEditor();
  };

  return (
    <article
      style={favoriteItemStyle}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          if (skipNextBlurSaveRef.current) {
            skipNextBlurSaveRef.current = false;
            return;
          }

          saveEdits();
        }
      }}
    >
      <input
        aria-label="收藏标题"
        value={title}
        style={favoriteTitleInputStyle}
        onChange={(event) => {
          setTitle(event.currentTarget.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />

      {!isExpanded ? (
        <div style={favoritePreviewStyle}>{favorite.promptFullText}</div>
      ) : (
        <div style={favoriteFullTextStyle}>{favorite.promptFullText}</div>
      )}

      <div style={favoriteTagsRowStyle}>
        {tags.length > 0
          ? tags.map((tag, index) =>
              editingTagIndex === index ? (
                <input
                  key={tag}
                  autoFocus
                  aria-label="编辑 tag"
                  value={tagDraft}
                  placeholder="tag"
                  style={favoriteTagsInlineInputStyle}
                  onBlur={commitTagDraft}
                  onChange={(event) => {
                    setTagDraft(event.currentTarget.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.currentTarget.blur();
                    }

                    if (event.key === 'Escape') {
                      closeTagEditor();
                      event.currentTarget.blur();
                    }
                  }}
                />
              ) : (
                <button
                  key={tag}
                  type="button"
                  title={tag}
                  style={favoriteTagPillStyle}
                  onClick={() => {
                    setEditingTagIndex(index);
                    setTagDraft(tag);
                  }}
                >
                  {tag}
                </button>
              ),
            )
          : null}
        {editingTagIndex === tags.length ? (
          <input
            autoFocus
            aria-label="新增 tag"
            value={tagDraft}
            placeholder="tag"
            style={favoriteTagsInlineInputStyle}
            onBlur={commitTagDraft}
            onChange={(event) => {
              setTagDraft(event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.currentTarget.blur();
              }

              if (event.key === 'Escape') {
                closeTagEditor();
                event.currentTarget.blur();
              }
            }}
          />
        ) : (
          <button
            type="button"
            style={favoriteTagAddPillStyle}
            onClick={() => {
              setEditingTagIndex(tags.length);
              setTagDraft('');
            }}
          >
            + tag
          </button>
        )}
      </div>

      <div style={favoriteMetaRowStyle}>
        <button
          type="button"
          style={favoriteTextButtonStyle}
          onClick={() => {
            setIsExpanded((currentValue) => !currentValue);
          }}
        >
          {isExpanded ? '收起全文' : '查看全文'}
        </button>
        <button
          type="button"
          style={favoriteTextButtonStyle}
          onClick={() => onCopy(favorite)}
        >
          {isCopied ? '已复制' : '复制 prompt'}
        </button>
        <button
          type="button"
          aria-label="取消收藏"
          style={favoriteRemoveButtonStyle}
          onClick={() => onRemove(favorite.favoriteId)}
        >
          取消收藏
        </button>
      </div>
    </article>
  );
}
