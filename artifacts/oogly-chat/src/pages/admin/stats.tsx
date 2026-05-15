import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetAdminStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, MessageSquare, Ban, VolumeX, Mail, TrendingUp, Heart, ShieldCheck, Wifi, BarChart3 } from "lucide-react";

export default function AdminStats() {
  const { data: stats, isLoading } = useGetAdminStats({
    query: { refetchInterval: 30000 }
  });

  if (isLoading) return <AdminLayout><div className="p-8 text-muted-foreground">Loading stats…</div></AdminLayout>;

  const msgGrowth = stats?.messagesLast7d && stats?.messagesLast24h
    ? ((stats.messagesLast24h / (stats.messagesLast7d / 7)) * 100 - 100).toFixed(0)
    : null;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and live metrics.</p>
        </div>

        {/* Primary metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={Users}
            trend={`+${stats?.newUsersLast24h ?? 0} today`}
            trendPositive
          />
          <StatCard
            title="Total Messages"
            value={stats?.totalMessages ?? 0}
            icon={MessageSquare}
            trend={`+${stats?.messagesLast24h ?? 0} today`}
            trendPositive
          />
          <StatCard
            title="Total Reactions"
            value={(stats as any)?.totalReactions ?? 0}
            icon={Heart}
          />
          <StatCard
            title="Online Now"
            value={(stats as any)?.onlineNow ?? 0}
            icon={Wifi}
            accent="green"
          />
        </div>

        {/* Secondary metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Bans"
            value={stats?.activeBans ?? 0}
            icon={Ban}
            sub={`${(stats as any)?.bannedPercent ?? 0}% of users`}
            accent="red"
          />
          <StatCard
            title="Active Mutes"
            value={stats?.activeMutes ?? 0}
            icon={VolumeX}
            sub={`${(stats as any)?.mutedPercent ?? 0}% of users`}
            accent="orange"
          />
          <StatCard
            title="Pending Appeals"
            value={stats?.pendingAppeals ?? 0}
            icon={Mail}
            accent={stats?.pendingAppeals ? "blue" : undefined}
          />
          <StatCard
            title="Admin Staff"
            value={(stats as any)?.totalAdmins ?? 0}
            icon={ShieldCheck}
          />
        </div>

        {/* Activity summary */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Message Activity
              </CardTitle>
              <CardDescription>Message volume over time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ActivityRow label="Last 24 hours" value={stats?.messagesLast24h ?? 0} max={Math.max(stats?.messagesLast24h ?? 1, (stats as any)?.messagesLast7d ?? 1)} color="bg-primary" />
              <ActivityRow label="Last 7 days" value={(stats as any)?.messagesLast7d ?? 0} max={Math.max(stats?.messagesLast24h ?? 1, (stats as any)?.messagesLast7d ?? 1)} color="bg-primary/50" />
              <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t">
                <span>Avg/user: <strong className="text-foreground">{(stats as any)?.avgMsgsPerUser ?? 0}</strong> msgs</span>
                {msgGrowth !== null && (
                  <span className={Number(msgGrowth) >= 0 ? "text-green-400" : "text-red-400"}>
                    {Number(msgGrowth) >= 0 ? "▲" : "▼"} {Math.abs(Number(msgGrowth))}% vs daily avg
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Community Health
              </CardTitle>
              <CardDescription>Moderation vs engagement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <HealthRow
                label="Banned users"
                value={(stats as any)?.bannedPercent ?? 0}
                color="bg-destructive"
                description={`${stats?.activeBans ?? 0} active bans`}
              />
              <HealthRow
                label="Muted users"
                value={(stats as any)?.mutedPercent ?? 0}
                color="bg-orange-500"
                description={`${stats?.activeMutes ?? 0} active mutes`}
              />
              <HealthRow
                label="Pending appeals"
                value={stats?.totalUsers ? Math.round(((stats.pendingAppeals ?? 0) / stats.totalUsers) * 1000) / 10 : 0}
                color="bg-blue-500"
                description={`${stats?.pendingAppeals ?? 0} unresolved`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendPositive, sub, accent }: {
  title: string;
  value: number;
  icon: any;
  trend?: string;
  trendPositive?: boolean;
  sub?: string;
  accent?: "red" | "orange" | "blue" | "green";
}) {
  const accentClass = {
    red: "text-destructive border-destructive/20",
    orange: "text-orange-500 border-orange-500/20",
    blue: "text-primary border-primary/50",
    green: "text-green-400 border-green-500/20",
  }[accent ?? ""] ?? "";

  return (
    <Card className={accentClass}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${accentClass ? accentClass.split(" ")[0] : ""}`}>{value.toLocaleString()}</div>
        {trend && <p className={`text-xs mt-1 ${trendPositive ? "text-green-400" : "text-muted-foreground"}`}>{trend}</p>}
        {sub && <p className="text-xs mt-1 text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ActivityRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HealthRow({ label, value, color, description }: { label: string; value: number; color: string; description: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}
