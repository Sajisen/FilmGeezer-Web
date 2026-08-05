import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
} from "react-router";

import { BellIcon } from "../../../components/navigation/NavigationIcons";
import { useAuth } from "../../auth/authContext";
import type { UserNotification } from "../../../types/notification";
import { useNotifications } from "../notificationContext";
import NotificationPopover from "./NotificationPopover";
import WelcomeNotificationDialog from "./WelcomeNotificationDialog";

export default function NotificationBell({
  className = "",
}: {
  className?: string;
}) {
  const auth = useAuth();
  const notifications = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [welcomeNotification, setWelcomeNotification] =
    useState<UserNotification | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsOpen(false);
      setActionError(null);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closePopover() {
      setIsOpen(false);
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        closePopover();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePopover();
        triggerRef.current?.focus();
      }
    }

    function handleWheel(event: WheelEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        closePopover();
      }
    }

    function handleScroll(event: Event) {
      const target = event.target;

      if (
        target instanceof Node &&
        containerRef.current?.contains(target)
      ) {
        return;
      }

      closePopover();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("wheel", handleWheel, true);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", closePopover);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("wheel", handleWheel, true);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", closePopover);
    };
  }, [isOpen]);

  function openBell() {
    const isCompactViewport = window.matchMedia("(max-width: 639px)").matches;

    if (isCompactViewport) {
      navigate("/notifications");
      return;
    }

    setIsOpen((current) => !current);
    setActionError(null);

    if (!isOpen) {
      void notifications.refreshSummary();
    }
  }

  async function openNotification(notification: UserNotification) {
    setIsMutating(true);
    setActionError(null);

    try {
      const nextNotification =
        notification.readAt === null
          ? await notifications.markRead(notification.id)
          : notification;

      setIsOpen(false);

      if (nextNotification.action.kind === "welcome") {
        setWelcomeNotification(nextNotification);
        return;
      }

      navigate(nextNotification.action.href);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not open this notification.",
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function markAllRead() {
    setIsMutating(true);
    setActionError(null);

    try {
      await notifications.markAllRead();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not update your notifications.",
      );
    } finally {
      setIsMutating(false);
    }
  }

  const closeWelcome = useCallback(() => {
    setWelcomeNotification(null);
    window.setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  }, []);

  const unreadLabel =
    notifications.unreadCount === 0
      ? "Open notifications"
      : `Open notifications, ${notifications.unreadCount} unread`;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={openBell}
        aria-label={unreadLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title="Notifications"
        className={`relative grid h-10 w-10 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
          isOpen
            ? "bg-sky-400 text-slate-950"
            : "text-slate-300 hover:bg-sky-400/10 hover:text-sky-200"
        }`}
      >
        <BellIcon className="h-5 w-5" />

        {notifications.unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-sky-400 px-1 text-[0.6rem] font-black leading-none text-slate-950"
          >
            {notifications.unreadCount > 99
              ? "99+"
              : notifications.unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <NotificationPopover
          status={notifications.status}
          notifications={notifications.notifications}
          unreadCount={notifications.unreadCount}
          errorMessage={actionError ?? notifications.errorMessage}
          isMutating={isMutating}
          onOpenNotification={(notification) => {
            void openNotification(notification);
          }}
          onMarkAllRead={() => {
            void markAllRead();
          }}
          onViewAll={() => {
            setIsOpen(false);
            navigate("/notifications");
          }}
          onRetry={() => {
            setActionError(null);
            void notifications.refreshSummary();
          }}
        />
      ) : null}

      {welcomeNotification && auth.user ? (
        <WelcomeNotificationDialog
          notification={welcomeNotification}
          displayName={auth.user.displayName}
          onClose={closeWelcome}
        />
      ) : null}
    </div>
  );
}
