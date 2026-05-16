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

  return { isPermanent: false, expiresAt: new Date(Date.now() + ms).toISOString() };
}

function formatDuration(type: DurationType, amount: number) {
  if (type === "permanent") return "permanently";
  return `for ${amount} ${type}`;
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");

  // =========================
  // ✅ USER LOADING SYSTEM FIX
  // =========================
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data } = useListUsers({ search, page: 1, limit: 25 });

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

  // =========================
  // INIT LOAD
  // =========================
  useEffect(() => {
    if (!data?.users) return;

    setAllUsers(data.users);
    setHasMore(data.users.length === 25);
  }, [data]);

  // =========================
  // SEARCH RESET
  // =========================
  useEffect(() => {
    setAllUsers([]);
    setPage(1);
    setHasMore(true);
  }, [search]);

  // =========================
  // LOAD MORE FIXED
  // =========================
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    const nextPage = page + 1;

    const res = await fetch(
      `/api/users?search=${encodeURIComponent(search)}&page=${nextPage}&limit=25`
    );

    const json = await res.json();
    const newUsers = json?.users || [];

    setAllUsers((prev) => [...prev, ...newUsers]);
    setPage(nextPage);

    if (newUsers.length < 25) {
      setHasMore(false);
    }

    setLoadingMore(false);
  };

  const resetDialog = () => {
    setReason("");
    setDurationType("permanent");
    setDurationAmount(1);
  };

  const handleBan = () => {
    if (!banDialog.userId || !reason) return;

    const { isPermanent, expiresAt } = calcExpiresAt(durationType, durationAmount);

    banMutation.mutate(
      { data: { userId: banDialog.userId, reason, isPermanent, expiresAt } },
      {
        onSuccess: () => {
          toast({ title: `${banDialog.username} banned ${formatDuration(durationType, durationAmount)}` });
          setBanDialog({ open: false, userId: null, username: "" });
          resetDialog();
        },
        onError: (err) =>
          toast({ variant: "destructive", title: "Error", description: err.message }),
      }
    );
  };

  const handleMute = () => {
    if (!muteDialog.userId || !reason) return;

    const { isPermanent, expiresAt } = calcExpiresAt(durationType, durationAmount);

    muteMutation.mutate(
      { data: { userId: muteDialog.userId, reason, isPermanent, expiresAt } },
      {
        onSuccess: () => {
          toast({ title: `${muteDialog.username} muted ${formatDuration(durationType, durationAmount)}` });
          setMuteDialog({ open: false, userId: null, username: "" });
          resetDialog();
        },
        onError: (err) =>
          toast({ variant: "destructive", title: "Error", description: err.message }),
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
            onChange={(e) => setDurationAmount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24"
          />
        )}
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Users</h1>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="pl-9"
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
              {allUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>#{u.id}</TableCell>
                  <TableCell>{u.username}</TableCell>

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

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={u.isOwner || u.isMuted}
                        onClick={() =>
                          setMuteDialog({ open: true, userId: u.id, username: u.username })
                        }
                      >
                        <VolumeX className="w-4 h-4 mr-1" />
                        Mute
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={u.isOwner}
                        onClick={() =>
                          setBanDialog({ open: true, userId: u.id, username: u.username })
                        }
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Ban
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {hasMore && (
            <div className="flex justify-center mt-4">
              <Button onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>

        {/* dialogs unchanged */}
        <Dialog open={banDialog.open} onOpenChange={(open) => !open && setBanDialog({ open: false, userId: null, username: "" })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ban {banDialog.username}</DialogTitle>
            </DialogHeader>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button onClick={handleBan}>Confirm Ban</Button>
          </DialogContent>
        </Dialog>

        <Dialog open={muteDialog.open} onOpenChange={(open) => !open && setMuteDialog({ open: false, userId: null, username: "" })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mute {muteDialog.username}</DialogTitle>
            </DialogHeader>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button onClick={handleMute}>Confirm Mute</Button>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}