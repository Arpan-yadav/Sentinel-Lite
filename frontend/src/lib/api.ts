import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("sentinel_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach per-user custom AI provider configuration if present in localStorage
  if (typeof window !== "undefined") {
    const customProvider = localStorage.getItem("sentinellite_ai_provider");
    const customKey = localStorage.getItem("sentinellite_ai_key");
    const customModel = localStorage.getItem("sentinellite_ai_model");

    if (customProvider) config.headers["X-AI-Provider"] = customProvider;
    if (customKey) config.headers["X-AI-Key"] = customKey;
    if (customModel) config.headers["X-AI-Model"] = customModel;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      Cookies.remove("sentinel_token");
      if (!window.location.pathname.startsWith("/login")) {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

