import {
  useEffect,
  useRef,
  type RefObject,
} from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

let bodyScrollLockCount = 0;
let originalBodyOverflow = "";
let originalBodyPaddingRight = "";

const modalStack: symbol[] = [];

function isTopmostModal(modalId: symbol): boolean {
  return modalStack[modalStack.length - 1] === modalId;
}

function addModalToStack(modalId: symbol): void {
  modalStack.push(modalId);
}

function removeModalFromStack(modalId: symbol): void {
  const index = modalStack.lastIndexOf(modalId);

  if (index >= 0) {
    modalStack.splice(index, 1);
  }
}

function acquireBodyScrollLock(): () => void {
  if (bodyScrollLockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalBodyPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      const currentPaddingRight =
        Number.parseFloat(
          window.getComputedStyle(document.body).paddingRight,
        ) || 0;

      document.body.style.paddingRight =
        `${currentPaddingRight + scrollbarWidth}px`;
    }
  }

  bodyScrollLockCount += 1;

  return () => {
    bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);

    if (bodyScrollLockCount !== 0) {
      return;
    }

    document.body.style.overflow = originalBodyOverflow;
    document.body.style.paddingRight = originalBodyPaddingRight;
  };
}

function isActuallyFocusable(element: HTMLElement): boolean {
  if (
    element.hidden ||
    element.getAttribute("aria-hidden") === "true" ||
    element.closest("[hidden], [inert], [aria-hidden='true']")
  ) {
    return false;
  }

  const styles = window.getComputedStyle(element);

  if (
    styles.display === "none" ||
    styles.visibility === "hidden"
  ) {
    return false;
  }

  return element.getClientRects().length > 0;
}

export function getDialogFocusableElements(
  container: HTMLElement,
): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(isActuallyFocusable);
}

interface UseModalAccessibilityOptions {
  isOpen: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  initialFocusSelector?: string;
  onEscape?: () => void;
  escapeEnabled?: boolean;
  lockBodyScroll?: boolean;
  restoreFocus?: boolean;
}

export function useModalAccessibility({
  isOpen,
  dialogRef,
  initialFocusRef,
  initialFocusSelector,
  onEscape,
  escapeEnabled = true,
  lockBodyScroll = true,
  restoreFocus = true,
}: UseModalAccessibilityOptions): void {
  const modalIdRef = useRef(Symbol("filmgeezer-modal"));
  const onEscapeRef = useRef(onEscape);
  const escapeEnabledRef = useRef(escapeEnabled);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    escapeEnabledRef.current = escapeEnabled;
  }, [escapeEnabled]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const modalId = modalIdRef.current;
    const previouslyFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    addModalToStack(modalId);

    const releaseBodyScrollLock =
      lockBodyScroll ? acquireBodyScrollLock() : null;

    let temporarilyAddedDialogTabIndex = false;

    const dialogAtOpen = dialogRef.current;

    if (dialogAtOpen && !dialogAtOpen.hasAttribute("tabindex")) {
      dialogAtOpen.tabIndex = -1;
      temporarilyAddedDialogTabIndex = true;
    }

    function focusDialogFallback(dialog: HTMLElement) {
      const firstFocusable = getDialogFocusableElements(dialog)[0];

      if (firstFocusable) {
        firstFocusable.focus({
          preventScroll: true,
        });
        return;
      }

      dialog.focus({
        preventScroll: true,
      });
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;

      if (!dialog || !isTopmostModal(modalId)) {
        return;
      }

      const requestedInitialFocus =
        initialFocusRef?.current ??
        (initialFocusSelector
          ? dialog.querySelector<HTMLElement>(initialFocusSelector)
          : null);

      if (
        requestedInitialFocus &&
        dialog.contains(requestedInitialFocus) &&
        isActuallyFocusable(requestedInitialFocus)
      ) {
        requestedInitialFocus.focus({
          preventScroll: true,
        });
        return;
      }

      focusDialogFallback(dialog);
    });

    function handleFocusIn(event: FocusEvent) {
      if (!isTopmostModal(modalId)) {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const target = event.target;

      if (target instanceof Node && dialog.contains(target)) {
        return;
      }

      focusDialogFallback(dialog);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isTopmostModal(modalId)) {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      if (event.key === "Escape") {
        if (
          escapeEnabledRef.current &&
          onEscapeRef.current
        ) {
          event.preventDefault();
          event.stopPropagation();
          onEscapeRef.current();
        }

        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements =
        getDialogFocusableElements(dialog);

      const firstElement = focusableElements[0];
      const lastElement =
        focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        dialog.focus({
          preventScroll: true,
        });
        return;
      }

      const activeElement = document.activeElement;

      if (
        !dialog.contains(activeElement) ||
        !(activeElement instanceof HTMLElement) ||
        !focusableElements.includes(activeElement)
      ) {
        event.preventDefault();

        if (event.shiftKey) {
          lastElement.focus();
        } else {
          firstElement.focus();
        }

        return;
      }

      if (
        event.shiftKey &&
        document.activeElement === firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("keydown", handleKeyDown, true);

      removeModalFromStack(modalId);
      releaseBodyScrollLock?.();

      if (
        temporarilyAddedDialogTabIndex &&
        dialogAtOpen?.getAttribute("tabindex") === "-1"
      ) {
        dialogAtOpen.removeAttribute("tabindex");
      }

      if (
        restoreFocus &&
        previouslyFocusedElement?.isConnected &&
        !previouslyFocusedElement.closest("[inert], [aria-hidden='true']")
      ) {
        previouslyFocusedElement.focus({
          preventScroll: true,
        });
      }
    };
  }, [
    dialogRef,
    initialFocusRef,
    initialFocusSelector,
    isOpen,
    lockBodyScroll,
    restoreFocus,
  ]);
}
