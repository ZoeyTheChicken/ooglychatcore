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
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, refetch } = useListUsers({ search, page });
  const banMutation = useBanUser();
  const muteMutation = useMuteUser();

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

  // reset on search
  useEffect(() => {
    setPage(1);
    setAllUsers([]);
    setHasMore(true);
  }, [search]);

  // merge pages safely
  useEffect(() => {
    if (!data?.users) return;

    setAllUsers((prev) => {
      return page === 1 ? data.users : [...prev, ...data.users];
    });

    if (data.users.length < 25) {
      setHasMore(false);
    }
  }, [data]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    const nextPage = page + 1;

    const res = await fetch(
      `https://chatapi.zoeyaviation.com/api/users?search=${search}&page=${nextPage}`
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
          toast({
            title: `${banDialog.username} banned ${formatDuration(durationType, durationAmount)}`,
          });

          setAllUsers((prev) => prev.filter((u) => u.id !== banDialog.userId));

          setBanDialog({ open: false, userId: null, username: "" });
          resetDialog();
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
      { data: { userId: muteDialog.userId, reason, isPermanent, expiresAt } },
      {
        onSuccess: () => {
          toast({
            title: `${muteDialog.username} muted ${formatDuration(durationType, durationAmount)}`,
          });

          setAllUsers((prev) =>
            prev.map((u) =>
              u.id === muteDialog.userId ? { ...u, isMuted: true } : u
            )
          );

          setMuteDialog({ open: false, userId: null, username: "" });
          resetDialog();
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

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
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
              {allUsers.map((u) => {
                const isProtected = u.isOwner === true || u.id === 3;

                return (
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
                        <span className="text-sm text-muted-foreground">
                          User
                        </span>
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
                          disabled={isProtected || u.isMuted}
                          onClick={() =>
                            setMuteDialog({
                              open: true,
                              userId: u.id,
                              username: u.username,
                            })
                          }
                        >
                          <VolumeX className="w-4 h-4 mr-1" />
                          Mute
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={isProtected}
                          onClick={() =>
                            setBanDialog({
                              open: true,
                              userId: u.id,
                              username: u.username,
                            })
                          }
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          Ban
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {hasMore && (
            <div className="flex justify-center p-4">
              <Button onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>

        {/* BAN MODAL */}
        <Dialog
          open={banDialog.open}
          onOpenChange={(open) => {
            if (!open)
              setBanDialog({ open: false, userId: null, username: "" });
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Ban {banDialog.username}
              </DialogTitle>
              <DialogDescription>
                This will prevent login.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Label>Reason</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => resetDialog()}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleBan}>
                Confirm Ban
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MUTE MODAL */}
        <Dialog
          open={muteDialog.open}
          onOpenChange={(open) => {
            if (!open)
              setMuteDialog({ open: false, userId: null, username: "" });
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Mute {muteDialog.username}
              </DialogTitle>
              <DialogDescription>
                User cannot send messages.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Label>Reason</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => resetDialog()}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleMute}>
                Confirm Mute
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}