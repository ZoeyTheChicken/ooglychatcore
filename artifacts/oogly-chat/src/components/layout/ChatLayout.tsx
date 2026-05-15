import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useWs } from "@/contexts/WsContext";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Shield, ShieldAlert, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { useGetOnlineUsers } from "@workspace/api-client-react";

export function ChatLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin, isOwner } = useAuth();
  const [, setLocation] = useLocation();
  const { isConnected, connectionFailed } = useWs();

  const { data: onlineUsers } = useGetOnlineUsers({
    query: { refetchInterval: 30000, retry: false }
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary tracking-tight">Oogly Chat</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Online — {onlineUsers?.length || 0}
          </h2>
          <ul className="space-y-1.5">
            {onlineUsers?.map((u) => (
              <li key={u.id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
                <span className="text-sm truncate">{u.username}</span>
                {(u.isOwner) && <span className="text-[10px] text-primary font-semibold ml-auto">Owner</span>}
                {(u.isAdmin && !u.isOwner) && <span className="text-[10px] text-primary/70 font-semibold ml-auto">Admin</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border-t border-border flex flex-col gap-2">
          <div className="flex items-center gap-3 mb-2 px-1">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              {isOwner && <p className="text-xs text-primary">Owner</p>}
              {isAdmin && !isOwner && <p className="text-xs text-primary">Admin</p>}
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
            <Button variant="secondary" className="w-full" onClick={() => setLocation("/admin")} data-testid="nav-admin">
              <Shield className="w-4 h-4 mr-2" /> Admin Panel
            </Button>
          )}

          {user?.isMuted && (
            <Button variant="destructive" className="w-full" onClick={() => setLocation("/appeal")} data-testid="nav-appeal">
              <ShieldAlert className="w-4 h-4 mr-2" /> Appeal Mute
            </Button>
          )}

          {/* Connection Status Pill */}
          <div
            className={`mt-1 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all border ${
              connectionFailed
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : isConnected
                ? "bg-green-500/10 border-green-500/20 text-green-400"
                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
            }`}
          >
            {connectionFailed ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Connection failed — please reload</span>
              </>
            ) : isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 shrink-0" />
                <span>Live</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span>Reconnecting…</span>
                <span className="ml-auto w-3 h-3 rounded-full border border-yellow-400 border-t-transparent animate-spin" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}
