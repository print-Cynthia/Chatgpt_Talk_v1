import type { MouseEvent, RefObject } from 'react';
import type { PromptTimelineItem } from '../../services/chatgptPromptTimeline';
import { getPromptStorageId } from '../../services/promptSaveStorage';
import {
  railTrackStyle,
  nodeListStyle,
  nodeRowStyle,
  emptyDotStyle,
  getStripeStyle,
  getNodeButtonStyle,
  importantMarkerStyle,
  finderToggleStyle,
  highlightsToggleStyle,
} from './styles';
import { ListIcon, HighlightIcon } from './icons';

const driftWarningStyle: React.CSSProperties = {
  position: 'fixed',
  right: '22px',
  bottom: '10px',
  maxWidth: '210px',
  padding: '6px 10px',
  borderRadius: '8px',
  background: 'rgba(250, 204, 21, 0.96)',
  color: '#422006',
  fontSize: '11px',
  lineHeight: '1.45',
  fontWeight: 600,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
  pointerEvents: 'none',
  zIndex: 2147483647,
};

export interface TimelineRailProps {
  items: PromptTimelineItem[];
  activeId: string | null;
  hoveredId: string | null;
  hoveredIndex: number;
  importantPromptIds: Set<string>;
  driftDetected: boolean;
  nodeListRef: RefObject<HTMLOListElement | null>;
  isFinderOpen: boolean;
  isHighlightsOpen: boolean;
  onRailMouseMove: (event: MouseEvent<HTMLOListElement>) => void;
  onRailMouseLeave: () => void;
  onNodeClick: (itemId: string) => void;
  onNodeMouseEnter: (
    item: PromptTimelineItem,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
  onToggleFinder: () => void;
  onToggleHighlights: () => void;
}

export function TimelineRail({
  items,
  activeId,
  hoveredId,
  hoveredIndex,
  importantPromptIds,
  driftDetected,
  nodeListRef,
  isFinderOpen,
  isHighlightsOpen,
  onRailMouseMove,
  onRailMouseLeave,
  onNodeClick,
  onNodeMouseEnter,
  onToggleFinder,
  onToggleHighlights,
}: TimelineRailProps) {
  return (
    <>
      {driftDetected ? (
        <div
          title="当前 ChatGPT 页面结构可能已变化，时间轴可能为空或失效。如功能异常，可能是 ChatGPT 改版导致，请等待更新。"
          style={driftWarningStyle}
        >
          ⚠ 当前 ChatGPT 版本可能不兼容，时间轴可能为空
        </div>
      ) : null}

      <div style={railTrackStyle}>
        {items.length === 0 ? (
          <div style={emptyDotStyle} />
        ) : (
          <ol
            ref={nodeListRef}
            className="ai-chat-navigator-node-list"
            style={nodeListStyle}
            onMouseMove={onRailMouseMove}
            onMouseLeave={onRailMouseLeave}
          >
            {items.map((item, index) => {
              const isActive = item.id === activeId;
              const isHovered = item.id === hoveredId;
              const isImportant = importantPromptIds.has(
                getPromptStorageId(item),
              );
              const distanceFromHovered =
                hoveredIndex === -1 ? null : Math.abs(index - hoveredIndex);

              return (
                <li key={item.id} style={nodeRowStyle}>
                  <button
                    type="button"
                    className="ai-chat-navigator-node-button"
                    style={getNodeButtonStyle()}
                    aria-label={`Preview or jump to prompt ${item.order}`}
                    onMouseEnter={(event) => {
                      onNodeMouseEnter(item, event);
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onNodeClick(item.id);
                    }}
                  >
                    <span
                      className="ai-chat-navigator-stripe"
                      style={getStripeStyle(
                        isActive,
                        isHovered,
                        distanceFromHovered,
                      )}
                    />
                    {isImportant ? (
                      <span style={importantMarkerStyle} />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <button
        type="button"
        aria-label="打开 Prompt 列表"
        aria-expanded={isFinderOpen}
        style={finderToggleStyle}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleFinder();
        }}
      >
        <ListIcon />
      </button>

      <button
        type="button"
        aria-label="打开 AI 回复高亮"
        aria-expanded={isHighlightsOpen}
        title="AI 回复高亮"
        style={{
          ...highlightsToggleStyle,
          ...(isHighlightsOpen
            ? {
                borderColor: '#f5b51b',
                background: '#fff8e6',
                color: '#d98b00',
              }
            : null),
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleHighlights();
        }}
      >
        <HighlightIcon filled={isHighlightsOpen} />
      </button>
    </>
  );
}
