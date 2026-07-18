export interface HealthResponse {
  status: string;
  message: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function checkApiHealth(
  signal?: AbortSignal,
): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    signal,
  });

  if (!response.ok) {
    throw new Error("Backend health check failed.");
  }

  return response.json();
}
