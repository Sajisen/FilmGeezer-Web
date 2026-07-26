import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ExternalNavigationProvider } from "./features/externalNavigation/ExternalNavigationProvider.tsx";
import { PlannedFeatureProvider } from "./features/plannedFeature/PlannedFeatureProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlannedFeatureProvider>
      <ExternalNavigationProvider>
        <App />
      </ExternalNavigationProvider>
    </PlannedFeatureProvider>
  </StrictMode>,
);