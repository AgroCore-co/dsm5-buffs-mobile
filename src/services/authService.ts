import { apiFetch } from "../lib/apiClient";

// Login
export const login = async (email: string, password: string) => {
  return apiFetch("/auth/signin", {
    method: "POST",
    body: { email, password },
  });
};

// Refresh token
export const refreshToken = async (refresh_token: string) => {
  return apiFetch("/auth/refresh", {
    method: "POST",
    body: { refresh_token },
  });
};

// Perfil do usuário
export const checkProfile = async (token: string) => {
  return apiFetch("/usuarios/perfil", { method: "GET" });
};

export const getMe = async (token: string) => {
  return apiFetch("/usuarios/me", { method: "GET" });
};
