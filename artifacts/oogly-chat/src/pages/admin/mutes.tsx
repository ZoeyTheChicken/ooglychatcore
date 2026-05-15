import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListMutes, useUnmuteUser } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Volume2 } from "lucide-react";

export default function AdminMutes() {
  const { data: mutes = [], refetch } = useListMutes({ active: true });
  const unmuteMutation = useUnmuteUser();
  const { toast } = useToast();

  const handleUnmute = (muteId: number) => {
    unmuteMutation.mutate(
      { id: muteId },
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-orange-500">Active Mutes</h1>
          <p className="text-muted-foreground mt-1">Users restricted from sending messages.</p>
        </div>

        <div className="rounded-md border border-orange-500/20 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Muted By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mutes.map((mute) => (
                <TableRow key={mute.id}>
                  <TableCell className="font-medium">{mute.username}</TableCell>
                  <TableCell className="max-w-[300px] truncate" title={mute.reason}>{mute.reason}</TableCell>
                  <TableCell className="text-muted-foreground">{mute.mutedByUsername}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(mute.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-green-500/30 text-green-500 hover:bg-green-500/10"
                      onClick={() => handleUnmute(mute.id)}
                      disabled={unmuteMutation.isPending}
                    >
                      <Volume2 className="w-4 h-4 mr-1" /> Unmute
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {mutes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No active mutes.
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
