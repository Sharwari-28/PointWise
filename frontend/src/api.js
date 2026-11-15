import axios from "axios";

// Laptop: http://localhost:8081/api. Phone on your Wi-Fi: uses the laptop's address automatically.
// After deployment, set VITE_API_URL to the real backend address.
const API_URL =
  import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8081/api`;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pw_token");
  const isPublic = config.url?.startsWith("/public") || config.url === "/auth/login";
  if (token && !isPublic) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    const isPublic = url.startsWith("/public") || url === "/auth/login";
    if (err.response?.status === 401 && !isPublic) {
      localStorage.removeItem("pw_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;