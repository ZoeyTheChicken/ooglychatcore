import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListUsers, useBanUser, useMuteUser } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

type DurationType = "permanent" | "minutes" | "hours" | "days";

function calcExpiresAt(type: DurationType, amount: number): { isPermanent: boolean; expiresAt?: string } {
  if (type === "permanent") return { isPermanent: true };

  const ms =
    type === "minutes"
      ? amount * 60_000
      : type === "hours"
      ? amount * 3_600_000
      : amount * 86_400_000;

  return {
    isPermanent: false,
    expiresAt: new Date(Date.now() + ms).toISOString(),
  };
}

function formatDuration(type: DurationType, amount: number) {
  if (type === "permanent") return "permanently";
  return `for ${amount} ${type}`;
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");

  const { data, refetch } = useListUsers({
    search,
    page: 1,
    limit: 1000,
  });

  const users = data?.users || [];
  const { toast } = useToast();

  const [banDialog, setBanDialog] = useState<{
    open: boolean;
    userId: number | null;
    username: string;
  }>({ open: false, userId: null, username: "" });

  const [muteDialog, setMuteDialog] = useState<{
    open: boolean;
    userId: number | null;
    username: string;
  }>({ open: false, userId: null, username: "" });

  const [reason, setReason] = useState("");
  const [durationType, setDurationType] = useState<DurationType>("permanent");
  const [durationAmount, setDurationAmount] = useState(1);

  const banMutation = useBanUser();
  const muteMutation = useMuteUser();

  const resetDialog = () => {
    setReason("");
    setDurationType("permanent");
    setDurationAmount(1);
  };

  const handleBan = () => {
    if (!banDialog.userId || !reason) return;

    const { isPermanent, expiresAt } = calcExpiresAt(durationType, durationAmount);

    banMutation.mutate(
      {
        data: {
          userId: banDialog.userId,
          reason,
          isPermanent,
          expiresAt,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: `${banDialog.username} banned ${formatDuration(durationType, durationAmount)}`,
          });

          setBanDialog({ open: false, userId: null, username: "" });
          resetDialog();
          refetch();
        },
        onError: (err) =>
          toast({
            variant: "destructive",
            title: "Error",
            description: err.message,
          }),
      }
    );
  };

  const handleMute = () => {
    if (!muteDialog.userId || !reason) return;

    const { isPermanent, expiresAt } = calcExpiresAt(durationType, durationAmount);

    muteMutation.mutate(
      {
        data: {
          userId: muteDialog.userId,
          reason,
          isPermanent,
          expiresAt,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: `${muteDialog.username} muted ${formatDuration(durationType, durationAmount)}`,
          });

          setMuteDialog({ open: false, userId: null, username: "" });
          resetDialog();
          refetch();
        },
        onError: (err) =>
          toast({
            variant: "destructive",
            title: "Error",
            description: err.message,
          }),
      }
    );
  };

  const DurationPicker = () => (
    <div className="space-y-3">
      <Label>Duration</Label>

      <div className="flex gap-2">
        <Select value={durationType} onValueChange={(v) => setDurationType(v as DurationType)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="permanent">Permanent</SelectItem>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="hours">Hours</SelectItem>
            <SelectItem value="days">Days</SelectItem>
          </SelectContent>
        </Select>

        {durationType !== "permanent" && (
          <Input
            type="number"
            min={1}
            value={durationAmount}
            onChange={(e) =>
              setDurationAmount(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="w-24"
          />
        )}
      </div>

      {durationType !== "permanent" && (
        <p className="text-xs text-muted-foreground">
          Expires:{" "}
          {new Date(
            Date.now() +
              (durationType === "minutes"
                ? durationAmount * 60_000
                : durationType === "hours"
                ? durationAmount * 3_600_000
                : durationAmount * 86_400_000)
          ).toLocaleString()}
        </p>
      )}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground mt-1">
              Manage platform members.
            </p>
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

        {/* Table */}
        <div className="rounded-md border bg-card max-h-[70vh] overflow-y-auto">
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
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{u.id}
                  </TableCell>

                  <TableCell className="font-medium">
                    {u.username}
                  </TableCell>

                  <TableCell>
                    {u.isOwner ? (
                      <Badge className="bg-primary">Owner</Badge>
                    ) : u.isAdmin ? (
                      <Badge variant="secondary">Admin</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">User</span>
                    )}
                  </TableCell>

                  <TableCell>
                    {u.isMuted && (
                      <Badge className="bg-orange-500">Muted</Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setMuteDialog({
                            open: true,
                            userId: u.id,
                            username: u.username,
                          })
                        }
                        disabled={u.isOwner || u.isMuted}
                      >
                        <VolumeX className="w-4 h-4 mr-1" />
                        Mute
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setBanDialog({
                            open: true,
                            userId: u.id,
                            username: u.username,
                          })
                        }
                        disabled={u.isOwner}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Ban
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* BAN DIALOG */}
        <Dialog
          open={banDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setBanDialog({ open: false, userId: null, username: "" });
              resetDialog();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Ban <span className="text-primary">{banDialog.username}</span>
              </DialogTitle>
              <DialogDescription>
                This will prevent the user from logging in.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <DurationPicker />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setBanDialog({ open: false, userId: null, username: "" })
                }
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={handleBan}
                disabled={!reason || banMutation.isPending}
              >
                {banMutation.isPending ? "Banning..." : "Confirm Ban"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MUTE DIALOG */}
        <Dialog
          open={muteDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setMuteDialog({ open: false, userId: null, username: "" });
              resetDialog();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Mute <span className="text-primary">{muteDialog.username}</span>
              </DialogTitle>
              <DialogDescription>
                User will remain connected but cannot send messages.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <DurationPicker />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setMuteDialog({ open: false, userId: null, username: "" })
                }
              >
                Cancel
              </Button>

              <Button
                variant="destructive"
                onClick={handleMute}
                disabled={!reason || muteMutation.isPending}
              >
                {muteMutation.isPending ? "Muting..." : "Confirm Mute"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}