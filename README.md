# AI Chat Navigator

AI Chat Navigator is a lightweight Chrome extension that makes ChatGPT prompt navigation cleaner and easier.

## Version 1.0.1

Hotfix before Edge Add-ons submission: removed the internal "UI v66" development version badge that was still visible in the published UI.

- Removed the version label from the timeline rail and the preview card.
- Version bump: package `1.0.1`, UI label `UI v67`.
- Rebuilt and repackaged `AI-Chat-Navigator-v1.0.1.zip` for store upload.

## Version 1.0.0

First release prepared for Microsoft Edge Add-ons publishing (Public, free). No new user-facing features beyond v0.7.42 - this is the store-readiness release:

- Version bump: package `1.0.0`, UI label `UI v66`.
- Manifest `description` shortened to <=132 characters to meet store upload validation: "Navigate, search, and organize ChatGPT chats. A local-only sidebar with timeline, favorites, markers, and AI highlights."
- Removed the default WXT placeholder logo (`public/wxt.svg`) from the bundle.
- Added `privacy.html` (repo root) - public privacy-policy page for the store disclosure (local-only storage, no uploads, permission rationale). Host via GitHub Pages.
- Packaged `AI-Chat-Navigator-v1.0.0.zip` (built `chrome-mv3` output, manifest at zip root) for store upload.
- Build convention unchanged: `npm run build:v1` -> `chrome-mv3_v1` (validation), then synced to `chrome-mv3` (load dir).

## Version 0.7.42

Long-distance highlight jump - precision fix (the v0.7.41 'lands a bit too low, have to click once more' gap):

- **Root cause**: `findHighlightTarget` falls back to the WHOLE turn section when the exact wrapped span (`data-highlight-id`) is not yet in the DOM. ChatGPT applies that span asynchronously after the turn mounts, so the early polls only see the turn section. The previous re-center loop did `if (retryTarget2) settled = true`, treating the whole-turn fallback as a hit - it centered the entire reply and stopped, leaving the real highlight a bit below the viewport center (user had to scroll/click again).
- **Fix**: the re-center loop now checks for the EXACT span (`getAttribute('data-highlight-id') === highlight.id`). It only settles and centers on the span when it is truly present. While the span is absent, it keeps the view centered on the turn (no drift) and keeps polling; the moment the span appears it centers on it. Added one longer tail delay (1400ms) so the async span has time to apply, WITHOUT modifying the shared `JUMP_CORRECTION_DELAYS` (still used by the timeline path).
- Note: an earlier v0.7.42 (render-aware adaptive-interval scheduler) was built and ROLLED BACK to v0.7.41 after a real-environment test showed the first jump still landed off the highlight. This v0.7.42 is a different, low-risk precision fix on top of the stable v0.7.41 speed tuning.

## Version 0.7.41

Long-distance highlight jump - speedup only (timeline code untouched):

- Re-center tail cut: JUMP_CORRECTION_DELAYS shortened from [60,180,360,700,1100,1600] (~4.1s) to [50,160,380,800] (~1.4s), and the re-center now STOPS as soon as the wrapped highlight span is located (was a fixed 6-pass sweep). Removes the lingering drift at the end.
- Faster load phase: exponential approach factor 0.6 -> 0.72 and the fixed poll tightened 80ms -> 55ms, so a far-away turn reaches the viewport in fewer, quicker steps. Per-step lower bound 500 -> 450px to reduce overshoot near the target.
- Relies on the v0.7.39 viewport-center-turn comparator + the v0.7.40 timeline-style instant center. No change to how the timeline jump works.

## Version 0.7.40

Long-distance highlight jump - ported the timeline jump's design (no timeline code touched):

- **Speed**: the load phase now uses an EXPONENTIAL approach instead of a fixed one-window step. Each tick jumps ~60% of the estimated pixel gap to the target turn (capped at 60k px), steered by the viewport-center turn number. A far-away turn loads in ~log time instead of a slow linear sweep. Poll interval 130ms -> 80ms.
- **Precision (fixes "last bit I had to scroll by hand")**: the loop success path now mirrors the timeline node-click + immediate-jump paths - it centers the target instantly, then re-centers on `JUMP_CORRECTION_DELAYS` (60/180/360/700/1100/1600ms). This lands exactly on the wrapped highlight span (`data-highlight-id`) once ChatGPT finishes rendering/applying it, instead of only centering the whole (tall) turn section. So the highlight itself - not just its reply - ends up centered.
- Keeps the v0.7.39 viewport-center-turn comparator, the direct `conversation-turn-N` fallback, and real scrollTop-based stall detection. `MAX_TICKS` stays 140.

## Version 0.7.39

Long-distance highlight jump fix (the v0.7.38 regression where the jump reported `jump-driver-dead` with `rendered 11-286` but `turnNumber 208` still un-located):

- **Root cause**: v0.7.38 steered by the GLOBAL min/max turn bounds. When the target turn number fell inside the loaded range (e.g. 208 in [11,286]) it assumed the turn was mounted and only jiggled +/-50px in place, so ChatGPT never actually rendered `conversation-turn-208` (the global range includes always-mounted head/tail buffers and gaps - a false "in range"). After 10 stalled ticks it bailed as `driver dead`.
- **Fix**: steer by the turn number nearest the VIEWPORT CENTER (ground truth, read from the rendered element closest to the scroller center) instead of the global bounds. Each tick scrolls one window toward the target (DOWN if the visible turn number is below the target, UP if above); when within ~3 turns it switches to a fine step. This walks the rendered window monotonically onto the target, where `findHighlightTarget` (or a direct `conversation-turn-N` fallback) catches it and centers it.
- **Stall detection fixed**: now bails ONLY when scrollTop truly stops moving (real dead driver), not when the bounds string is unchanged.
- Added a direct `conversation-turn-N` element fallback (centers the turn even if the inner assistant-lookup misses) and `viewportCenterTurn` to the `jump-driver-dead` / `jump-failed` diagnostics. `MAX_TICKS` 90 -> 140.

