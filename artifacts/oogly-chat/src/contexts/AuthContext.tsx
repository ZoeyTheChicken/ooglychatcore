import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe, User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isMuted: boolean;
  isBanned: boolean;
  banInfo: { reason: string; expiresAt: string | null } | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  clearBanInfo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("oogly_token"));
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [banInfo, setBanInfo] = useState<{ reason: string; expiresAt: string | null } | null>(() => {
    const stored = localStorage.getItem("banInfo");
    return stored ? JSON.parse(stored) : null;
  });

  const { data: serverUser, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      refetchInterval: 10000,
      retry: false,
    },
  });

  const user = serverUser || localUser;
  
  // Handle ban errors from API
  useEffect(() => {
    if (error && (error as any)?.response?.status === 403) {
      const banData = (error as any)?.response?.data;
      if (banData?.banned) {
        const banInfoData = {
          reason: banData.reason,
          expiresAt: banData.expiresAt || null,
        };
        setBanInfo(banInfoData);
        localStorage.setItem("banInfo", JSON.stringify(banInfoData));
        setToken(null);
        localStorage.removeItem("oogly_token");
      }
    }
  }, [error]);

  useEffect(() => {
    if (!token) {
      setLocalUser(null);
    }
  }, [token]);

  const login = (newToken: string, userObj: User) => {
    localStorage.setItem("oogly_token", newToken);
    setToken(newToken);
    setLocalUser(userObj);
    clearBanInfo(); // Clear any stored ban info on successful login
  };

  const logout = () => {
    localStorage.removeItem("oogly_token");
    setToken(null);
    setLocalUser(null);
    clearBanInfo();
  };

  const clearBanInfo = () => {
    setBanInfo(null);
    localStorage.removeItem("banInfo");
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading: !!token && isLoading && !localUser,
    isAdmin: user?.isAdmin ?? false,
    isOwner: user?.isOwner ?? false,
    isMuted: user?.isMuted ?? false,
    isBanned: !!banInfo,
    banInfo,
    login,
    logout,
    clearBanInfo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
