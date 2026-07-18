import MediaCard from "./MediaCard";
import type { MediaItem } from "../types/media";
import ContentContainer from "./layout/ContentContainer";

interface MediaRowProps {
  title: string;
  description?: string;
  items: MediaItem[];
}

function MediaRow({ title, description, items }: MediaRowProps) {
  return (
    <section className="py-8">
      <ContentContainer>
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-white">{title}</h2>

          {description && (
            <p className="mt-1 text-sm text-slate-400">{description}</p>
          )}
        </div>

        <div className="flex gap-5 overflow-x-auto pb-2">
          {items.map((item) => (
            <div
              key={`${item.mediaType}-${item.tmdbId}`}
              className="w-[240px] min-w-[240px] flex-shrink-0"
            >
              <MediaCard item={item} />
            </div>
          ))}
        </div>
      </ContentContainer>
    </section>
  );
}

export default MediaRow;
