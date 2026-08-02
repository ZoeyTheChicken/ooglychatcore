import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useWs } from "@/contexts/WsContext";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Shield, ShieldAlert, Wifi, WifiOff, AlertTriangle, MessageCircle } from "lucide-react";
import { useGetOnlineUsers } from "@workspace/api-client-react";

function userInitials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

function avatarHue(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export function ChatLayout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin, isOwner } = useAuth();
  const [, setLocation] = useLocation();
  const { isConnected, connectionFailed } = useWs();

  const { data: onlineUsers } = useGetOnlineUsers({
    query: { refetchInterval: 30000, retry: false },
  });

  return (
    <div className="flex h-screen overflow-hidden oogly-app-shell text-foreground">
      <aside className="w-72 flex-shrink-0 border-r border-sidebar-border oogly-sidebar-glass flex flex-col">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shadow-inner">
              <MessageCircle className="w-5 h-5 text-primary" strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Oogly Chat
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium">Community · Live</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.14em]">
              Online
            </h2>
            <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground">
              {onlineUsers?.length ?? 0}
            </span>
          </div>
          <ul className="space-y-1">
            {onlineUsers?.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-sidebar-accent/40 transition-colors"
              >
                <span
                  className="w-8 h-8 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 text-primary-foreground"
                  style={{
                    background: `linear-gradient(135deg, hsl(${avatarHue(u.username)} 65% 45%), hsl(${avatarHue(u.username)} 55% 35%))`,
                  }}
                >
                  {userInitials(u.username)}
                </span>
                <span className="text-sm truncate font-medium">{u.username}</span>
                {u.isOwner && (
                  <span className="text-[9px] uppercase tracking-wide text-primary font-bold ml-auto px-1.5 py-0.5 rounded bg-primary/15">
                    Owner
                  </span>
                )}
                {u.isAdmin && !u.isOwner && (
                  <span className="text-[9px] uppercase tracking-wide text-accent font-bold ml-auto px-1.5 py-0.5 rounded bg-accent/15">
                    Admin
                  </span>
                )}
                {!u.isAdmin && !u.isOwner && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_hsl(152_70%_45%/0.8)] shrink-0" />
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 border-t border-sidebar-border flex flex-col gap-2.5 bg-sidebar/50">
          <div className="flex items-center gap-3 px-1 py-1">
            {user?.username && (
              <span
                className="w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 text-primary-foreground"
                style={{
                  background: `linear-gradient(135deg, hsl(${avatarHue(user.username)} 65% 48%), hsl(${avatarHue(user.username)} 55% 38%))`,
                }}
              >
                {userInitials(user.username)}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.username}</p>
              {isOwner && <p className="text-[11px] text-primary font-medium">Owner</p>}
              {isAdmin && !isOwner && <p className="text-[11px] text-accent font-medium">Admin</p>}
              {!isAdmin && !isOwner && <p className="text-[11px] text-muted-foreground">Member</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="rounded-lg border-sidebar-border" onClick={() => setLocation("/settings")} data-testid="nav-settings">
              <Settings className="w-4 h-4 mr-1.5" /> Settings
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg border-sidebar-border" onClick={logout} data-testid="nav-logout">
              <LogOut className="w-4 h-4 mr-1.5" /> Logout
            </Button>
          </div>

          {(isAdmin || isOwner) && (
            <Button variant="secondary" className="w-full rounded-lg" onClick={() => setLocation("/admin")} data-testid="nav-admin">
              <Shield className="w-4 h-4 mr-2" /> Admin Panel
            </Button>
          )}

          {user?.isMuted && (
            <Button variant="destructive" className="w-full rounded-lg" onClick={() => setLocation("/appeal")} data-testid="nav-appeal">
              <ShieldAlert className="w-4 h-4 mr-2" /> Appeal Mute
            </Button>
          )}

          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
              connectionFailed
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : isConnected
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400"
            }`}
          >
            {connectionFailed ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Connection failed — reload</span>
              </>
            ) : isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 shrink-0" />
                <span>Connected</span>
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span>Reconnecting…</span>
                <span className="ml-auto w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}
