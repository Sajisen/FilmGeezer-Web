import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useAdminAuth } from "../auth/adminAuthContext";
import {
  getAdminSupportConversation,
  getAdminSupportConversations,
  replyToAdminSupportConversation,
  updateAdminSupportStatus,
} from "../services/adminService";
import AdminSupportConversationList from "../support/components/AdminSupportConversationList";
import AdminSupportConversationPanel from "../support/components/AdminSupportConversationPanel";
import AdminSupportFilters from "../support/components/AdminSupportFilters";
import type {
  AdminSupportConversationSummary,
  AdminSupportConversationThread,
  AdminSupportListFilters,
  AdminSupportRequesterFilter,
  AdminSupportStatus,
  AdminSupportStatusFilter,
} from "../types/admin";

const INITIAL_FILTERS: AdminSupportListFilters = {
  page: 1,
  status: "open",
  category: "all",
  requester: "all",
  search: "",
};

export default function AdminSupportPage() {
  const { csrfToken } = useAdminAuth();
  const [filters, setFilters] =
    useState<AdminSupportListFilters>(INITIAL_FILTERS);
  const [searchDraft, setSearchDraft] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [items, setItems] =
    useState<AdminSupportConversationSummary[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [isListLoading, setIsListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedReferenceId, setSelectedReferenceId] =
    useState<string | null>(null);
  const [thread, setThread] =
    useState<AdminSupportConversationThread | null>(null);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationMessage, setMutationMessage] =
    useState<string | null>(null);

  const loadList = useCallback(
    async (signal?: AbortSignal) => {
      setIsListLoading(true);
      setListError(null);

      try {
        const response = await getAdminSupportConversations(
          filters,
          signal,
        );

        if (
          response.pagination.page > response.pagination.totalPages
        ) {
          setFilters((current) => ({
            ...current,
            page: response.pagination.totalPages,
          }));
          return;
        }

        setItems(response.items);
        setPagination(response.pagination);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setListError(
          error instanceof Error
            ? error.message
            : "The support inbox could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) {
          setIsListLoading(false);
        }
      }
    },
    [filters],
  );

  const loadThread = useCallback(
    async (referenceId: string, signal?: AbortSignal) => {
      setIsThreadLoading(true);
      setThreadError(null);
      setMutationMessage(null);

      try {
        const response = await getAdminSupportConversation(
          referenceId,
          signal,
        );
        setThread(response.thread);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setThread(null);
        setThreadError(
          error instanceof Error
            ? error.message
            : "The support conversation could not be loaded.",
        );
      } finally {
        if (!signal?.aborted) {
          setIsThreadLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadList(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadList, refreshVersion]);

  useEffect(() => {
    if (!selectedReferenceId) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadThread(selectedReferenceId, controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadThread, selectedReferenceId]);

  function updateFilters(
    patch: Partial<AdminSupportListFilters>,
  ) {
    setFilters((current) => ({
      ...current,
      ...patch,
      page: patch.page ?? 1,
    }));
  }

  async function handleReply(message: string): Promise<boolean> {
    if (!selectedReferenceId || !csrfToken || isMutating) {
      return false;
    }

    setIsMutating(true);
    setThreadError(null);
    setMutationMessage(null);

    try {
      const response = await replyToAdminSupportConversation(
        selectedReferenceId,
        message,
        csrfToken,
      );
      setThread(response.thread);
      setMutationMessage(response.message);
      setRefreshVersion((value) => value + 1);
      return true;
    } catch (error) {
      setThreadError(
        error instanceof Error
          ? error.message
          : "The administrator reply could not be saved.",
      );
      return false;
    } finally {
      setIsMutating(false);
    }
  }

  async function handleStatusChange(status: AdminSupportStatus) {
    if (!selectedReferenceId || !csrfToken || isMutating) {
      return;
    }

    setIsMutating(true);
    setThreadError(null);
    setMutationMessage(null);

    try {
      const response = await updateAdminSupportStatus(
        selectedReferenceId,
        status,
        csrfToken,
      );
      setThread(response.thread);
      setMutationMessage(response.message);
      setRefreshVersion((value) => value + 1);
    } catch (error) {
      setThreadError(
        error instanceof Error
          ? error.message
          : "The support-request status could not be updated.",
      );
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="space-y-5">
      <AdminSupportFilters
        filters={filters}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onApplySearch={() =>
          updateFilters({ search: searchDraft.trim() })
        }
        onStatusChange={(status: AdminSupportStatusFilter) =>
          updateFilters({ status })
        }
        onCategoryChange={(category) => updateFilters({ category })}
        onRequesterChange={(requester: AdminSupportRequesterFilter) =>
          updateFilters({ requester })
        }
        onRefresh={() => setRefreshVersion((value) => value + 1)}
        isLoading={isListLoading}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(20rem,0.78fr)_minmax(0,1.42fr)]">
        <AdminSupportConversationList
          items={items}
          selectedReferenceId={selectedReferenceId}
          isLoading={isListLoading}
          errorMessage={listError}
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          onSelect={(referenceId) => {
            setSelectedReferenceId(referenceId);
            setThread(null);
            setThreadError(null);
          }}
          onPageChange={(page) => updateFilters({ page })}
        />

        <div className="xl:sticky xl:top-24">
          <AdminSupportConversationPanel
            key={selectedReferenceId ?? "no-selection"}
            thread={thread}
            isLoading={isThreadLoading}
            errorMessage={threadError}
            mutationMessage={mutationMessage}
            isMutating={isMutating}
            onRefresh={() => {
              if (selectedReferenceId) {
                void loadThread(selectedReferenceId);
              }
            }}
            onReply={handleReply}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>
    </div>
  );
}
