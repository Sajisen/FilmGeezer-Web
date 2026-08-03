import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";
import { shouldRenderAdminApp } from "./admin/adminRuntime";

function renderApplication(application: ReactNode): void {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>{application}</StrictMode>,
  );
}

async function bootstrap(): Promise<void> {
  if (shouldRenderAdminApp()) {
    const { default: AdminApp } = await import("./admin/AdminApp");
    renderApplication(<AdminApp />);
    return;
  }

  const [
    { default: App },
    { ExternalNavigationProvider },
    { PlannedFeatureProvider },
  ] = await Promise.all([
    import("./App.tsx"),
    import("./features/externalNavigation/ExternalNavigationProvider.tsx"),
    import("./features/plannedFeature/PlannedFeatureProvider.tsx"),
  ]);

  renderApplication(
    <PlannedFeatureProvider>
      <ExternalNavigationProvider>
        <App />
      </ExternalNavigationProvider>
    </PlannedFeatureProvider>,
  );
}

void bootstrap();