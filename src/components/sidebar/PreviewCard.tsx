import type { PromptTimelineItem } from '../../services/chatgptPromptTimeline';
import {
  previewCardBaseStyle,
  previewTextStyle,
  previewTimestampStyle,
  attachmentRowStyle,
  attachmentChipStyle,
  previewActionsStyle,
  getPreviewActionStyle,
} from './styles';
import {
  getPreviewAttachmentParts,
} from './utils';
import { AttachmentIcon, PinIcon, StarIcon } from './icons';

export interface PreviewCardProps {
  hoveredItem: PromptTimelineItem;
  previewTop: number;
  isHoveredImportant: boolean;
  hoveredFavoriteId: string | null;
  onToggleImportant: (item: PromptTimelineItem) => void;
  onToggleFavorite: (item: PromptTimelineItem) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function PreviewCard({
  hoveredItem,
  previewTop,
  isHoveredImportant,
  hoveredFavoriteId,
  onToggleImportant,
  onToggleFavorite,
  onMouseEnter,
  onMouseLeave,
}: PreviewCardProps) {
  return (
    <div
      id="ai-chat-navigator-preview-card"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(event) => {
        event.stopPropagation();
      }}
      style={{
        ...previewCardBaseStyle,
        top: `${previewTop}px`,
        transform: 'translateY(-50%)',
      }}
    >
      {hoveredItem.timestampText &&
      (hoveredItem.timestampSource === 'dom' ||
        hoveredItem.timestampSource === 'user_send_event') ? (
        <div style={previewTimestampStyle}>{hoveredItem.timestampText}</div>
      ) : null}
      <div style={previewTextStyle}>{hoveredItem.previewText}</div>

      {(() => {
        const attachmentParts = getPreviewAttachmentParts(hoveredItem);

        if (attachmentParts.names.length === 0) {
          return null;
        }

        return (
          <div style={attachmentRowStyle}>
            <AttachmentIcon />
            {attachmentParts.names.map((name) => (
              <span key={name} style={attachmentChipStyle} title={name}>
                {name}
              </span>
            ))}
            {attachmentParts.overflowLabel ? (
              <span style={attachmentChipStyle}>
                {attachmentParts.overflowLabel}
              </span>
            ) : null}
          </div>
        );
      })()}

      <div style={previewActionsStyle}>
        <button
          type="button"
          aria-label={
            isHoveredImportant ? '取消重要标记' : '标记为重要 prompt'
          }
          aria-pressed={isHoveredImportant}
          style={getPreviewActionStyle(isHoveredImportant, 'important')}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleImportant(hoveredItem);
          }}
        >
          <PinIcon filled={isHoveredImportant} />
        </button>
        <button
          type="button"
          aria-label={hoveredFavoriteId ? '取消收藏 prompt' : '收藏 prompt'}
          aria-pressed={Boolean(hoveredFavoriteId)}
          style={getPreviewActionStyle(Boolean(hoveredFavoriteId), 'favorite')}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleFavorite(hoveredItem);
          }}
        >
          <StarIcon filled={Boolean(hoveredFavoriteId)} />
        </button>
      </div>
    </div>
  );
}
