import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  PlannedFeatureContext,
  type PlannedFeatureNotice,
} from './plannedFeatureContext'

interface PlannedFeatureProviderProps {
  children: ReactNode
}

export function PlannedFeatureProvider({
  children,
}: PlannedFeatureProviderProps) {
  const [notice, setNotice] =
    useState<PlannedFeatureNotice | null>(
      null,
    )

  const closeButtonRef =
    useRef<HTMLButtonElement>(null)

  const previouslyFocusedElementRef =
    useRef<HTMLElement | null>(null)

  const showPlannedFeature = useCallback(
    (
      nextNotice:
        PlannedFeatureNotice,
    ) => {
      setNotice(nextNotice)
    },
    [],
  )

  const closeNotice = useCallback(() => {
    setNotice(null)
  }, [])

  useEffect(() => {
    if (!notice) {
      return
    }

    previouslyFocusedElementRef.current =
      document.activeElement as
        | HTMLElement
        | null

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    closeButtonRef.current?.focus()

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === 'Escape') {
        closeNotice()
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        closeButtonRef.current?.focus()
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.body.style.overflow =
        previousOverflow

      document.removeEventListener(
        'keydown',
        handleKeyDown,
      )

      previouslyFocusedElementRef.current?.focus()
    }
  }, [closeNotice, notice])

  const contextValue = useMemo(
    () => ({
      showPlannedFeature,
    }),
    [showPlannedFeature],
  )

  return (
    <PlannedFeatureContext.Provider
      value={contextValue}
    >
      {children}

      {notice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close notice"
            tabIndex={-1}
            onClick={closeNotice}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="planned-feature-title"
            aria-describedby="planned-feature-message"
            className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/50"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Planned feature
            </p>

            <h2
              id="planned-feature-title"
              className="mt-3 text-2xl font-bold text-white"
            >
              {notice.title}
            </h2>

            <p
              id="planned-feature-message"
              className="mt-3 leading-7 text-slate-300"
            >
              {notice.message}
            </p>

            <div className="mt-6 flex justify-end">
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeNotice}
                className="min-h-11 rounded-full bg-sky-500 px-5 font-semibold text-white transition hover:bg-sky-400"
              >
                Got it
              </button>
            </div>
          </section>
        </div>
      )}
    </PlannedFeatureContext.Provider>
  )
}