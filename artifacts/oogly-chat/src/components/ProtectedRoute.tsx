// components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isBanned } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isBanned) {
    return <Navigate to="/banned" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
