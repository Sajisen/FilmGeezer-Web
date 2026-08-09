import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DocumentMetadataContext,
  type DocumentMetadataContextValue,
  type DocumentMetadataOverride,
} from "./documentMetadataState";

export function DocumentMetadataProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [metadataOverride, setMetadataOverride] =
    useState<DocumentMetadataOverride | null>(null);

  const value = useMemo<DocumentMetadataContextValue>(
    () => ({
      metadataOverride,
      setMetadataOverride,
    }),
    [metadataOverride],
  );

  return (
    <DocumentMetadataContext.Provider value={value}>
      {children}
    </DocumentMetadataContext.Provider>
  );
}
