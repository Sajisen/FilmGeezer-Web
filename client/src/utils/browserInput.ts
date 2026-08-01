const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

export function isTextEntryElement(
  element: Element | null,
): element is HTMLElement {
  if (!element) {
    return false;
  }

  if (
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return true;
  }

  if (element instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has(element.type);
  }

  return element instanceof HTMLElement && element.isContentEditable;
}

export function dismissActiveBrowserInput(): void {
  const activeElement = document.activeElement;

  if (isTextEntryElement(activeElement)) {
    activeElement.blur();
  }
}
