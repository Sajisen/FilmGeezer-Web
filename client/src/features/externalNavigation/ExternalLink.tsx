import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useExternalNavigation } from "./externalNavigationContext";

interface ExternalLinkProps
  extends Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "href" | "target" | "rel" | "onClick"
  > {
  href: string;
  destinationName: string;
  children: ReactNode;
}

function ExternalLink({
  href,
  destinationName,
  children,
  ...anchorProps
}: ExternalLinkProps) {
  const { requestExternalNavigation } = useExternalNavigation();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const destinationUrl = new URL(href, window.location.href);

    if (destinationUrl.origin === window.location.origin) {
      return;
    }

    event.preventDefault();

    requestExternalNavigation({
      url: href,
      destinationName,
    });
  }

  return (
    <a
      {...anchorProps}
      href={href}
      aria-haspopup="dialog"
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

export default ExternalLink;
