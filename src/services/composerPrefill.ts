// Prefill the ChatGPT composer with the selected text for "追问" follow-up.
//
// ChatGPT's input may be a <textarea>, a contenteditable ProseMirror field, or
// a generic [role="textbox"] element. We use the existing composer selectors
// and dispatch input events so React / ProseMirror notice the change.

import { querySelectorAllFallback } from './chatgptSelectors';

export function prefillComposer(text: string): boolean {
  const candidates = querySelectorAllFallback(document, 'composer');
  const el = candidates[0];

  if (!el) {
    return false;
  }

  const isFormField =
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'INPUT' ||
    el.getAttribute('role') === 'textbox';

  try {
    if (isFormField) {
      const field = el as HTMLTextAreaElement | HTMLInputElement;
      field.value = text;
      field.focus();
      field.setSelectionRange(text.length, text.length);
      field.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } else {
      // Prefer ProseMirror / contenteditable insertion.
      el.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);

      const inserted = document.execCommand('insertText', false, text);
      if (!inserted) {
        el.textContent = text;
      }
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }

    return true;
  } catch {
    return false;
  }
}
