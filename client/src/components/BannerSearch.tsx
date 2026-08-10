import { useId, useState } from "react";
import { useNavigate } from "react-router";
import type { SearchScope } from "../types/media";

interface BannerSearchProps {
  ariaLabel: string;
  placeholder: string;
  scope?: SearchScope;
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0"
      fill="none"
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />

      <path
        d="m16 16 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BannerSearch({ ariaLabel, placeholder, scope }: BannerSearchProps) {
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();
  const inputId = useId();

  const trimmedSearch = searchText.trim();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedSearch) {
      return;
    }

    const searchParams = new URLSearchParams({
      q: trimmedSearch,
    });

    if (scope) {
      searchParams.set("scope", scope);
    }

    navigate(`/search?${searchParams.toString()}`);
  }
  return (
    <form
      role="search"
      aria-label={ariaLabel}
      onSubmit={handleSubmit}
      className="max-w-2xl"
    >
      <label htmlFor={inputId} className="sr-only">
        {ariaLabel}
      </label>

      <div className="flex flex-col gap-2 rounded-3xl border border-white/15 bg-slate-950/70 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl sm:flex-row sm:items-center">
        <div className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl px-3 text-slate-400 transition focus-within:ring-2 focus-within:ring-sky-300 focus-within:ring-offset-2 focus-within:ring-offset-slate-950">
          <SearchIcon />

          <input
            id={inputId}
            type="search"
            value={searchText}
            maxLength={100}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent py-3 text-base text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <button
          type="submit"
          disabled={!trimmedSearch}
          className="min-h-12 rounded-2xl bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Search
        </button>
      </div>
    </form>
  );
}

export default BannerSearch;
