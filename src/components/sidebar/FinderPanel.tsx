import type { PromptTimelineItem } from '../../services/chatgptPromptTimeline';
import { getPromptStorageId } from '../../services/promptSaveStorage';
import {
  finderPanelStyle,
  finderHeaderStyle,
  finderTitleStyle,
  finderCloseButtonStyle,
  finderSearchWrapStyle,
  finderSearchRowStyle,
  finderSearchBoxStyle,
  finderSearchInputStyle,
  finderFilterButtonStyle,
  finderFilterButtonActiveStyle,
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
} from './styles';
import { renderHighlightedText, getAttachmentBadgeText } from './utils';
import { SearchIcon, CloseIcon, PinIcon } from './icons';

export interface FinderPanelProps {
  searchQuery: string;
  isImportantOnly: boolean;
  finderItems: PromptTimelineItem[];
  activeId: string | null;
  importantPromptIds: Set<string>;
  onSearchChange: (value: string) => void;
  onToggleImportantOnly: () => void;
  onItemClick: (itemId: string) => void;
  onClose: () => void;
}

export function FinderPanel({
  searchQuery,
  isImportantOnly,
  finderItems,
  activeId,
  importantPromptIds,
  onSearchChange,
  onToggleImportantOnly,
  onItemClick,
  onClose,
}: FinderPanelProps) {
  return (
    <div
      id="ai-chat-navigator-prompt-finder"
      style={finderPanelStyle}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <div style={finderHeaderStyle}>
        <div style={finderTitleStyle}>提问列表</div>
        <button
          type="button"
          aria-label="Close prompt list"
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

      <div style={finderSearchWrapStyle}>
        <div style={finderSearchRowStyle}>
          <label style={finderSearchBoxStyle}>
            <SearchIcon />
            <input
              type="search"
              value={searchQuery}
              placeholder="Search prompts or attachments"
              style={finderSearchInputStyle}
              onChange={(event) => {
                onSearchChange(event.currentTarget.value);
              }}
            />
          </label>
          <button
            type="button"
            aria-label={
              isImportantOnly ? 'Show all prompts' : 'Show important only'
            }
            aria-pressed={isImportantOnly}
            title={isImportantOnly ? 'All prompts' : 'Important only'}
            style={{
              ...finderFilterButtonStyle,
              ...(isImportantOnly ? finderFilterButtonActiveStyle : null),
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleImportantOnly();
            }}
          >
            <PinIcon filled={isImportantOnly} />
          </button>
        </div>
      </div>

      <div style={finderListStyle}>
        {finderItems.length === 0 ? (
          <div style={finderEmptyStyle}>
            {isImportantOnly && !searchQuery.trim()
              ? '还没有标记重要 prompt。'
              : '未找到匹配的 prompt。'}
          </div>
        ) : (
          finderItems.map((item) => {
            const isActive = item.id === activeId;
            const isImportant = importantPromptIds.has(
              getPromptStorageId(item),
            );
            const attachmentBadge = getAttachmentBadgeText(item);
            const showTimestamp =
              item.timestampText &&
              (item.timestampSource === 'dom' ||
                item.timestampSource === 'user_send_event');

            return (
              <button
                key={item.id}
                type="button"
                style={{
                  ...finderItemBaseStyle,
                  ...(isImportant ? finderItemImportantStyle : null),
                  ...(isActive ? finderItemActiveStyle : null),
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onItemClick(item.id);
                }}
              >
                <span
                  style={{
                    ...finderItemIndexStyle,
                    ...(isActive ? finderItemIndexActiveStyle : null),
                  }}
                >
                  Q{item.order}
                </span>
                <span>
                  <span
                    style={{
                      ...finderItemTextStyle,
                      ...(isActive ? finderItemTextActiveStyle : null),
                    }}
                  >
                    {renderHighlightedText(item.previewText, searchQuery)}
                  </span>
                  {showTimestamp || attachmentBadge ? (
                    <span style={finderMetaStyle}>
                      {showTimestamp ? (
                        <span>{item.timestampText}</span>
                      ) : null}
                      {attachmentBadge ? (
                        <span
                          style={finderAttachmentBadgeStyle}
                          title={attachmentBadge}
                        >
                          {renderHighlightedText(attachmentBadge, searchQuery)}
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </span>
                <span style={finderItemImportantIconStyle}>
                  {isImportant ? <PinIcon filled /> : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
