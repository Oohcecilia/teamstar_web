const API_URL = import.meta.env.VITE_API_URL;

export async function apiRequest(
  endpoint,
  { method = "GET", body, headers = {}, requireAuth = true } = {}
) {
  try {
    // -------------------------
    // 1. OFFLINE CHECK
    // -------------------------
    if (!navigator.onLine) {
      throw new Error("OFFLINE");
    }

    // -------------------------
    // 2. BUILD HEADERS
    // -------------------------
    const token = localStorage.getItem("token");

    const finalHeaders = {
      "Content-Type": "application/json",
      ...headers,
    };

    // attach JWT automatically
    if (requireAuth && token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    // -------------------------
    // 3. REQUEST
    // -------------------------
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "API request failed");
    }

    return data;
  } catch (err) {
    // -------------------------
    // 4. OFFLINE FALLBACK HOOK
    // -------------------------
    if (err.message === "OFFLINE") {
      return {
        success: false,
        offline: true,
        error: "No internet connection",
      };
    }

    throw err;
  }
}