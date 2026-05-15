import { AdminLayout } from "@/components/layout/AdminLayout";
import { useGetAdminStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Ban, VolumeX, Mail, TrendingUp } from "lucide-react";

export default function AdminStats() {
  const { data: stats, isLoading } = useGetAdminStats({
    query: { refetchInterval: 30000 }
  });

  if (isLoading) return <AdminLayout><div className="p-8">Loading stats...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and moderation statistics.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={Users} trend={`+${stats?.newUsersLast24h || 0} today`} />
          <StatCard title="Total Messages" value={stats?.totalMessages || 0} icon={MessageSquare} trend={`+${stats?.messagesLast24h || 0} today`} />
          <StatCard title="Active Bans" value={stats?.activeBans || 0} icon={Ban} className="text-destructive border-destructive/20" />
          <StatCard title="Active Mutes" value={stats?.activeMutes || 0} icon={VolumeX} className="text-orange-500 border-orange-500/20" />
          <StatCard title="Pending Appeals" value={stats?.pendingAppeals || 0} icon={Mail} className={stats?.pendingAppeals ? "text-primary border-primary/50" : ""} />
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon: Icon, trend, className = "" }: any) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  )
}
