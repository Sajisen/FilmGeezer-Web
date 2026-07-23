import { useEffect } from "react";

interface UseMobileDrawerGestureOptions {
  enabled: boolean;
  onOpen: () => void;
}

const EDGE_ACTIVATION_WIDTH = 56;
const OPEN_DISTANCE = 48;
const DIRECTION_RATIO = 1.2;
const MAX_VERTICAL_DRIFT = 48;

function isInsideHorizontalScroller(target: EventTarget | null) {
  let element = target instanceof HTMLElement ? target : null;

  while (element && element !== document.body) {
    const style = window.getComputedStyle(element);
    const canScrollHorizontally =
      element.scrollWidth > element.clientWidth + 2 &&
      (style.overflowX === "auto" || style.overflowX === "scroll");

    if (canScrollHorizontally) {
      return true;
    }

    element = element.parentElement;
  }

  return false;
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        "input, textarea, select, button, a, [role='button'], [contenteditable='true']",
      ),
    )
  );
}

export function useMobileDrawerGesture({
  enabled,
  onOpen,
}: UseMobileDrawerGestureOptions) {
  useEffect(() => {
    const supportsGesture = window.matchMedia(
      "(max-width: 1023px) and (pointer: coarse)",
    ).matches;

    if (!enabled || !supportsGesture) {
      return;
    }

    let isTracking = false;
    let startX = 0;
    let startY = 0;
    let latestX = 0;
    let latestY = 0;

    function resetGesture() {
      isTracking = false;
      startX = 0;
      startY = 0;
      latestX = 0;
      latestY = 0;
    }

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      const startsInsideActivationZone =
        touch.clientX >= window.innerWidth - EDGE_ACTIVATION_WIDTH;

      if (
        !startsInsideActivationZone ||
        isInteractiveTarget(event.target) ||
        isInsideHorizontalScroller(event.target)
      ) {
        resetGesture();
        return;
      }

      isTracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
      latestX = touch.clientX;
      latestY = touch.clientY;
    }

    function handleTouchMove(event: TouchEvent) {
      if (!isTracking || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      latestX = touch.clientX;
      latestY = touch.clientY;

      const horizontalDistance = startX - latestX;
      const verticalDistance = Math.abs(latestY - startY);

      if (
        verticalDistance > MAX_VERTICAL_DRIFT &&
        verticalDistance > Math.abs(horizontalDistance)
      ) {
        resetGesture();
      }
    }

    function handleTouchEnd() {
      if (!isTracking) {
        return;
      }

      const horizontalDistance = startX - latestX;
      const verticalDistance = Math.abs(latestY - startY);

      if (
        horizontalDistance >= OPEN_DISTANCE &&
        horizontalDistance >= verticalDistance * DIRECTION_RATIO
      ) {
        onOpen();
      }

      resetGesture();
    }

    window.addEventListener("touchstart", handleTouchStart, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchmove", handleTouchMove, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchend", handleTouchEnd, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchcancel", resetGesture, {
      passive: true,
      capture: true,
    });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart, true);
      window.removeEventListener("touchmove", handleTouchMove, true);
      window.removeEventListener("touchend", handleTouchEnd, true);
      window.removeEventListener("touchcancel", resetGesture, true);
    };
  }, [enabled, onOpen]);
}
