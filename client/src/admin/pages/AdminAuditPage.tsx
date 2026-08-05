import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import AdminAuditDetailPanel from "../audit/AdminAuditDetailPanel";
import AdminAuditFilters, {
  type AdminAuditFilterDraft,
} from "../audit/AdminAuditFilters";
import AdminAuditList from "../audit/AdminAuditList";
import AdminIcon from "../components/AdminIcon";
import AdminPageHeader from "../components/AdminPageHeader";
import { getAdminAuditEvents } from "../services/adminService";
import type {
  AdminAuditEntry,
  AdminAuditListFilters,
} from "../types/admin";

const INITIAL_FILTERS: AdminAuditFilterDraft = {
  category: "all",
  event: "all",
  outcome: "all",
  actor: "",
  target: "",
  from: "",
  to: "",
};

function localDateBoundary(
  value: string,
  boundary: "start" | "end",
): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(
    year,
    month - 1,
    day,
    boundary === "start" ? 0 : 23,
    boundary === "start" ? 0 : 59,
    boundary === "start" ? 0 : 59,
    boundary === "start" ? 0 : 999,
  );

  return date.toISOString();
}

function toRequestFilters(
  filters: AdminAuditListFilters,
): AdminAuditListFilters {
  return {
    ...filters,
    from: filters.from
      ? localDateBoundary(filters.from, "start")
      : "",
    to: filters.to ? localDateBoundary(filters.to, "end") : "",
  };
}

export default function AdminAuditPage() {
  const [draftFilters, setDraftFilters] =
    useState<AdminAuditFilterDraft>(INITIAL_FILTERS);
  const [filters, setFilters] = useState<AdminAuditListFilters>({
    ...INITIAL_FILTERS,
    page: 1,
  });
  const [items, setItems] = useState<AdminAuditEntry[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 1,
  });
  const [selectedEventId, setSelectedEventId] =
    useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAuditEvents = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await getAdminAuditEvents(
          toRequestFilters(filters),
          signal,
        );
        setItems(response.items);
        setPagination(response.pagination);
        setSelectedEventId((current) => {
          if (
            current &&
            response.items.some(
              (item) => item.auditEventId === current,
            )
          ) {
            return current;
          }

          return response.items[0]?.auditEventId ?? null;
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setItems([]);
        setSelectedEventId(null);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Administrator audit records could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadAuditEvents(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadAuditEvents]);

  const selectedItem = useMemo(
    () =>
      items.find((item) => item.auditEventId === selectedEventId) ??
      null,
    [items, selectedEventId],
  );

  function applyFilters() {
    if (
      draftFilters.from &&
      draftFilters.to &&
      draftFilters.from > draftFilters.to
    ) {
      setErrorMessage("The audit end date must be after the start date.");
      return;
    }

    setFilters({ ...draftFilters, page: 1 });
  }

  function resetFilters() {
    setDraftFilters(INITIAL_FILTERS);
    setFilters({ ...INITIAL_FILTERS, page: 1 });
  }

  const successfulOnPage = items.filter(
    (item) => item.outcome === "success",
  ).length;
  const failedOnPage = items.length - successfulOnPage;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Security and operations"
        title="Audit records"
        description="Review read-only administrator activity with actor, target, event, outcome, and date filters while keeping credentials, tokens, challenges, recovery codes, and sensitive request content hidden."
        icon="audit"
        actions={
          <button
            type="button"
            onClick={() => void loadAuditEvents()}
            disabled={isLoading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-slate-950/25 px-4 text-xs font-black text-slate-300 transition hover:bg-white/[0.045] hover:text-white disabled:opacity-50"
          >
            <AdminIcon
              name="refresh"
              className={`h-3.5 w-3.5 ${
                isLoading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        }
        meta={
          <div className="flex flex-wrap gap-2 text-[0.58rem] font-black uppercase tracking-[0.12em]">
            <span className="rounded-full border border-emerald-300/15 bg-emerald-400/[0.07] px-2.5 py-1 text-emerald-200">
              Read only
            </span>
            <span className="rounded-full border border-white/[0.07] bg-slate-950/30 px-2.5 py-1 text-slate-500">
              Latest records first
            </span>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-slate-900/40 px-4 py-4">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.15em] text-slate-600">
            Matching records
          </p>
          <p className="mt-2 text-2xl font-black text-white">
            {pagination.totalItems.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.035] px-4 py-4">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.15em] text-emerald-300/60">
            Successful on page
          </p>
          <p className="mt-2 text-2xl font-black text-emerald-100">
            {successfulOnPage}
          </p>
        </div>
        <div className="rounded-2xl border border-red-300/10 bg-red-400/[0.035] px-4 py-4">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.15em] text-red-300/60">
            Failed on page
          </p>
          <p className="mt-2 text-2xl font-black text-red-100">
            {failedOnPage}
          </p>
        </div>
      </div>

      <AdminAuditFilters
        value={draftFilters}
        isLoading={isLoading}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      {errorMessage ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-300/15 bg-red-400/[0.07] px-4 py-3 text-sm font-bold text-red-100"
        >
          <AdminIcon
            name="alert"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(20rem,0.82fr)_minmax(0,1.18fr)]">
        <AdminAuditList
          items={items}
          selectedEventId={selectedEventId}
          isLoading={isLoading}
          pagination={pagination}
          onSelect={setSelectedEventId}
          onPageChange={(page) =>
            setFilters((current) => ({ ...current, page }))
          }
        />
        <AdminAuditDetailPanel
          item={selectedItem}
          isLoading={isLoading}
          errorMessage={null}
        />
      </div>
    </div>
  );
}
