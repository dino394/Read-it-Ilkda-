import { apiRequest } from "./client";

interface AuthUser {
  id: string;
  email: string;
  created_at?: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
}

interface SignupResponse {
  success: boolean;
  message: string;
  user: AuthUser;
}

export async function login(
  email: string,
  password: string
) {
  const data =
    await apiRequest<LoginResponse>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

  localStorage.setItem(
    "read-it-token",
    data.token
  );

  return data;
}

export async function signup(
  email: string,
  password: string
) {
  const data =
    await apiRequest<SignupResponse>(
      "/api/auth/signup",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

  return data;
}

export async function getMe() {
  return apiRequest<{
    success: boolean;
    user: AuthUser;
  }>("/api/auth/me");
}

export function logout() {
  localStorage.removeItem("read-it-token");
}