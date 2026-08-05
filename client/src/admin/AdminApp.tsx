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
import AdminMfaEnrollmentPage from "./pages/AdminMfaEnrollmentPage";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import AdminSecurityPage from "./pages/AdminSecurityPage";
import AdminSupportPage from "./pages/AdminSupportPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminPlaceholderPage from "./pages/AdminPlaceholderPage";

function AdminBootstrapScreen() {
  return (
    <main className="admin-app-background grid min-h-screen place-items-center px-4 text-white">
      <div className="rounded-[1.75rem] border border-white/[0.08] bg-slate-900/55 px-8 py-7 text-center shadow-2xl shadow-black/20 backdrop-blur-xl">
        <span className="mx-auto grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-sky-300/20 bg-sky-400/10 shadow-lg shadow-sky-950/30">
          <img
            src="/filmgeezer-logo7.png"
            alt=""
            className="h-full w-full object-cover"
          />
        </span>
        <p className="mt-4 text-[0.64rem] font-black uppercase tracking-[0.2em] text-sky-300">
          FilmGeezer administration
        </p>
        <p className="mt-2 text-sm font-bold text-slate-400">
          Checking administrator access…
        </p>
        <span className="mx-auto mt-4 block h-1 w-28 overflow-hidden rounded-full bg-slate-950/70">
          <span className="block h-full w-1/2 animate-pulse rounded-full bg-sky-400" />
        </span>
      </div>
    </main>
  );
}

function ProtectedAdminRoutes() {
  const { status } = useAdminAuth();

  if (status === "bootstrapping") {
    return <AdminBootstrapScreen />;
  }

  if (status === "mfa-enrollment") {
    return <AdminMfaEnrollmentPage />;
  }

  if (status !== "authenticated") {
    return <AdminLoginPage />;
  }

  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<AdminOverviewPage />} />
        <Route path="support" element={<AdminSupportPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route
          path="content"
          element={
            <AdminPlaceholderPage
              eyebrow="Catalog operations"
              title="Content"
              description="Review and manage FilmGeezer-owned provider links without exposing internal content databases directly to React."
              nextStep="Add TMDB title lookup, validated link editing and ordering, revision protection, recent-authentication gates, canonical media identity checks, safe external-link rules, and complete administrator audit events."
            />
          }
        />
        <Route
          path="audit"
          element={
            <AdminPlaceholderPage
              eyebrow="Security records"
              title="Audit"
              description="Administrator sign-ins, passkey and MFA activity, support actions, role changes, and session revocations are already recorded securely."
              nextStep="Add a read-only, paginated audit viewer with actor, event, target, and date filters while excluding tokens, challenges, credential material, secrets, recovery codes, and sensitive request content."
            />
          }
        />
        <Route path="settings" element={<AdminSecurityPage />} />
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
