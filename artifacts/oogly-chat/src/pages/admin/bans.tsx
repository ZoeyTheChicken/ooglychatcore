import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListBans, useUnbanUser } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";

export default function AdminBans() {
  const { data: bans = [], refetch } = useListBans({ active: true });
  const unbanMutation = useUnbanUser();
  const { toast } = useToast();

  const handleUnban = (banId: number) => {
    unbanMutation.mutate(
      { id: banId },
      {
        onSuccess: () => {
          toast({ title: "User unbanned successfully" });
          refetch();
        }
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-destructive">Active Bans</h1>
          <p className="text-muted-foreground mt-1">Users currently restricted from logging in.</p>
        </div>

        <div className="rounded-md border border-destructive/20 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Banned By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bans.map((ban) => (
                <TableRow key={ban.id}>
                  <TableCell className="font-medium">{ban.username}</TableCell>
                  <TableCell className="max-w-[300px] truncate" title={ban.reason}>{ban.reason}</TableCell>
                  <TableCell className="text-muted-foreground">{ban.bannedByUsername}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(ban.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                      onClick={() => handleUnban(ban.id)}
                      disabled={unbanMutation.isPending}
                    >
                      <ShieldCheck className="w-4 h-4 mr-1" /> Unban
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {bans.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No active bans.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminLayout>
  );
}
