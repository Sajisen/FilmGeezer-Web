import ProfileAvatar from "../../components/ProfileAvatar";
import AdminIcon from "../components/AdminIcon";
import type {
  AdminManagedUserSummary,
} from "../types/admin";
import {
  formatAdminUserRelativeDate,
  getAdminUserStatusClass,
  getAdminUserStatusLabel,
} from "./usersPresentation";

function UserListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 7 }, (_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center gap-3 rounded-2xl border border-white/[0.05] bg-slate-950/20 p-3"
        >
          <span className="h-11 w-11 rounded-full bg-white/[0.06]" />
          <span className="min-w-0 flex-1">
            <span className="block h-3 w-2/5 rounded bg-white/[0.06]" />
            <span className="mt-2 block h-2.5 w-3/5 rounded bg-white/[0.04]" />
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminUserList({
  items,
  selectedUserId,
  isLoading,
  pagination,
  onSelect,
  onPageChange,
}: {
  items: AdminManagedUserSummary[];
  selectedUserId: string | null;
  isLoading: boolean;
  pagination: {
    page: number;
    totalItems: number;
    totalPages: number;
  };
  onSelect: (userId: string) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/[0.075] bg-slate-900/45 shadow-xl shadow-black/[0.08]">
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4">
        <div>
          <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-600">
            Account directory
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {pagination.totalItems.toLocaleString()} account
            {pagination.totalItems === 1 ? "" : "s"}
          </p>
        </div>
        <span className="rounded-full border border-white/[0.07] bg-slate-950/35 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-slate-500">
          Page {pagination.page} of {pagination.totalPages}
        </span>
      </header>

      {isLoading ? (
        <UserListSkeleton />
      ) : items.length === 0 ? (
        <div className="grid min-h-72 place-items-center px-5 py-10 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/[0.07] bg-slate-950/35 text-slate-500">
              <AdminIcon name="search" className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm font-black text-white">
              No accounts matched
            </p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
              Change the search or filters and try again.
            </p>
          </div>
        </div>
      ) : (
        <div className="max-h-[54rem] space-y-1.5 overflow-y-auto p-2.5 admin-scrollbar">
          {items.map((user) => {
            const selected = user.userId === selectedUserId;

            return (
              <button
                key={user.userId}
                type="button"
                onClick={() => onSelect(user.userId)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selected
                    ? "border-sky-300/20 bg-sky-400/[0.09] shadow-lg shadow-sky-950/10"
                    : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.025]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <ProfileAvatar
                    displayName={user.displayName}
                    profileImagePath={user.profileImagePath}
                    className="h-11 w-11"
                    initialsClassName="text-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {user.displayName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {user.email}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.1em] ${getAdminUserStatusClass(user.status)}`}
                      >
                        {getAdminUserStatusLabel(user.status)}
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.62rem] font-bold text-slate-600">
                      {user.roles.includes("admin") ? (
                        <span className="text-sky-300">
                          Administrator
                        </span>
                      ) : (
                        <span>User</span>
                      )}
                      <span>
                        {user.emailVerified
                          ? "Email verified"
                          : "Unverified"}
                      </span>
                      <span>
                        {user.activeSessionCount} active session
                        {user.activeSessionCount === 1 ? "" : "s"}
                      </span>
                      <span>
                        Login {formatAdminUserRelativeDate(user.lastLoginAt)}
                      </span>
                    </div>

                    {user.isCurrentAdministrator ||
                    user.finalAdministratorProtected ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {user.isCurrentAdministrator ? (
                          <span className="rounded-full border border-sky-300/15 bg-sky-400/[0.08] px-2 py-0.5 text-[0.54rem] font-black uppercase tracking-[0.1em] text-sky-200">
                            Your account
                          </span>
                        ) : null}
                        {user.finalAdministratorProtected ? (
                          <span className="rounded-full border border-amber-300/15 bg-amber-400/[0.08] px-2 py-0.5 text-[0.54rem] font-black uppercase tracking-[0.1em] text-amber-100">
                            Final admin protected
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-3">
        <button
          type="button"
          disabled={pagination.page <= 1 || isLoading}
          onClick={() => onPageChange(pagination.page - 1)}
          className="min-h-9 rounded-xl border border-white/[0.07] px-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={
            pagination.page >= pagination.totalPages || isLoading
          }
          onClick={() => onPageChange(pagination.page + 1)}
          className="min-h-9 rounded-xl border border-white/[0.07] px-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          Next
        </button>
      </footer>
    </section>
  );
}
