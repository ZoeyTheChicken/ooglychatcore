import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListUsers, useBanUser, useMuteUser } from "@workspace/api-client-react";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Ban, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const { data, refetch } = useListUsers({ search, page: 1 });
  const users = data?.users || [];
  const { toast } = useToast();

  const [banDialog, setBanDialog] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });
  const [muteDialog, setMuteDialog] = useState<{ open: boolean; userId: number | null }>({ open: false, userId: null });
  const [reason, setReason] = useState("");

  const banMutation = useBanUser();
  const muteMutation = useMuteUser();

  const handleBan = () => {
    if (!banDialog.userId || !reason) return;
    banMutation.mutate(
      { data: { userId: banDialog.userId, reason, isPermanent: true } },
      {
        onSuccess: () => {
          toast({ title: "User banned" });
          setBanDialog({ open: false, userId: null });
          setReason("");
          refetch();
        }
      }
    );
  };

  const handleMute = () => {
    if (!muteDialog.userId || !reason) return;
    muteMutation.mutate(
      { data: { userId: muteDialog.userId, reason, isPermanent: true } },
      {
        onSuccess: () => {
          toast({ title: "User muted" });
          setMuteDialog({ open: false, userId: null });
          setReason("");
          refetch();
        }
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground mt-1">Manage platform members.</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{u.id}</TableCell>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>
                    {u.isOwner ? (
                      <Badge variant="default" className="bg-primary">Owner</Badge>
                    ) : u.isAdmin ? (
                      <Badge variant="secondary">Admin</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">User</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.isMuted && <Badge variant="destructive" className="bg-orange-500">Muted</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setMuteDialog({ open: true, userId: u.id })}
                        disabled={u.isOwner || u.isMuted}
                      >
                        <VolumeX className="w-4 h-4 mr-1" /> Mute
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setBanDialog({ open: true, userId: u.id })}
                        disabled={u.isOwner}
                      >
                        <Ban className="w-4 h-4 mr-1" /> Ban
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Action Dialogs */}
        <Dialog open={banDialog.open} onOpenChange={(open) => !open && setBanDialog({ open: false, userId: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban User</DialogTitle>
              <DialogDescription>This action will immediately disconnect the user and prevent login.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Violation of terms..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBanDialog({ open: false, userId: null })}>Cancel</Button>
              <Button variant="destructive" onClick={handleBan} disabled={!reason || banMutation.isPending}>Confirm Ban</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={muteDialog.open} onOpenChange={(open) => !open && setMuteDialog({ open: false, userId: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mute User</DialogTitle>
              <DialogDescription>User will remain connected but cannot send messages.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Spamming..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMuteDialog({ open: false, userId: null })}>Cancel</Button>
              <Button variant="destructive" onClick={handleMute} disabled={!reason || muteMutation.isPending}>Confirm Mute</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
