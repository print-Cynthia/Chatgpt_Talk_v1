// Bridge between the content-script module scope (where the real DOM
// selection listeners live) and the React Sidebar component.
//
// Why a bridge: attaching `selectionchange` / `mouseup` listeners inside a
// React component's useEffect proved unreliable in a Chrome MV3 content
// script — the events sometimes never reach the isolated-world listener
// (Chrome does not always dispatch `selectionchange` into the content-script
// world). The robust pattern is to attach the listeners at the content-script
// module scope (which runs synchronously as the script loads, before React
// even mounts) and notify the React tree via a plain CustomEvent on
// `document`. React only has to listen for that one event.

export const SELECTION_PING_EVENT = 'ai-chat-navigator:selection-ping';
