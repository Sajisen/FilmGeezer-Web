import type { ReactNode } from "react";
import ContentContainer from "../layout/ContentContainer";

interface MediaDetailsContainerProps {
  children: ReactNode;
  className?: string;
}

function MediaDetailsContainer({
  children,
  className = "",
}: MediaDetailsContainerProps) {
  return (
    <ContentContainer>
      <div className={`mx-auto w-full max-w-[1180px] ${className}`}>
        {children}
      </div>
    </ContentContainer>
  );
}

export default MediaDetailsContainer;
