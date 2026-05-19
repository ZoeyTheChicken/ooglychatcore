// contexts/AuthContext.tsx (updated)
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
  checkBanStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("oogly_token"));
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [banInfo, setBanInfo] = useState<{ reason: string; expiresAt: string | null } | null>(() => {
    const stored = localStorage.getItem("banInfo");
    return stored ? JSON.parse(stored) : null;
  });

  const { data: serverUser, isLoading, error, refetch } = useGetMe({
    query: {
      enabled: !!token,
      refetchInterval: 10000,
      retry: false,
    },
  });

  const user = serverUser || localUser;
  
  // Handle ban errors from API
  useEffect(() => {
    if (error) {
      console.log("Auth error:", error);
      // Check if it's a ban response
      const axiosError = error as any;
      if (axiosError?.response?.status === 403 && axiosError?.response?.data?.banned) {
        const banData = axiosError.response.data;
        const banInfoData = {
          reason: banData.reason || "No reason provided",
          expiresAt: banData.expiresAt || null,
        };
        console.log("Setting ban info:", banInfoData);
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
    clearBanInfo();
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

  const checkBanStatus = async () => {
    if (!token) return;
    try {
      await refetch();
    } catch (err: any) {
      if (err?.response?.status === 403 && err?.response?.data?.banned) {
        const banData = err.response.data;
        const banInfoData = {
          reason: banData.reason || "No reason provided",
          expiresAt: banData.expiresAt || null,
        };
        setBanInfo(banInfoData);
        localStorage.setItem("banInfo", JSON.stringify(banInfoData));
        setToken(null);
        localStorage.removeItem("oogly_token");
      }
    }
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
    checkBanStatus,
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
