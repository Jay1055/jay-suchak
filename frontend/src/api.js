export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`The SuchnaSetu API returned an unexpected response (HTTP ${response.status}). Check that its backend is running.`);
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed. Please try again.");
  return data;
}