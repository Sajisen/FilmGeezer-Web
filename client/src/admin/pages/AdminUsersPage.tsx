import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAdminAuth } from "../auth/adminAuthContext";
import AdminIcon from "../components/AdminIcon";
import AdminPageHeader from "../components/AdminPageHeader";
import {
  AdminApiError,
  getAdminUserDetail,
  getAdminUsers,
  reactivateAdminUser,
  revokeAdminUserSession,
  revokeAllAdminUserSessions,
  suspendAdminUser,
} from "../services/adminService";
import type {
  AdminManagedUserDetail,
  AdminManagedUserSummary,
  AdminUserListFilters,
} from "../types/admin";
import AdminRecentAuthenticationDialog from "../users/AdminRecentAuthenticationDialog";
import AdminUserDetailPanel from "../users/AdminUserDetailPanel";
import AdminUserFilters, {
  type AdminUserFilterDraft,
} from "../users/AdminUserFilters";
import AdminUserList from "../users/AdminUserList";

const INITIAL_FILTERS: AdminUserFilterDraft = {
  search: "",
  status: "all",
  role: "all",
  verification: "all",
};

export default function AdminUsersPage() {
  const {
    csrfToken,
    security,
    refreshSession,
  } = useAdminAuth();
  const [draftFilters, setDraftFilters] =
    useState<AdminUserFilterDraft>(INITIAL_FILTERS);
  const [filters, setFilters] = useState<AdminUserListFilters>({
    ...INITIAL_FILTERS,
    page: 1,
  });
  const [items, setItems] = useState<AdminManagedUserSummary[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [selectedUserId, setSelectedUserId] =
    useState<string | null>(null);
  const [detail, setDetail] =
    useState<AdminManagedUserDetail | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);
  const [showRecentAuthentication, setShowRecentAuthentication] =
    useState(false);
  const [pendingRetry, setPendingRetry] = useState<
    (() => Promise<void>) | null
  >(null);

  const loadUsers = useCallback(
    async (signal?: AbortSignal) => {
      setIsListLoading(true);
      setListError(null);

      try {
        const response = await getAdminUsers(filters, signal);
        setItems(response.items);
        setPagination(response.pagination);

        if (response.items.length === 0) {
          setDetail(null);
        }

        setSelectedUserId((current) => {
          if (
            current &&
            response.items.some((item) => item.userId === current)
          ) {
            return current;
          }

          return response.items[0]?.userId ?? null;
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setItems([]);
        setSelectedUserId(null);
        setDetail(null);
        setListError(
          error instanceof Error
            ? error.message
            : "FilmGeezer accounts could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) {
          setIsListLoading(false);
        }
      }
    },
    [filters],
  );

  const loadDetail = useCallback(
    async (userId: string, signal?: AbortSignal) => {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const response = await getAdminUserDetail(userId, signal);
        setDetail(response.detail);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setDetail(null);
        setDetailError(
          error instanceof Error
            ? error.message
            : "The FilmGeezer account could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) {
          setIsDetailLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadUsers(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadUsers]);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadDetail(selectedUserId, controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadDetail, selectedUserId]);

  const activeCsrfToken = csrfToken ?? "";

  if (!activeCsrfToken) {
    return null;
  }

  function applyMutationDetail(nextDetail: AdminManagedUserDetail) {
    setDetail(nextDetail);
    setItems((current) =>
      current.map((item) =>
        item.userId === nextDetail.user.userId
          ? nextDetail.user
          : item,
      ),
    );
  }

  async function runMutation(
    action: () => Promise<{
      message: string;
      detail: AdminManagedUserDetail;
    }>,
  ): Promise<void> {
    setIsWorking(true);
    setDetailError(null);
    setSuccessMessage(null);

    try {
      const response = await action();
      applyMutationDetail(response.detail);
      setSuccessMessage(response.message);
      setPendingRetry(null);
      setShowRecentAuthentication(false);
      await loadUsers();
    } catch (error) {
      if (
        error instanceof AdminApiError &&
        error.code === "ADMIN_RECENT_AUTHENTICATION_REQUIRED"
      ) {
        setPendingRetry(() => () => runMutation(action));
        setShowRecentAuthentication(true);
        setDetailError(
          "Confirm your administrator identity to continue this sensitive action.",
        );
        return;
      }

      setDetailError(
        error instanceof Error
          ? error.message
          : "The administrator user action could not be completed.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function finishRecentAuthentication() {
    await refreshSession();
    setShowRecentAuthentication(false);
    const retry = pendingRetry;
    setPendingRetry(null);

    if (retry) {
      await retry();
    }
  }

  const passkeyAvailable =
    Boolean(security?.passkeysConfigured) &&
    (security?.passkeyCount ?? 0) > 0;
  const totpAvailable = Boolean(security?.mfaEnabled);
  const recoveryAvailable =
    (security?.recoveryCodesRemaining ?? 0) > 0;

  const selectedDetail =
    detail?.user.userId === selectedUserId ? detail : null;
  const isSelectedDetailLoading =
    Boolean(selectedUserId) &&
    (isDetailLoading ||
      (selectedDetail === null && detailError === null));

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Account administration"
        title="Users"
        description="Search FilmGeezer accounts, review identity and verification state, inspect active public sessions, and apply protected suspension or reactivation controls."
        icon="users"
        actions={
          <button
            type="button"
            onClick={() => void loadUsers()}
            disabled={isListLoading || isWorking}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-slate-950/25 px-4 text-xs font-black text-slate-300 transition hover:bg-white/[0.045] hover:text-white disabled:opacity-50"
          >
            <AdminIcon
              name="refresh"
              className={`h-3.5 w-3.5 ${
                isListLoading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        }
        meta={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span>Recent authentication required for every change</span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
            <span>Self-action and final-admin protection enabled</span>
          </div>
        }
      />

      {successMessage ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.06] px-4 py-3.5 text-sm font-bold text-emerald-100"
        >
          <AdminIcon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      ) : null}

      {listError ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-300/12 bg-red-400/[0.06] px-4 py-3.5 text-sm font-bold text-red-100"
        >
          <AdminIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{listError}</span>
        </div>
      ) : null}

      <AdminUserFilters
        value={draftFilters}
        isLoading={isListLoading}
        onChange={setDraftFilters}
        onApply={() =>
          setFilters({
            ...draftFilters,
            page: 1,
          })
        }
        onReset={() => {
          setDraftFilters(INITIAL_FILTERS);
          setFilters({
            ...INITIAL_FILTERS,
            page: 1,
          });
        }}
      />

      {detailError ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-2xl border border-red-300/12 bg-red-400/[0.06] px-4 py-3.5 text-sm font-bold text-red-100"
        >
          <span className="flex items-start gap-3">
            <AdminIcon
              name="alert"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>{detailError}</span>
          </span>
          <button
            type="button"
            onClick={() => setDetailError(null)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-red-100/60 hover:bg-red-400/10 hover:text-red-100"
            aria-label="Dismiss user action message"
          >
            <AdminIcon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[23rem_minmax(0,1fr)]">
        <AdminUserList
          items={items}
          selectedUserId={selectedUserId}
          isLoading={isListLoading}
          pagination={pagination}
          onSelect={(userId) => {
            setSelectedUserId(userId);
            setSuccessMessage(null);
            setDetailError(null);
          }}
          onPageChange={(page) =>
            setFilters((current) => ({ ...current, page }))
          }
        />

        <AdminUserDetailPanel
          key={selectedUserId ?? "no-selected-user"}
          detail={selectedDetail}
          isLoading={isSelectedDetailLoading}
          isWorking={isWorking}
          onSuspend={(reason) =>
            runMutation(() =>
              suspendAdminUser(
                detail?.user.userId ?? "",
                reason,
                activeCsrfToken,
              ),
            )
          }
          onReactivate={(reason) =>
            runMutation(() =>
              reactivateAdminUser(
                detail?.user.userId ?? "",
                reason,
                activeCsrfToken,
              ),
            )
          }
          onRevokeSession={(sessionId) =>
            runMutation(() =>
              revokeAdminUserSession(
                detail?.user.userId ?? "",
                sessionId,
                activeCsrfToken,
              ),
            )
          }
          onRevokeAllSessions={() =>
            runMutation(() =>
              revokeAllAdminUserSessions(
                detail?.user.userId ?? "",
                activeCsrfToken,
              ),
            )
          }
        />
      </div>

      <AdminRecentAuthenticationDialog
        open={showRecentAuthentication}
        csrfToken={activeCsrfToken}
        passkeyAvailable={passkeyAvailable}
        totpAvailable={totpAvailable}
        recoveryAvailable={recoveryAvailable}
        onClose={() => {
          if (!isWorking) {
            setShowRecentAuthentication(false);
            setPendingRetry(null);
          }
        }}
        onConfirmed={finishRecentAuthentication}
      />
    </div>
  );
}
