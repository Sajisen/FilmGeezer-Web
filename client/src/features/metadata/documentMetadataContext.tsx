import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type DocumentStructuredData = {
  id: string;
  value: Record<string, unknown>;
};

export type DocumentMetadataOverride = {
  key: string;
  pathname: string;
  title: string;
  description: string;
  indexable: boolean;
  canonicalPath: string | null;
  imageUrl?: string;
  imageAlt?: string;
  twitterCard?: "summary" | "summary_large_image";
  structuredData?: DocumentStructuredData;
};

type DocumentMetadataContextValue = {
  metadataOverride: DocumentMetadataOverride | null;
  setMetadataOverride: Dispatch<
    SetStateAction<DocumentMetadataOverride | null>
  >;
};

const DocumentMetadataContext =
  createContext<DocumentMetadataContextValue | null>(null);

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

export function useDocumentMetadataContext(): DocumentMetadataContextValue {
  const context = useContext(DocumentMetadataContext);

  if (!context) {
    throw new Error(
      "Document metadata hooks must be used inside DocumentMetadataProvider.",
    );
  }

  return context;
}

export function useDocumentMetadataOverride(
  metadata: DocumentMetadataOverride | null,
): void {
  const { setMetadataOverride } = useDocumentMetadataContext();

  useEffect(() => {
    if (!metadata) {
      return;
    }

    setMetadataOverride(metadata);

    return () => {
      setMetadataOverride((currentMetadata) =>
        currentMetadata?.key === metadata.key ? null : currentMetadata,
      );
    };
  }, [metadata, setMetadataOverride]);
}
