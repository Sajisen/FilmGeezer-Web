import {
  useEffect,
  useState,
  type MouseEvent,
} from 'react'

function BackToTopButton() {
  const [isVisible, setIsVisible] =
    useState(false)

  useEffect(() => {
    function updateVisibility() {
      setIsVisible(
        window.scrollY > 650,
      )
    }

    updateVisibility()

    window.addEventListener(
      'scroll',
      updateVisibility,
      {
        passive: true,
      },
    )

    return () => {
      window.removeEventListener(
        'scroll',
        updateVisibility,
      )
    }
  }, [])

  function scrollToTop(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    const prefersReducedMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches

    window.scrollTo({
      top: 0,
      left: 0,

      behavior:
        prefersReducedMotion
          ? 'auto'
          : 'smooth',
    })

    if (event.detail === 0) {
      document
        .getElementById(
          'main-content',
        )
        ?.focus({
          preventScroll: true,
        })
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to the top of the page"
      title="Back to top"
      className="back-to-top-safe-area fixed z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-slate-950/90 text-white shadow-2xl shadow-black/40 backdrop-blur-md transition hover:-translate-y-1 hover:border-sky-300/60 hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
      >
        <path
          d="m6 14 6-6 6 6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

export default BackToTopButton