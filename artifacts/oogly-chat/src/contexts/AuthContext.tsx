import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe, User } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isMuted: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("oogly_token"));
  const [localUser, setLocalUser] = useState<User | null>(null);

  const { data: serverUser, isLoading } = useGetMe({
    query: {
      enabled: !!token,
      refetchInterval: 10000,
      retry: false,
    },
  });

  const user = serverUser || localUser;
  
  useEffect(() => {
    if (!token) {
      setLocalUser(null);
    }
  }, [token]);

  const login = (newToken: string, userObj: User) => {
    localStorage.setItem("oogly_token", newToken);
    setToken(newToken);
    setLocalUser(userObj);
  };

  const logout = () => {
    localStorage.removeItem("oogly_token");
    setToken(null);
    setLocalUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading: !!token && isLoading && !localUser,
    isAdmin: user?.isAdmin ?? false,
    isOwner: user?.isOwner ?? false,
    isMuted: user?.isMuted ?? false,
    login,
    logout,
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
