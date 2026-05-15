import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, ShieldAlert, Shield } from "lucide-react";
import { useGetOnlineUsers } from "@workspace/api-client-react";

export function ChatLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin, isOwner } = useAuth();
  const [, setLocation] = useLocation();

  const { data: onlineUsers } = useGetOnlineUsers({
    query: {
      refetchInterval: 30000,
    }
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar / Left Column */}
      <div className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary tracking-tight">Oogly Chat</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Online — {onlineUsers?.users?.length || 0}</h2>
          <ul className="space-y-2">
            {onlineUsers?.users?.map((u) => (
              <li key={u.id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-sm truncate">{u.username}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border-t border-border flex flex-col gap-2">
          <div className="flex items-center gap-3 mb-2 px-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              {(isAdmin || isOwner) && (
                <p className="text-xs text-primary">Moderator</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/settings")} data-testid="nav-settings">
              <Settings className="w-4 h-4 mr-2" /> Settings
            </Button>
            <Button variant="outline" size="sm" onClick={logout} data-testid="nav-logout">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>

          {(isAdmin || isOwner) && (
            <Button variant="secondary" className="w-full mt-2" onClick={() => setLocation("/admin")} data-testid="nav-admin">
              <Shield className="w-4 h-4 mr-2" /> Admin Panel
            </Button>
          )}

          {user?.isMuted && (
            <Button variant="destructive" className="w-full mt-2" onClick={() => setLocation("/appeal")} data-testid="nav-appeal">
              <ShieldAlert className="w-4 h-4 mr-2" /> Appeal Mute
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}
