import { useState, type FormEvent } from "react";

import AdminIcon from "../components/AdminIcon";
import type {
  AdminContentDetail,
  AdminContentMovieQualityLink,
  AdminContentMovieSource,
  AdminContentSaveInput,
  AdminContentSeriesOption,
} from "../types/admin";

const QUALITY_VALUES = ["720p", "1080p"] as const;
type MovieQuality = (typeof QUALITY_VALUES)[number];

function createSeriesOption(index: number): AdminContentSeriesOption {
  return {
    id: index === 1 ? "series-main" : `series-option-${index}`,
    url: "",
    isMain: index === 1,
    active: true,
  };
}

function createMovieSource(index: number): AdminContentMovieSource {
  return {
    id: index === 1 ? "movie-main" : `movie-source-${index}`,
    isMain: index === 1,
    active: true,
    links: {
      "720p": { url: "", size: null },
      "1080p": null,
    },
  };
}

function normalizeIdentifier(value: string): string {
  return value.trim();
}

function validateEntryIds(values: Array<{ id: string }>): string | null {
  const seen = new Set<string>();

  for (const value of values) {
    const id = normalizeIdentifier(value.id);

    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(id)) {
      return "Every entry needs a unique ID using letters, numbers, underscores, or hyphens.";
    }

    const normalized = id.toLowerCase();

    if (seen.has(normalized)) {
      return "Link-entry IDs must be unique.";
    }

    seen.add(normalized);
  }

  return null;
}

function validateMainEntry(
  values: Array<{ active: boolean; isMain: boolean }>,
): string | null {
  const activeValues = values.filter((value) => value.active);
  const activeMainValues = activeValues.filter((value) => value.isMain);

  if (activeValues.length === 0) {
    return "Keep at least one active link entry.";
  }

  if (activeMainValues.length !== 1) {
    return "Select exactly one active main link entry.";
  }

  if (values.some((value) => value.isMain && !value.active)) {
    return "The main link entry must remain active.";
  }

  return null;
}

function cloneSeriesOptions(
  detail: AdminContentDetail,
): AdminContentSeriesOption[] {
  return detail.seriesOptions.length > 0
    ? detail.seriesOptions.map((option) => ({ ...option }))
    : [createSeriesOption(1)];
}

function cloneMovieSources(
  detail: AdminContentDetail,
): AdminContentMovieSource[] {
  return detail.movieSources.length > 0
    ? detail.movieSources.map((source) => ({
        ...source,
        links: {
          "720p": source.links["720p"]
            ? { ...source.links["720p"] }
            : null,
          "1080p": source.links["1080p"]
            ? { ...source.links["1080p"] }
            : null,
        },
      }))
    : [createMovieSource(1)];
}

function updateMainSelection<T extends { isMain: boolean; active: boolean }>(
  values: T[],
  selectedIndex: number,
): T[] {
  return values.map((value, index) => ({
    ...value,
    isMain: index === selectedIndex,
    active: index === selectedIndex ? true : value.active,
  }));
}

function moveEntry<T>(values: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= values.length ||
    toIndex >= values.length
  ) {
    return values;
  }

  const next = [...values];
  const [entry] = next.splice(fromIndex, 1);

  if (!entry) {
    return values;
  }

  next.splice(toIndex, 0, entry);
  return next;
}

function getMovieQualityLink(
  source: AdminContentMovieSource,
  quality: MovieQuality,
): AdminContentMovieQualityLink {
  return source.links[quality] ?? { url: "", size: null };
}

