import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListModerationLogs } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function AdminLogs() {
  const { data } = useListModerationLogs({ page: 1 });
  const logs = data?.logs || [];

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">Immutable record of all moderation actions.</p>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(log.createdAt), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      log.action.includes("BAN") ? "border-destructive text-destructive" :
                      log.action.includes("MUTE") ? "border-orange-500 text-orange-500" :
                      ""
                    }>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{log.adminUsername}</TableCell>
                  <TableCell className="font-medium text-muted-foreground">{log.targetUsername || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate" title={log.reason || ""}>
                    {log.reason || "—"}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No logs found.
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