## Version 0.7.38

Reverted the v0.7.37 binary-search jump (it regressed: the turn-number vs scrollTop mapping is non-linear, so the midpoint branch kept scrolling the wrong way and the dead-driver guard bailed out early). Replaced with a directed window-scroll jump:
- **Fix**: when the target turn number is known, steer by it every tick - scroll one viewport UP if the target is above the rendered window, DOWN if below - so the rendered window monotonically walks toward the target and `findHighlightTarget` catches it the moment it enters the DOM, then centers it. First tick jumps straight to the turn-ratio estimate for a near-one-click feel.
- **Scroller selection hardened**: `getConversationScroller` now scores every scrollable ancestor by how many conversation turns it contains and picks the highest-scoring one, instead of the first scrollable ancestor of the first turn. This avoids climbing onto a non-driving wrapper (the v0.7.35 "scrollerClientHeight 467228" trap) and matches what makes the timeline jump reliable.
- Tick interval 170ms -> 130ms, `MAX_TICKS` 60 -> 90. Keeps the `targetN === null` sweep fallback, dead-driver detection (now also tries window.scrollTo), and turnNumber auto-repair for old highlights.

## Version 0.7.36

Fixes (AI Response Highlight long-distance jump — confirmed `turnExists: false` from `find-strategy2-miss` diag, i.e. the target turn never enters the DOM):
- **Root cause of the remaining failure**: the sweep loop's "within rendered window but not found" branch steered by `(min+max)/2`, which guessed the WRONG direction when the rendered turn set was sparse and the user started at the bottom — so it scrolled into a no-op (already at the edge) and never moved toward turn 208. The new `jump-failed` showed `scrollerScrollTop: 463806` (bottom) while `loadedMin: 11` (top window), proving the scroll wasn't loading the target.
- **Fix**: when the target turn number is known, STEER BY ITS ESTIMATED POSITION — estimate total turns from the rendered max, map `turnNumber -> scroll fraction`, and drive `scrollTop` there (clamped so it never overshoots). This is exactly how the timeline jump moves the view, so it is proven to make ChatGPT's virtual list re-render the window at that position.
- **Dead-driver detection**: if we keep scrolling but the rendered turn window (`min-max`) never changes for 10 ticks, the element we scroll is not the one ChatGPT's virtual list listens to — fall back to `window.scrollTo` once, then emit `jump-driver-dead` (with `rendered` window + `scrollerTag`) so the real scroll driver can be identified next time.
- Bumped `MAX_TICKS` 90 -> 120 and made the per-tick scroll step several viewports (was capped too small to traverse a 460k-px conversation within the tick budget); `find-strategy2-miss` diagnostic throttled to ~1/2s to avoid console flood.

## Version 0.7.35

Fixes (AI Response Highlight long-distance jump — ROOT CAUSE from `jump-failed` diag `scrollerClientHeight: 467228`):
- **The real bug**: `getConversationScroller`'s `isScrollable` used OR (overflowY matches OR has 2px overflow), so it climbed onto a 460k-px outer wrapper that is NOT the viewport scroller — scrolling it did nothing and the target turn never lazily loaded. It now uses AND (overflowY matches AND real overflow), exactly mirroring the timeline's proven `getScrollContainerForElement` that already works correctly
- Added a WINDOW-size safety cap (`min(ch * 0.6, window.innerHeight * 2)`) so even a mis-detected giant wrapper cannot attempt to scroll hundreds of thousands of px per step
- Added `find-strategy2-miss` diagnostic (turnExists / domTurnCount) so a future failure can distinguish "turn not loaded yet" from "`conversation-turn-N` selector mismatch"

## Version 0.7.34

Fixes (AI Response Highlight — legacy-highlight jump, the `targetN: null` case):
- **Auto-repair old highlights**: any highlight created before v0.7.33 has no stable `turnNumber`. Now, the moment we locate it via text/UUID match (either at click if already in DOM, or during the sweep loop), we read its `conversation-turn-N` from the live DOM and persist it back to storage. Subsequent jumps use the reliable anchor instead of re-matching — so the first jump may still sweep, but every later jump is instant and robust
- Text matching is now whitespace/zero-width tolerant (`normalizeForMatch`): collapses all whitespace and strips zero-width + soft-hyphen chars before `includes()` comparisons, fixing the rich-text formatting mismatch ("格式被压扁了") that broke `findAssistantRootByText` and the fuzzy fallback
- `updateHighlight` storage API extended to accept `turnNumber` patches

## Version 0.7.33

Fixes (AI Response Highlight long-distance jump):
- Capture the stable `conversation-turn-N` number as a reliable jump anchor at highlight creation (the previous UUID `data-turn-id` could change on re-render/refresh, breaking the match)
- `findHighlightTarget` / `resolveTargetTurnNumber` now prefer the stored turn number, matching the exact `[data-testid="conversation-turn-N"]` node regardless of UUID drift or formatted-text mismatches
- `getConversationScroller` now climbs from the first rendered turn's parent upward (mirroring the timeline's proven `getScrollContainerForElement` logic) so the scroll actually hits ChatGPT's virtual-list container and triggers lazy loading — the previous "most [data-turn] nodes" heuristic could pick a non-scrollable wrapper and silently fail
- Added `jump-failed` diagnostic log (turn number, loaded turn bounds, scroller state) for faster triage if a jump still fails

## Version 0.7.32

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
