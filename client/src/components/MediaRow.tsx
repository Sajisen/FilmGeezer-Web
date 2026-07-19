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

        <div className="flex gap-3 overflow-x-auto pb-2 sm:gap-4 lg:gap-5">
          {items.map((item) => (
            <div
              key={`${item.mediaType}-${item.tmdbId}`}
              className="w-[154px] min-w-[154px] flex-shrink-0 sm:w-[176px] sm:min-w-[176px] lg:w-[196px] lg:min-w-[196px]"
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
