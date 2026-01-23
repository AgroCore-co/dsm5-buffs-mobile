import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login as loginService, refreshToken as refreshService } from "../services/authService";
import userService from "../services/userService";

interface AuthContextData {
  userToken: string | null;
  user: any | null;
  loading: boolean;          // loader inicial
  authenticating: boolean;   // loader do botão login
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);

  const refreshAccessToken = async () => {
    const refreshTokenStored = await AsyncStorage.getItem("refreshToken");
    if (!refreshTokenStored) throw new Error("Sem refresh token");

    const res = await refreshService(refreshTokenStored);

    if (!res.access_token) throw new Error("Falha ao renovar token");

    await AsyncStorage.setItem("userToken", res.access_token);
    if (res.refresh_token) await AsyncStorage.setItem("refreshToken", res.refresh_token);
    if (res.expires_at) await AsyncStorage.setItem("expiresAt", res.expires_at.toString());

    setUserToken(res.access_token);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const expiresAtStr = await AsyncStorage.getItem("expiresAt");
        const now = Date.now();

        let expiresAt = 0;
        if (expiresAtStr) {
          const parsed = parseInt(expiresAtStr, 10);
          if (!isNaN(parsed)) expiresAt = parsed * 1000;
        }

        if (expiresAt > now) {
          try {
            await refreshAccessToken();
          } catch (err) {
            console.warn("Refresh token falhou:", err);
          }
        } else {
          await AsyncStorage.multiRemove(["userToken", "refreshToken", "expiresAt", "user"]);
          setUserToken(null);
          setUser(null);
        }

        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          try {
            setUser(JSON.parse(userStr));
          } catch {
            setUser(null);
          }
        }
      } catch (err) {
        console.warn("Erro na inicialização do AuthContext:", err);
        await AsyncStorage.multiRemove(["userToken", "refreshToken", "expiresAt", "user"]);
        setUserToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const login = async (email: string, password: string) => {
    setAuthenticating(true);
    try {
      const res = await loginService(email, password);

      await AsyncStorage.setItem("userToken", res.access_token);
      await AsyncStorage.setItem("refreshToken", res.refresh_token);
      await AsyncStorage.setItem("expiresAt", res.expires_at.toString());
      setUserToken(res.access_token);

      const { hasProfile, profile: userProfile } = await userService.checkUserProfile();
      if (!hasProfile || !userProfile) throw new Error("Falha ao carregar o perfil do usuário após o login.");

      await AsyncStorage.setItem("user", JSON.stringify(userProfile));
      setUser(userProfile);
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || err?.message || "Erro ao tentar entrar.");
    } finally {
      setAuthenticating(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(["userToken", "refreshToken", "expiresAt", "user"]);
    setUserToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ userToken, user, loading, authenticating, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
