import { useEffect, useState } from "react";
import ErrorState from "../components/states/ErrorState";
import LoadingState from "../components/states/LoadingState";
import {
  checkApiHealth,
  type HealthResponse,
} from "../services/healthService";

interface ApiHealthRequestState {
  requestKey: number;
  health: HealthResponse | null;
  errorMessage: string;
}

const initialRequestState: ApiHealthRequestState = {
  requestKey: -1,
  health: null,
  errorMessage: "",
};

function ApiTestPage() {
  const [reloadKey, setReloadKey] =
    useState(0);

  const [requestState, setRequestState] =
    useState<ApiHealthRequestState>(
      initialRequestState,
    );

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadApiHealth() {
      try {
        const health =
          await checkApiHealth(
            controller.signal,
          );

        if (controller.signal.aborted) {
          return;
        }

        setRequestState({
          requestKey: reloadKey,
          health,
          errorMessage: "",
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setRequestState({
          requestKey: reloadKey,
          health: null,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Something went wrong while checking the API.",
        });
      }
    }

    void loadApiHealth();

    return () => {
      controller.abort();
    };
  }, [reloadKey]);

  const requestMatchesCurrentCheck =
    requestState.requestKey === reloadKey;

  const isLoading =
    !requestMatchesCurrentCheck;

  const health = requestMatchesCurrentCheck
    ? requestState.health
    : null;

  const errorMessage =
    requestMatchesCurrentCheck
      ? requestState.errorMessage
      : "";

  function retryApiHealth() {
    setReloadKey(
      (currentKey) => currentKey + 1,
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
          API Test
        </p>

        <h1 className="text-4xl font-bold">
          Frontend to Backend Connection
        </h1>

        <p className="mt-4 max-w-2xl text-slate-300">
          This page checks whether the React
          frontend can successfully call the
          Express backend health endpoint.
        </p>

        <div className="mt-8">
          {isLoading && (
            <LoadingState
              title="Checking backend"
              message="Please wait while the frontend contacts the Express API."
            />
          )}

          {!isLoading && errorMessage && (
            <ErrorState
              message={errorMessage}
              onRetry={retryApiHealth}
            />
          )}

          {!isLoading &&
            !errorMessage &&
            health && (
              <div className="rounded-2xl border border-green-400/20 bg-green-500/10 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-green-300">
                  Connected
                </p>

                <h2 className="mt-3 text-2xl font-bold text-white">
                  Backend is running
                </h2>

                <div className="mt-5 rounded-xl bg-slate-900 p-4 font-mono text-sm text-green-300">
                  <p>
                    Status: {health.status}
                  </p>

                  <p>
                    Message: {health.message}
                  </p>
                </div>
              </div>
            )}
        </div>
      </section>
    </main>
  );
}

export default ApiTestPage;