export default function AdminContentEditor({
  detail,
  isWorking,
  onSave,
  onStatusChange,
}: {
  detail: AdminContentDetail;
  isWorking: boolean;
  onSave: (input: AdminContentSaveInput) => Promise<void>;
  onStatusChange: (input: {
    active: boolean;
    reason: string;
  }) => Promise<void>;
}) {
  const [seriesOptions, setSeriesOptions] = useState(() =>
    cloneSeriesOptions(detail),
  );
  const [movieSources, setMovieSources] = useState(() =>
    cloneMovieSources(detail),
  );
  const [statusReason, setStatusReason] = useState("");
  const [showStatusAction, setShowStatusAction] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function buildSaveInput(): AdminContentSaveInput | null {
    if (detail.kind === "series") {
      const idError = validateEntryIds(seriesOptions);
      const mainError = validateMainEntry(seriesOptions);

      if (idError || mainError) {
        setLocalError(idError ?? mainError);
        return null;
      }

      if (seriesOptions.some((option) => !option.url.trim())) {
        setLocalError("Every series link entry needs a Telegram URL.");
        return null;
      }

      const normalizedUrls = seriesOptions.map((option) =>
        option.url.trim().toLowerCase(),
      );

      if (new Set(normalizedUrls).size !== normalizedUrls.length) {
        setLocalError("Series link URLs must be unique.");
        return null;
      }

      return {
        expectedRevision: detail.revision,
        expectedRevisionToken: detail.revisionToken,
        kind: "series",
        options: seriesOptions.map((option) => ({
          ...option,
          id: normalizeIdentifier(option.id),
          url: option.url.trim(),
        })),
      };
    }

    const idError = validateEntryIds(movieSources);
    const mainError = validateMainEntry(movieSources);

    if (idError || mainError) {
      setLocalError(idError ?? mainError);
      return null;
    }

    for (const source of movieSources) {
      const availableLinks = QUALITY_VALUES.map(
        (quality) => source.links[quality],
      ).filter((link): link is AdminContentMovieQualityLink => link !== null);

      if (availableLinks.length === 0) {
        setLocalError("Each movie source needs at least one quality link.");
        return null;
      }

      if (availableLinks.some((link) => !link.url.trim())) {
        setLocalError("Every enabled movie quality needs a Telegram URL.");
        return null;
      }
    }

    return {
      expectedRevision: detail.revision,
      expectedRevisionToken: detail.revisionToken,
      kind: "movie",
      sources: movieSources.map((source) => ({
        ...source,
        id: normalizeIdentifier(source.id),
        links: {
          "720p": source.links["720p"]
            ? {
                url: source.links["720p"].url.trim(),
                size: source.links["720p"].size?.trim() || null,
              }
            : null,
          "1080p": source.links["1080p"]
            ? {
                url: source.links["1080p"].url.trim(),
                size: source.links["1080p"].size?.trim() || null,
              }
            : null,
        },
      })),
    };
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    const input = buildSaveInput();

    if (input) {
      await onSave(input);
    }
  }

  async function handleStatusChange() {
    const reason = statusReason.trim();

    if (reason.length < 5) {
      setLocalError("Enter a short reason for this status change.");
      return;
    }

    setLocalError(null);
    await onStatusChange({
      active: !detail.active,
      reason,
    });
  }

  const tmdbUrl = `https://www.themoviedb.org/${
    detail.media.mediaType === "movie" ? "movie" : "tv"
  }/${detail.media.tmdbId}`;

  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/[0.075] bg-slate-900/45 shadow-xl shadow-black/[0.08]">
      <header className="relative overflow-hidden border-b border-white/[0.06]">
        {detail.media.backdropUrl ? (
          <img
            src={detail.media.backdropUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-15"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/65" />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
          {detail.media.posterUrl ? (
            <img
              src={detail.media.posterUrl}
              alt=""
              className="h-36 w-24 shrink-0 rounded-2xl object-cover shadow-xl shadow-black/30"
            />
          ) : (
            <span className="grid h-36 w-24 shrink-0 place-items-center rounded-2xl border border-white/[0.08] bg-slate-950/55 text-slate-600">
              <AdminIcon name="content" className="h-7 w-7" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] ${
                  detail.active
                    ? "border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-200"
                    : "border-slate-300/10 bg-slate-400/[0.06] text-slate-400"
                }`}
              >
                {detail.exists
                  ? detail.active
                    ? "Active"
                    : "Disabled"
                  : "New entry"}
              </span>
              <span className="rounded-full border border-white/[0.08] bg-slate-950/35 px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.12em] text-slate-400">
                {detail.media.mediaType === "movie" ? "Movie" : "TV series"}
              </span>
              <span className="text-xs font-bold text-slate-600">
                Revision {detail.revision}
              </span>
            </div>

            <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {detail.media.title}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-400">
              {detail.media.year} · TMDB {detail.media.tmdbId}
              {detail.media.rating > 0
                ? ` · ${detail.media.rating.toFixed(1)}/10`
                : ""}
            </p>
            <p className="mt-3 line-clamp-3 max-w-3xl text-sm leading-6 text-slate-500">
              {detail.media.overview}
            </p>
            <a
              href={tmdbUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-xs font-black text-sky-300 transition hover:text-sky-200"
            >
              Open canonical TMDB record
              <AdminIcon name="external" className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-5 p-5 sm:p-6">
        {localError ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-300/15 bg-red-400/[0.08] px-4 py-3 text-sm font-bold text-red-100"
          >
            <AdminIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{localError}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-sky-300">
              {detail.kind === "series" ? "Series links" : "Movie sources"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Only approved Telegram URLs are accepted. Internal importer and
              source-page metadata are never exposed here.
            </p>
          </div>
          <button
            type="button"
            disabled={
              isWorking ||
              (detail.kind === "series"
                ? seriesOptions.length >= 10
                : movieSources.length >= 8)
            }
            onClick={() => {
              setLocalError(null);
              if (detail.kind === "series") {
                setSeriesOptions((current) => [
                  ...current,
                  createSeriesOption(current.length + 1),
                ]);
              } else {
                setMovieSources((current) => [
                  ...current,
                  createMovieSource(current.length + 1),
                ]);
              }
            }}
            className="min-h-10 rounded-xl border border-sky-300/15 bg-sky-400/[0.06] px-4 text-xs font-black text-sky-200 transition hover:bg-sky-400/[0.1] disabled:opacity-40"
          >
            Add {detail.kind === "series" ? "link" : "source"}
          </button>
        </div>

        {detail.kind === "series" ? (
          <div className="space-y-3">
            {seriesOptions.map((option, index) => (
              <article
                key={`${index}-${option.id}`}
                className="rounded-2xl border border-white/[0.07] bg-slate-950/28 p-4"
              >
                <div className="grid gap-3 lg:grid-cols-[12rem_minmax(0,1fr)_auto]">
                  <label>
                    <span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.14em] text-slate-600">
                      Entry ID
                    </span>
                    <input
                      type="text"
                      value={option.id}
                      maxLength={64}
                      onChange={(event) =>
                        setSeriesOptions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, id: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/45 px-3 text-sm text-white outline-none focus:border-sky-300/35"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.14em] text-slate-600">
                      Telegram URL
                    </span>
                    <input
                      type="url"
                      value={option.url}
                      maxLength={2048}
                      placeholder="https://t.me/..."
                      onChange={(event) =>
                        setSeriesOptions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, url: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/45 px-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-sky-300/35"
                    />
                  </label>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      disabled={index === 0 || isWorking}
                      onClick={() =>
                        setSeriesOptions((current) =>
                          moveEntry(current, index, index - 1),
                        )
                      }
                      className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.08] text-sm font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-30"
                      aria-label={`Move series link ${index + 1} up`}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index >= seriesOptions.length - 1 || isWorking}
                      onClick={() =>
                        setSeriesOptions((current) =>
                          moveEntry(current, index, index + 1),
                        )
                      }
                      className="grid h-11 w-11 place-items-center rounded-xl border border-white/[0.08] text-sm font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-30"
                      aria-label={`Move series link ${index + 1} down`}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={seriesOptions.length <= 1 || isWorking}
                      onClick={() =>
                        setSeriesOptions((current) => {
                          const next = current.filter(
                            (_item, itemIndex) => itemIndex !== index,
                          );

                          return next.some((item) => item.isMain)
                            ? next
                            : updateMainSelection(next, 0);
                        })
                      }
                      className="grid h-11 w-11 place-items-center rounded-xl border border-red-300/10 text-red-200/70 transition hover:bg-red-400/[0.07] hover:text-red-100 disabled:opacity-30"
                      aria-label={`Remove series link ${index + 1}`}
                    >
                      <AdminIcon name="close" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-slate-400">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="series-main-link"
                      checked={option.isMain}
                      onChange={() =>
                        setSeriesOptions((current) =>
                          updateMainSelection(current, index),
                        )
                      }
                    />
                    Main link
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={option.active}
                      onChange={(event) => {
                        if (option.isMain && !event.target.checked) {
                          setLocalError(
                            "Choose another main link before disabling this entry.",
                          );
                          return;
                        }

                        setSeriesOptions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, active: event.target.checked }
                              : item,
                          ),
                        );
                      }}
                    />
                    Active
                  </label>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {movieSources.map((source, sourceIndex) => (
              <article
                key={`${sourceIndex}-${source.id}`}
                className="rounded-2xl border border-white/[0.07] bg-slate-950/28 p-4"
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <label className="min-w-0 flex-1 sm:max-w-xs">
                    <span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.14em] text-slate-600">
                      Source ID
                    </span>
                    <input
                      type="text"
                      value={source.id}
                      maxLength={64}
                      onChange={(event) =>
                        setMovieSources((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === sourceIndex
                              ? { ...item, id: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/45 px-3 text-sm text-white outline-none focus:border-sky-300/35"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-4 pb-2 text-xs font-bold text-slate-400">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="movie-main-source"
                        checked={source.isMain}
                        onChange={() =>
                          setMovieSources((current) =>
                            updateMainSelection(current, sourceIndex),
                          )
                        }
                      />
                      Main source
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={source.active}
                        onChange={(event) => {
                          if (source.isMain && !event.target.checked) {
                            setLocalError(
                              "Choose another main source before disabling this entry.",
                            );
                            return;
                          }

                          setMovieSources((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === sourceIndex
                                ? { ...item, active: event.target.checked }
                                : item,
                            ),
                          );
                        }}
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      disabled={sourceIndex === 0 || isWorking}
                      onClick={() =>
                        setMovieSources((current) =>
                          moveEntry(current, sourceIndex, sourceIndex - 1),
                        )
                      }
                      className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-30"
                      aria-label={`Move movie source ${sourceIndex + 1} up`}
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={
                        sourceIndex >= movieSources.length - 1 || isWorking
                      }
                      onClick={() =>
                        setMovieSources((current) =>
                          moveEntry(current, sourceIndex, sourceIndex + 1),
                        )
                      }
                      className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-30"
                      aria-label={`Move movie source ${sourceIndex + 1} down`}
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={movieSources.length <= 1 || isWorking}
                      onClick={() =>
                        setMovieSources((current) => {
                          const next = current.filter(
                            (_item, itemIndex) => itemIndex !== sourceIndex,
                          );

                          return next.some((item) => item.isMain)
                            ? next
                            : updateMainSelection(next, 0);
                        })
                      }
                      className="grid h-9 w-9 place-items-center rounded-xl border border-red-300/10 text-red-200/70 transition hover:bg-red-400/[0.07] hover:text-red-100 disabled:opacity-30"
                      aria-label={`Remove movie source ${sourceIndex + 1}`}
                    >
                      <AdminIcon name="close" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {QUALITY_VALUES.map((quality) => {
                    const link = source.links[quality];

                    return (
                      <div
                        key={quality}
                        className="rounded-2xl border border-white/[0.06] bg-slate-950/28 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-300">
                            {quality}
                          </p>
                          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                            <input
                              type="checkbox"
                              checked={link !== null}
                              onChange={(event) =>
                                setMovieSources((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === sourceIndex
                                      ? {
                                          ...item,
                                          links: {
                                            ...item.links,
                                            [quality]: event.target.checked
                                              ? getMovieQualityLink(
                                                  item,
                                                  quality,
                                                )
                                              : null,
                                          },
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                            Include
                          </label>
                        </div>

                        {link ? (
                          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                            <input
                              type="url"
                              value={link.url}
                              maxLength={2048}
                              placeholder="https://t.me/..."
                              aria-label={`${quality} Telegram URL`}
                              onChange={(event) =>
                                setMovieSources((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === sourceIndex
                                      ? {
                                          ...item,
                                          links: {
                                            ...item.links,
                                            [quality]: {
                                              ...getMovieQualityLink(
                                                item,
                                                quality,
                                              ),
                                              url: event.target.value,
                                            },
                                          },
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="min-h-11 rounded-xl border border-white/[0.08] bg-slate-950/45 px-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-sky-300/35"
                            />
                            <input
                              type="text"
                              value={link.size ?? ""}
                              maxLength={32}
                              placeholder="1.4 GB"
                              aria-label={`${quality} file size`}
                              onChange={(event) =>
                                setMovieSources((current) =>
                                  current.map((item, itemIndex) =>
                                    itemIndex === sourceIndex
                                      ? {
                                          ...item,
                                          links: {
                                            ...item.links,
                                            [quality]: {
                                              ...getMovieQualityLink(
                                                item,
                                                quality,
                                              ),
                                              size: event.target.value,
                                            },
                                          },
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="min-h-11 rounded-xl border border-white/[0.08] bg-slate-950/45 px-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-sky-300/35"
                            />
                          </div>
                        ) : (
                          <p className="mt-3 text-xs leading-5 text-slate-600">
                            This quality will not be exposed to the public site.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs leading-5 text-slate-600">
            Saving updates the bot-owned compatibility fields while preserving
            private movie source-page metadata when matching IDs still exist.
          </p>
          <button
            type="submit"
            disabled={isWorking}
            className="min-h-11 rounded-xl bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60"
          >
            {isWorking
              ? "Saving…"
              : detail.exists
                ? "Save content links"
                : "Create content entry"}
          </button>
        </div>
      </form>

      {detail.exists ? (
        <div className="border-t border-white/[0.06] bg-slate-950/18 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-600">
                Availability status
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {detail.active
                  ? "Public FilmGeezer links are enabled"
                  : "Public FilmGeezer links are disabled"}
              </p>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                Disabling keeps the data for review and rollback but removes it
                from the public link response. Permanent deletion is not part of
                this safe administration phase.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowStatusAction((current) => !current);
                setLocalError(null);
              }}
              disabled={isWorking}
              className={`min-h-10 rounded-xl border px-4 text-xs font-black transition disabled:opacity-50 ${
                detail.active
                  ? "border-red-300/12 bg-red-400/[0.055] text-red-100 hover:bg-red-400/[0.09]"
                  : "border-emerald-300/12 bg-emerald-400/[0.055] text-emerald-100 hover:bg-emerald-400/[0.09]"
              }`}
            >
              {detail.active ? "Disable entry" : "Activate entry"}
            </button>
          </div>

          {showStatusAction ? (
            <div className="mt-4 rounded-2xl border border-white/[0.07] bg-slate-950/35 p-4">
              <label>
                <span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.14em] text-slate-600">
                  Administrator reason
                </span>
                <textarea
                  value={statusReason}
                  onChange={(event) => setStatusReason(event.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder={
                    detail.active
                      ? "Why should these links be disabled?"
                      : "Why should these links be restored?"
                  }
                  className="w-full resize-y rounded-xl border border-white/[0.08] bg-slate-950/45 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-700 focus:border-sky-300/35"
                />
              </label>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusAction(false);
                    setStatusReason("");
                  }}
                  disabled={isWorking}
                  className="min-h-10 rounded-xl border border-white/[0.08] px-4 text-xs font-black text-slate-400 transition hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleStatusChange()}
                  disabled={isWorking || statusReason.trim().length < 5}
                  className={`min-h-10 rounded-xl px-4 text-xs font-black transition disabled:opacity-40 ${
                    detail.active
                      ? "bg-red-500 text-white hover:bg-red-400"
                      : "bg-emerald-500 text-white hover:bg-emerald-400"
                  }`}
                >
                  {isWorking
                    ? "Updating…"
                    : detail.active
                      ? "Confirm disable"
                      : "Confirm activation"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
