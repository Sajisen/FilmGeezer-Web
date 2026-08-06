import { useMemo } from "react";

import { usePersonalRecommendations } from "../../hooks/usePersonalRecommendations";
import type { MediaItem } from "../../types/media";
import type { RecommendationCategory } from "../../types/recommendations";
import {
  excludeMediaItems,
  getRecommendationDescription,
} from "../../utils/recommendations";
import MediaRow from "../MediaRow";

const DETAILS_CONTENT_CLASS = "mx-auto w-full max-w-[1180px]";
const DETAILS_ROW_LIMIT = 20;

interface YouMayAlsoLikeSectionProps {
  category: RecommendationCategory;
  currentItem: MediaItem;
  excludedItems: MediaItem[];
  isRelatedSectionReady: boolean;
}

function YouMayAlsoLikeSection({
  category,
  currentItem,
  excludedItems,
  isRelatedSectionReady,
}: YouMayAlsoLikeSectionProps) {
  const recommendations = usePersonalRecommendations(category);

  const items = useMemo(
    () =>
      excludeMediaItems(recommendations.items, [
        currentItem,
        ...excludedItems,
      ]).slice(0, DETAILS_ROW_LIMIT),
    [currentItem, excludedItems, recommendations.items],
  );

  if (
    !isRelatedSectionReady ||
    !recommendations.available ||
    !recommendations.basis ||
    items.length < recommendations.minimumResults
  ) {
    return null;
  }

  return (
    <div id="you-may-also-like" className="scroll-mt-24">
      <MediaRow
        title="You may also like"
        description={getRecommendationDescription(recommendations.basis)}
        items={items}
        contentClassName={DETAILS_CONTENT_CLASS}
      />
    </div>
  );
}

export default YouMayAlsoLikeSection;
