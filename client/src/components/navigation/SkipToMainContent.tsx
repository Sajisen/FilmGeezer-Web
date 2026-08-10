import type { MouseEvent } from "react";

const MAIN_CONTENT_ID = "main-content";

function resolveMainContentTarget(): HTMLElement | null {
  const existingTarget = document.getElementById(MAIN_CONTENT_ID);

  if (existingTarget instanceof HTMLElement) {
    return existingTarget;
  }

  const main = document.querySelector<HTMLElement>("main");

  if (!main) {
    return null;
  }

  main.id = MAIN_CONTENT_ID;
  return main;
}

export default function SkipToMainContent() {
  function handleSkip(event: MouseEvent<HTMLAnchorElement>) {
    const target = resolveMainContentTarget();

    if (!target) {
      return;
    }

    event.preventDefault();

    if (!target.hasAttribute("tabindex")) {
      target.tabIndex = -1;
    }

    target.focus({
      preventScroll: true,
    });

    target.scrollIntoView({
      behavior: "auto",
      block: "start",
      inline: "nearest",
    });
  }

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      onClick={handleSkip}
      className="fixed left-4 top-3 z-[200] -translate-y-24 rounded-full bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-xl shadow-black/30 transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white motion-reduce:transition-none"
    >
      Skip to main content
    </a>
  );
}
