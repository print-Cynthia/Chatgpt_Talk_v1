import type { PromptFavorite } from '../../services/promptSaveStorage';
import {
  favoritesToggleBaseStyle,
  favoritesToggleActiveStyle,
  favoritesPanelBaseStyle,
  finderHeaderStyle,
  finderTitleStyle,
  finderCloseButtonStyle,
  favoritesFilterBarStyle,
  favoritesFilterChipStyle,
  favoritesFilterChipActiveStyle,
  favoritesListStyle,
  finderEmptyStyle,
} from './styles';
import { StarIcon, CloseIcon } from './icons';
import { FavoriteItem } from './FavoriteItem';

export interface FavoritesAnchor {
  left: number;
  top: number;
}

export interface FavoritesPanelProps {
  isOpen: boolean;
  favorites: PromptFavorite[];
  visibleFavorites: PromptFavorite[];
  favoriteTagOptions: string[];
  selectedFavoriteTag: string | null;
  copiedFavoriteId: string | null;
  favoritesAnchor: FavoritesAnchor;
  onToggleOpen: () => void;
  onClose: () => void;
  onSelectTag: (tag: string | null) => void;
  onCopy: (favorite: PromptFavorite) => void;
  onRemove: (favoriteId: string) => void;
  onSave: (favoriteId: string, title: string, tags: string[]) => void;
}

export function FavoritesPanel({
  isOpen,
  favorites,
  visibleFavorites,
  favoriteTagOptions,
  selectedFavoriteTag,
  copiedFavoriteId,
  favoritesAnchor,
  onToggleOpen,
  onClose,
  onSelectTag,
  onCopy,
  onRemove,
  onSave,
}: FavoritesPanelProps) {
  return (
    <>
      <button
        type="button"
        aria-label="打开 Prompt 收藏夹"
        aria-expanded={isOpen}
        title="Prompt 收藏夹"
        style={{
          ...favoritesToggleBaseStyle,
          ...(isOpen ? favoritesToggleActiveStyle : null),
          left: `${favoritesAnchor.left}px`,
          top: `${favoritesAnchor.top}px`,
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleOpen();
        }}
      >
        <StarIcon filled={isOpen} />
      </button>

      {isOpen ? (
        <section
          id="ai-chat-navigator-prompt-favorites"
          style={{
            ...favoritesPanelBaseStyle,
            left: `${Math.max(
              12,
              Math.min(favoritesAnchor.left, window.innerWidth - 356),
            )}px`,
            bottom: `${Math.max(
              62,
              window.innerHeight - favoritesAnchor.top + 10,
            )}px`,
          }}
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <div style={finderHeaderStyle}>
            <div style={finderTitleStyle}>收藏夹</div>
            <button
              type="button"
              aria-label="关闭收藏夹"
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

          {favoriteTagOptions.length > 0 ? (
            <div style={favoritesFilterBarStyle}>
              <button
                type="button"
                aria-pressed={!selectedFavoriteTag}
                style={{
                  ...favoritesFilterChipStyle,
                  ...(!selectedFavoriteTag
                    ? favoritesFilterChipActiveStyle
                    : null),
                }}
                onClick={() => {
                  onSelectTag(null);
                }}
              >
                全部
              </button>
              {favoriteTagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  title={tag}
                  aria-pressed={selectedFavoriteTag === tag}
                  style={{
                    ...favoritesFilterChipStyle,
                    ...(selectedFavoriteTag === tag
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
            {favorites.length === 0 ? (
              <div style={finderEmptyStyle}>
                还没有收藏 prompt。可在右侧预览卡中点击收藏图标。
              </div>
            ) : visibleFavorites.length === 0 ? (
              <div style={finderEmptyStyle}>
                当前 tag 下还没有 prompt。
              </div>
            ) : (
              visibleFavorites.map((favorite) => (
                <FavoriteItem
                  key={favorite.favoriteId}
                  favorite={favorite}
                  isCopied={copiedFavoriteId === favorite.favoriteId}
                  onCopy={onCopy}
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
