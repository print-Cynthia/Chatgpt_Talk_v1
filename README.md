# AI Chat Navigator

AI Chat Navigator is a lightweight Chrome extension that makes ChatGPT prompt navigation cleaner and easier.

## Version 0.7.29

Features:
- Right-side floating Prompt Timeline for long ChatGPT conversations
- Hover preview with timestamp, prompt text, and attachment info
- Click-to-jump prompt navigation (short- and long-distance)
- Active dot follows page scroll
- Prompt Finder: browse, search prompts and attachment names
- Important Marker: mark key prompts in the current conversation
- Favorites: save reusable prompts globally (title, full text, tags)
- AI Response Highlight: select text in an AI reply → floating toolbar (5 colors + note) → highlight; per-conversation Highlights panel with jump-back, recolor, notes, and tags
- Local-only: resilient `chrome.storage.local` access for saved markers/favorites/highlights; no cloud sync, no external upload

## Why it exists
This extension only reads the current ChatGPT page and extracts user prompt text. It does not save full chat content or upload any data.

## Permissions
- Required host permission: `https://chatgpt.com/*`
- Uses the `storage` permission, but only `chrome.storage.local` — to save prompts you explicitly mark as Important or add to Favorites, on your own device. Nothing is uploaded or synced to the cloud.
- No `tabs`, `cookies`, `history`, `downloads`, `identity`, or external network permissions

## Notes
- Attachment names are used only for preview summary and not included in prompt text
- Original ChatGPT short timeline separators remain hidden
- Browser scrollbar behavior is preserved
