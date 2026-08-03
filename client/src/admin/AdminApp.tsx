import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router";

import { getAdminRouterBasename } from "./adminRuntime";
import { AdminAuthProvider } from "./auth/AdminAuthProvider";
import { useAdminAuth } from "./auth/adminAuthContext";
import AdminShell from "./components/AdminShell";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import AdminSupportPage from "./pages/AdminSupportPage";
import AdminPlaceholderPage from "./pages/AdminPlaceholderPage";

function AdminBootstrapScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl border border-sky-300/20 bg-sky-400/10" />
        <p className="mt-4 text-sm font-bold text-slate-400">
          Checking administrator access…
        </p>
      </div>
    </main>
  );
}

function ProtectedAdminRoutes() {
  const { status } = useAdminAuth();

  if (status === "bootstrapping") {
    return <AdminBootstrapScreen />;
  }

  if (status !== "authenticated") {
    return <AdminLoginPage />;
  }

  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<AdminOverviewPage />} />
        <Route path="support" element={<AdminSupportPage />} />
        <Route
          path="users"
          element={
            <AdminPlaceholderPage
              eyebrow="Account administration"
              title="Users"
              description="Account search and safe administrative controls belong here after the support inbox is complete."
              nextStep="Add paginated lookup, account state, role visibility, session review, suspension safeguards, and protected audit trails."
            />
          }
        />
        <Route
          path="content"
          element={
            <AdminPlaceholderPage
              eyebrow="Catalog operations"
              title="Content"
              description="This area will later manage FilmGeezer-owned provider links and content-quality reports without exposing the Telegram bot database directly to React."
              nextStep="Add read/write APIs with validation, revision protection, and complete administrator audit events."
            />
          }
        />
        <Route
          path="audit"
          element={
            <AdminPlaceholderPage
              eyebrow="Security records"
              title="Audit"
              description="Administrator sign-ins, role changes, and session revocations are already being recorded in MongoDB."
              nextStep="Add a read-only, paginated audit viewer with safe filtering and no sensitive token or secret exposure."
            />
          }
        />
        <Route
          path="settings"
          element={
            <AdminPlaceholderPage
              eyebrow="Administration configuration"
              title="Settings"
              description="Sensitive operational settings should remain small, explicit, and protected by recent authentication."
              nextStep="Add MFA enrollment, administrator session management, and production-domain readiness checks before launch."
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function AdminApp() {
  return (
    <BrowserRouter basename={getAdminRouterBasename()}>
      <AdminAuthProvider>
        <ProtectedAdminRoutes />
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
