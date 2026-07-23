import { useEffect } from "react";

interface UseMobileDrawerGestureOptions {
  enabled: boolean;
  onOpen: () => void;
}

const EDGE_ACTIVATION_WIDTH = 28;
const OPEN_DISTANCE = 72;
const DIRECTION_RATIO = 1.35;

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

export function useMobileDrawerGesture({
  enabled,
  onOpen,
}: UseMobileDrawerGestureOptions) {
  useEffect(() => {
    if (!enabled || !window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    let isTracking = false;
    let startX = 0;
    let startY = 0;

    function resetGesture() {
      isTracking = false;
      startX = 0;
      startY = 0;
    }

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      const startsAtRightEdge =
        touch.clientX >= window.innerWidth - EDGE_ACTIVATION_WIDTH;

      if (
        !startsAtRightEdge ||
        isInsideHorizontalScroller(event.target) ||
        (event.target instanceof HTMLElement &&
          event.target.closest("input, textarea, select, button, a"))
      ) {
        resetGesture();
        return;
      }

      isTracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
    }

    function handleTouchMove(event: TouchEvent) {
      if (!isTracking || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      const horizontalDistance = startX - touch.clientX;
      const verticalDistance = Math.abs(touch.clientY - startY);

      if (
        verticalDistance > 18 &&
        verticalDistance > horizontalDistance
      ) {
        resetGesture();
        return;
      }

      if (
        horizontalDistance >= OPEN_DISTANCE &&
        horizontalDistance >= verticalDistance * DIRECTION_RATIO
      ) {
        resetGesture();
        onOpen();
      }
    }

    window.addEventListener("touchstart", handleTouchStart, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchmove", handleTouchMove, {
      passive: true,
      capture: true,
    });
    window.addEventListener("touchend", resetGesture, {
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
      window.removeEventListener("touchend", resetGesture, true);
      window.removeEventListener("touchcancel", resetGesture, true);
    };
  }, [enabled, onOpen]);
}
