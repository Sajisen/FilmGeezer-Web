import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAdminAuth } from "../auth/adminAuthContext";
import AdminIcon from "../components/AdminIcon";
import AdminPageHeader from "../components/AdminPageHeader";
import AdminContentEditor from "../content/AdminContentEditor";
import AdminContentFilters, {
  type AdminContentFilterDraft,
} from "../content/AdminContentFilters";
import AdminContentList from "../content/AdminContentList";
import AdminContentLookupDialog from "../content/AdminContentLookupDialog";
import {
  AdminApiError,
  getAdminContentEntries,
  getAdminContentEntry,
  saveAdminContentEntry,
  updateAdminContentEntryStatus,
} from "../services/adminService";
import type {
  AdminContentDetail,
  AdminContentListFilters,
  AdminContentMediaType,
  AdminContentSaveInput,
  AdminContentSummary,
} from "../types/admin";
import AdminRecentAuthenticationDialog from "../users/AdminRecentAuthenticationDialog";

const INITIAL_FILTERS: AdminContentFilterDraft = {
  search: "",
  mediaType: "all",
  status: "all",
};

interface SelectedContentIdentity {
  mediaType: AdminContentMediaType;
  tmdbId: number;
}

function createContentKey(identity: SelectedContentIdentity): string {
  return `${identity.mediaType}:${identity.tmdbId}`;
}

function ContentDetailSkeleton() {
  return (
    <section className="animate-pulse overflow-hidden rounded-[1.6rem] border border-white/[0.075] bg-slate-900/45">
      <div className="flex gap-5 border-b border-white/[0.06] p-6">
        <span className="h-36 w-24 rounded-2xl bg-white/[0.055]" />
        <span className="min-w-0 flex-1">
          <span className="block h-3 w-24 rounded bg-white/[0.05]" />
          <span className="mt-4 block h-7 w-2/5 rounded bg-white/[0.065]" />
          <span className="mt-3 block h-3 w-1/4 rounded bg-white/[0.045]" />
          <span className="mt-5 block h-2.5 w-4/5 rounded bg-white/[0.035]" />
          <span className="mt-2 block h-2.5 w-3/5 rounded bg-white/[0.035]" />
        </span>
      </div>
      <div className="space-y-3 p-6">
        {Array.from({ length: 3 }, (_, index) => (
          <span
            key={index}
            className="block h-28 rounded-2xl border border-white/[0.045] bg-white/[0.025]"
          />
        ))}
      </div>
    </section>
  );
}

