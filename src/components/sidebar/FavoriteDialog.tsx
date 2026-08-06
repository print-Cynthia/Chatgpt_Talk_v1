import type { PromptTimelineItem } from '../../services/chatgptPromptTimeline';
import {
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
} from './styles';

export interface FavoriteDialogProps {
  favoriteDraftItem: PromptTimelineItem;
  favoriteDraftTitle: string;
  favoriteDraftTagsInput: string;
  favoriteTagOptions: string[];
  favoriteDraftTagSet: Set<string>;
  isSavingFavorite: boolean;
  favoriteSaveError: string;
  onTitleChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function FavoriteDialog({
  favoriteDraftItem,
  favoriteDraftTitle,
  favoriteDraftTagsInput,
  favoriteTagOptions,
  favoriteDraftTagSet,
  isSavingFavorite,
  favoriteSaveError,
  onTitleChange,
  onTagsChange,
  onToggleTag,
  onConfirm,
  onClose,
}: FavoriteDialogProps) {
  return (
    <div
      style={favoriteDialogBackdropStyle}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="收藏 prompt"
        style={favoriteDialogStyle}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <div style={favoriteDialogHeaderStyle}>收藏 prompt</div>
        <div style={favoriteDialogBodyStyle}>
          <label style={favoriteDialogRowStyle}>
            <span style={favoriteDialogLabelStyle}>
              标题<span style={favoriteDialogRequiredStyle}>*</span>
            </span>
            <input
              autoFocus
              value={favoriteDraftTitle}
              style={favoriteDialogInputStyle}
              onChange={(event) => {
                onTitleChange(event.currentTarget.value);
              }}
            />
          </label>

          <div style={favoriteDialogPreviewStyle}>
            {favoriteDraftItem.previewText}
          </div>

          <label style={favoriteDialogRowStyle}>
            <span style={favoriteDialogLabelStyle}>Tags</span>
            <input
              value={favoriteDraftTagsInput}
              placeholder="添加 tags，用逗号分隔"
              style={favoriteDialogInputStyle}
              onChange={(event) => {
                onTagsChange(event.currentTarget.value);
              }}
            />
          </label>

          {favoriteTagOptions.length > 0 ? (
            <div style={favoriteDialogTagOptionsStyle}>
              {favoriteTagOptions.map((tag) => {
                const isSelected = favoriteDraftTagSet.has(tag);

                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={isSelected}
                    style={{
                      ...favoriteDialogTagButtonStyle,
                      ...(isSelected
                        ? favoriteDialogTagButtonActiveStyle
                        : null),
                    }}
                    onClick={() => {
                      onToggleTag(tag);
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          ) : null}
          {favoriteSaveError ? (
            <div
              style={{
                margin: '-4px 0 0 106px',
                color: '#dc2626',
                fontSize: '12px',
                lineHeight: 1.4,
              }}
            >
              {favoriteSaveError}
            </div>
          ) : null}
        </div>
        <div style={favoriteDialogFooterStyle}>
          <button
            type="button"
            style={favoriteDialogSecondaryButtonStyle}
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            disabled={!favoriteDraftTitle.trim() || isSavingFavorite}
            style={{
              ...favoriteDialogPrimaryButtonStyle,
              ...(!favoriteDraftTitle.trim() || isSavingFavorite
                ? { opacity: 0.55, cursor: 'default' }
                : null),
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onConfirm();
            }}
          >
            {isSavingFavorite ? '保存中' : '确定'}
          </button>
        </div>
      </div>
    </div>
  );
}
