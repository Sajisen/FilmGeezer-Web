import type { MediaItem } from "../types/media";
import type {
  RecommendationBasis,
  RecommendationCategory,
} from "../types/recommendations";
import { getRecommendationDescription } from "../utils/recommendations";
import MediaRow from "./MediaRow";

const TITLES: Record<RecommendationCategory, string> = {
  movie: "Recommended movies",
  tv: "Recommended TV series",
  anime: "Recommended anime",
  kdrama: "Recommended K-dramas",
};

interface PersonalRecommendationsRowProps {
  category: RecommendationCategory;
  basis: RecommendationBasis;
  items: MediaItem[];
  contentClassName?: string;
}

function PersonalRecommendationsRow({
  category,
  basis,
  items,
  contentClassName,
}: PersonalRecommendationsRowProps) {
  return (
    <MediaRow
      title={TITLES[category]}
      description={getRecommendationDescription(basis)}
      items={items}
      contentClassName={contentClassName}
    />
  );
}

export default PersonalRecommendationsRow;