export default function AdminContentPage() {
  const { csrfToken, security, refreshSession } = useAdminAuth();
  const [draftFilters, setDraftFilters] =
    useState<AdminContentFilterDraft>(INITIAL_FILTERS);
  const [filters, setFilters] = useState<AdminContentListFilters>({
    ...INITIAL_FILTERS,
    page: 1,
  });
  const [items, setItems] = useState<AdminContentSummary[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [selectedIdentity, setSelectedIdentity] =
    useState<SelectedContentIdentity | null>(null);
  const [detail, setDetail] = useState<AdminContentDetail | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successMessageRef = useRef<HTMLDivElement>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [showRecentAuthentication, setShowRecentAuthentication] =
    useState(false);
  const [pendingRetry, setPendingRetry] = useState<
    (() => Promise<void>) | null
  >(null);

  const loadEntries = useCallback(
    async (signal?: AbortSignal) => {
      setIsListLoading(true);
      setListError(null);

      try {
        const response = await getAdminContentEntries(filters, signal);
        setItems(response.items);
        setPagination(response.pagination);
        setSelectedIdentity((current) => {
          if (
            current &&
            response.items.some(
              (item) =>
                item.mediaType === current.mediaType &&
                item.tmdbId === current.tmdbId,
            )
          ) {
            return current;
          }

          const firstItem = response.items[0];
          return firstItem
            ? {
                mediaType: firstItem.mediaType,
                tmdbId: firstItem.tmdbId,
              }
            : null;
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setItems([]);
        setListError(
          error instanceof Error
            ? error.message
            : "FilmGeezer content entries could not be loaded.",
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
    async (
      identity: SelectedContentIdentity,
      signal?: AbortSignal,
    ) => {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const response = await getAdminContentEntry(
          identity.mediaType,
          identity.tmdbId,
          signal,
        );
        setDetail(response.detail);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setDetail(null);
        setDetailError(
          error instanceof Error
            ? error.message
            : "The FilmGeezer content entry could not be loaded.",
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
      void loadEntries(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadEntries]);

  useEffect(() => {
    if (!selectedIdentity) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadDetail(selectedIdentity, controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadDetail, selectedIdentity]);

  const activeCsrfToken = csrfToken ?? "";

  if (!activeCsrfToken) {
    return null;
  }

  async function runSensitiveMutation(
    action: () => Promise<{
      message: string;
      detail: AdminContentDetail;
    }>,
  ): Promise<void> {
    setIsWorking(true);
    setDetailError(null);
    setSuccessMessage(null);

    try {
      const response = await action();
      setDetail(response.detail);
      setSuccessMessage(response.message);
      setPendingRetry(null);
      setShowRecentAuthentication(false);
      await loadEntries();

      window.setTimeout(() => {
        successMessageRef.current?.focus();
      }, 0);
    } catch (error) {
      if (
        error instanceof AdminApiError &&
        error.code === "ADMIN_RECENT_AUTHENTICATION_REQUIRED"
      ) {
        setPendingRetry(() => () => runSensitiveMutation(action));
        setShowRecentAuthentication(true);
        setDetailError(
          "Confirm your administrator identity to continue this sensitive content change.",
        );
        return;
      }

      setDetailError(
        error instanceof Error
          ? error.message
          : "The administrator content action could not be completed.",
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
  const selectedKey = selectedIdentity
    ? createContentKey(selectedIdentity)
    : null;
  const selectedDetail =
    detail && selectedIdentity
      ? detail.media.mediaType === selectedIdentity.mediaType &&
        detail.media.tmdbId === selectedIdentity.tmdbId
        ? detail
        : null
      : null;
  const isSelectedDetailLoading =
    Boolean(selectedIdentity) &&
    (isDetailLoading ||
      (selectedDetail === null && detailError === null));

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Catalog operations"
        title="Content"
        description="Locate canonical TMDB titles and safely manage FilmGeezer-owned movie and series links without exposing the bot database or private importer metadata to React."
        icon="content"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowLookup(true)}
              disabled={isWorking}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-500 px-4 text-xs font-black text-white transition hover:bg-sky-400 disabled:opacity-50"
            >
              <AdminIcon name="search" className="h-3.5 w-3.5" />
              Find TMDB title
            </button>
            <button
              type="button"
              onClick={() => void loadEntries()}
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
          </div>
        }
        meta={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span>Canonical identity: TMDB media type + TMDB ID</span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-700 sm:block" />
            <span>Recent authentication and revision protection enabled</span>
          </div>
        }
      />

      {successMessage ? (
        <div
          ref={successMessageRef}
          role="status"
          tabIndex={-1}
          className="flex items-start gap-3 rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.06] px-4 py-3.5 text-sm font-bold text-emerald-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
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

      <AdminContentFilters
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
            aria-label="Dismiss content action message"
          >
            <AdminIcon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[23rem_minmax(0,1fr)]">
        <AdminContentList
          items={items}
          selectedKey={selectedKey}
          isLoading={isListLoading}
          pagination={pagination}
          onSelect={(mediaType, tmdbId) => {
            setSelectedIdentity({ mediaType, tmdbId });
            setSuccessMessage(null);
          }}
          onPageChange={(page) =>
            setFilters((current) => ({ ...current, page }))
          }
        />

        {isSelectedDetailLoading ? (
          <ContentDetailSkeleton />
        ) : selectedDetail ? (
          <AdminContentEditor
            key={`${selectedDetail.media.mediaType}:${selectedDetail.media.tmdbId}:${selectedDetail.revision}`}
            detail={selectedDetail}
            isWorking={isWorking}
            onSave={(input: AdminContentSaveInput) =>
              runSensitiveMutation(() =>
                saveAdminContentEntry(
                  selectedDetail.media.mediaType,
                  selectedDetail.media.tmdbId,
                  input,
                  activeCsrfToken,
                ),
              )
            }
            onStatusChange={({ active, reason }) =>
              runSensitiveMutation(() =>
                updateAdminContentEntryStatus(
                  selectedDetail.media.mediaType,
                  selectedDetail.media.tmdbId,
                  {
                    expectedRevision: selectedDetail.revision,
                    expectedRevisionToken: selectedDetail.revisionToken,
                    active,
                    reason,
                  },
                  activeCsrfToken,
                ),
              )
            }
          />
        ) : (
          <section className="grid min-h-[36rem] place-items-center rounded-[1.6rem] border border-dashed border-white/[0.08] bg-slate-900/25 px-6 text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.07] bg-slate-950/35 text-slate-500">
                <AdminIcon name="content" className="h-6 w-6" />
              </span>
              <p className="mt-4 text-base font-black text-white">
                Select or locate a title
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Choose a managed entry from the directory or use TMDB lookup to
                create FilmGeezer links for a new movie or TV series.
              </p>
              <button
                type="button"
                onClick={() => setShowLookup(true)}
                className="mt-5 min-h-10 rounded-xl bg-sky-500 px-4 text-xs font-black text-white transition hover:bg-sky-400"
              >
                Find TMDB title
              </button>
            </div>
          </section>
        )}
      </div>

      <AdminContentLookupDialog
        open={showLookup}
        onClose={() => setShowLookup(false)}
        onSelect={(mediaType, tmdbId) => {
          setSelectedIdentity({ mediaType, tmdbId });
          setSuccessMessage(null);
          setDetailError(null);
        }}
      />

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
