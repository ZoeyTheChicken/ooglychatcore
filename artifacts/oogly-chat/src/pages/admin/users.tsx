import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListUsers, useBanUser, useMuteUser } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Ban, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

type DurationType = "permanent" | "minutes" | "hours" | "days";

function calcExpiresAt(type: DurationType, amount: number) {
  if (type === "permanent") return { isPermanent: true as const };

  const ms =
    type === "minutes"
      ? amount * 60_000
      : type === "hours"
      ? amount * 3_600_000
      : amount * 86_400_000;

  return {
    isPermanent: false as const,
    expiresAt: new Date(Date.now() + ms).toISOString(),
  };
}

function formatDuration(type: DurationType, amount: number) {
  if (type === "permanent") return "permanently";
  return `for ${amount} ${type}`;
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const { data, refetch } = useListUsers({ search, page });
  const users = data?.users ?? [];

  const { toast } = useToast();

  const [banDialog, setBanDialog] = useState({
    open: false,
    userId: null as number | null,
    username: "",
  });

  const [muteDialog, setMuteDialog] = useState({
    open: false,
    userId: null as number | null,
    username: "",
  });

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

  // RESET ON SEARCH
  useEffect(() => {
    setAllUsers([]);
    setPage(1);
    setHasMore(true);
  }, [search]);

  // AUTO-PAGINATION (safe version)
  useEffect(() => {
    if (!data?.users) return;

    setAllUsers((prev) => {
      const merged = [...prev, ...data.users];
      return merged;
    });

    if (data.users.length < 25) {
      setHasMore(false);
      return;
    }

    if (hasMore && !loading) {
      setLoading(true);
      setTimeout(() => {
        setPage((p) => p + 1);
        setLoading(false);
      }, 50);
    }
  }, [data]);

  const handleBan = () => {
    if (banDialog.userId == null || reason.trim() === "") return;

    const { isPermanent, expiresAt } = calcExpiresAt(durationType, durationAmount);

    banMutation.mutate(
      {
        userId: banDialog.userId,
        reason,
        isPermanent,
        expiresAt,
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
        onError: (err: any) => {
          console.error(err);
          toast({
            variant: "destructive",
            title: "Ban failed",
            description: err?.message ?? "Unknown error",
          });
        },
      }
    );
  };

  const handleMute = () => {
    if (muteDialog.userId == null || reason.trim() === "") return;

    const { isPermanent, expiresAt } = calcExpiresAt(durationType, durationAmount);

    muteMutation.mutate(
      {
        userId: muteDialog.userId,
        reason,
        isPermanent,
        expiresAt,
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
        onError: (err: any) => {
          console.error(err);
          toast({
            variant: "destructive",
            title: "Mute failed",
            description: err?.message ?? "Unknown error",
          });
        },
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">Manage platform members</p>
          </div>

          <Input
            className="w-64"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* TABLE */}
        <div className="border rounded-md bg-card max-h-[600px] overflow-y-auto">
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
              {allUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>#{u.id}</TableCell>

                  <TableCell className="font-medium">
                    {u.username}
                  </TableCell>

                  <TableCell>
                    {u.isOwner ? (
                      <Badge>Owner</Badge>
                    ) : u.isAdmin ? (
                      <Badge variant="secondary">Admin</Badge>
                    ) : (
                      "User"
                    )}
                  </TableCell>

                  <TableCell>
                    {u.isMuted && <Badge variant="destructive">Muted</Badge>}
                  </TableCell>

                  <TableCell>
                    {format(new Date(u.createdAt), "MMM d, yyyy")}
                  </TableCell>

                  <TableCell className="text-right flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!u.isOwner}
                      onClick={() =>
                        setMuteDialog({ open: true, userId: u.id, username: u.username })
                      }
                    >
                      <VolumeX className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!!u.isOwner}
                      onClick={() =>
                        setBanDialog({ open: true, userId: u.id, username: u.username })
                      }
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* BAN DIALOG */}
        <Dialog open={banDialog.open} onOpenChange={(o) => !o && setBanDialog({ open: false, userId: null, username: "" })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban {banDialog.username}</DialogTitle>
            </DialogHeader>

            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />

            <DialogFooter>
              <Button variant="outline" onClick={() => setBanDialog({ open: false, userId: null, username: "" })}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBan}>
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MUTE DIALOG */}
        <Dialog open={muteDialog.open} onOpenChange={(o) => !o && setMuteDialog({ open: false, userId: null, username: "" })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mute {muteDialog.username}</DialogTitle>
            </DialogHeader>

            <Label>Reason</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />

            <DialogFooter>
              <Button variant="outline" onClick={() => setMuteDialog({ open: false, userId: null, username: "" })}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleMute}>
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}