import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Users, Ban, VolumeX, Mail, Megaphone, 
  FileText, MessageSquare, ArrowLeft, LogOut, Zap
} from "lucide-react";
import { useListAppeals } from "@workspace/api-client-react";

export function AdminLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  
  const { data: appealsData } = useListAppeals({ unread: true }, {
    query: { refetchInterval: 30000 }
  });
  
  const unreadAppeals = appealsData?.filter(a => !a.isRead)?.length || 0;

  const links = [
    { href: "/admin/stats", label: "Dashboard", icon: BarChart },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/bans", label: "Bans", icon: Ban },
    { href: "/admin/mutes", label: "Mutes", icon: VolumeX },
    { 
      href: "/admin/appeals", 
      label: "Appeals", 
      icon: Mail,
      badge: unreadAppeals > 0 ? unreadAppeals : null 
    },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/logs", label: "Audit Logs", icon: FileText },
    { href: "/admin/troll", label: "Troll Panel", icon: Zap },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Shield className="w-5 h-5" /> Admin Panel
          </h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = location === link.href;
            
            return (
              <Link key={link.href} href={link.href}>
                <span 
                  data-testid={`admin-nav-${link.label.toLowerCase()}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    active 
                      ? "bg-primary text-primary-foreground" 
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                  {link.badge !== undefined && link.badge !== null && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] py-0.5 px-2 rounded-full font-bold">
                      {link.badge}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border flex flex-col gap-2">
          <Link href="/">
            <Button variant="outline" className="w-full justify-start" data-testid="admin-nav-back">
              <MessageSquare className="w-4 h-4 mr-2" /> Back to Chat
            </Button>
          </Link>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-background p-6">
        {children}
      </div>
    </div>
  );
}

function Shield(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
    </svg>
  )
}
