import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router'
import {
  BookmarkIcon,
  CloseIcon,
  UserIcon,
} from './NavigationIcons'
import {
  primaryNavigation,
  secondaryNavigation,
} from './NavigationItems'

interface MobileNavigationDrawerProps {
  onClose: () => void
  onPlannedFeature: (featureName: string) => void
}

function MobileNavigationDrawer({
  onClose,
  onPlannedFeature,
}: MobileNavigationDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocusedElementRef.current =
      document.activeElement as HTMLElement | null

    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) {
        return
      }

      const focusableElements = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ),
      )

      const firstElement = focusableElements[0]
      const lastElement =
        focusableElements[focusableElements.length - 1]

      if (!firstElement || !lastElement) {
        return
      }

      if (
        event.shiftKey &&
        document.activeElement === firstElement
      ) {
        event.preventDefault()
        lastElement.focus()
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElementRef.current?.focus()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        aria-label="Close navigation menu"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
      />

      <aside
        id="mobile-navigation"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className="absolute right-0 top-0 flex h-full w-[min(88vw,380px)] flex-col border-l border-white/10 bg-slate-950 p-5 shadow-2xl shadow-black/50"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <NavLink
            to="/"
            className="text-xl font-bold tracking-tight"
            onClick={onClose}
          >
            Film<span className="text-sky-400">Geezer</span>
          </NavLink>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Explore
          </p>

          <div className="mt-3 flex flex-col gap-1">
            {primaryNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-12 items-center rounded-2xl px-4 text-base font-medium transition ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-300'
                      : 'text-slate-200 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="my-6 border-t border-white/10" />

          <p className="px-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Support
          </p>

          <div className="mt-3 flex flex-col gap-1">
            {secondaryNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-12 items-center rounded-2xl px-4 text-base font-medium transition ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-300'
                      : 'text-slate-200 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
          <button
            type="button"
            onClick={() => onPlannedFeature('Watchlist')}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 font-semibold text-slate-100 transition hover:bg-white/10"
          >
            <BookmarkIcon />
            Watchlist
          </button>

          <button
            type="button"
            onClick={() =>
              onPlannedFeature('Profile and login')
            }
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-3 font-semibold text-white transition hover:bg-sky-400"
          >
            <UserIcon />
            Profile
          </button>
        </div>
      </aside>
    </div>
  )
}

export default MobileNavigationDrawer