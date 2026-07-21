import { createContext, useContext } from "react";

export interface ExternalNavigationRequest {
  url: string;
  destinationName: string;
}

export interface ExternalNavigationContextValue {
  requestExternalNavigation: (request: ExternalNavigationRequest) => void;
}

export const ExternalNavigationContext =
  createContext<ExternalNavigationContextValue | null>(null);

export function useExternalNavigation() {
  const context = useContext(ExternalNavigationContext);

  if (!context) {
    throw new Error(
      "useExternalNavigation must be used within ExternalNavigationProvider.",
    );
  }

  return context;
}
