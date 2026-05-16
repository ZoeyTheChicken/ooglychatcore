import { AdminLayout } from "@/components/layout/AdminLayout";
import { useBanUser, useMuteUser } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const PAGE_SIZE = 25;

function calcExpiresAt(type: DurationType, amount: number) {
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
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

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
  const [durationType, setDurationType] =
    useState<DurationType>("permanent");
  const [durationAmount, setDurationAmount] = useState(1);

  const resetDialog = () => {
    setReason("");
    setDurationType("permanent");
    setDurationAmount(1);
  };

  // 🔥 MAIN FIX: fetch ALL pages until empty
  const fetchAllUsers = async (searchText: string) => {
    setLoading(true);

    try {
      let page = 1;
      let all: any[] = [];

      while (true) {
        const res = await fetch(
          `https://chatapi.zoeyaviation.com/api/users?search=${encodeURIComponent(
            searchText
          )}&page=${page}`
        );

        const json = await res.json();
        const batch = json.users || [];

        all = [...all, ...batch];

        // stop condition
        if (batch.length < PAGE_SIZE) break;

        page++;
      }

      setUsers(all);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Failed to load users",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllUsers(search);
  }, [search]);

  const handleBan = () => {
    if (!banDialog.userId || !reason) return;

    const { isPermanent, expiresAt } = calcExpiresAt(
      durationType,
      durationAmount
    );

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
            title: `${banDialog.username} banned ${formatDuration(
              durationType,
              durationAmount
            )}`,
          });

          setBanDialog({ open: false, userId: null, username: "" });
          resetDialog();
          fetchAllUsers(search);
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

    const { isPermanent, expiresAt } = calcExpiresAt(
      durationType,
      durationAmount
    );

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
            title: `${muteDialog.username} muted ${formatDuration(
              durationType,
              durationAmount
            )}`,
          });

          setMuteDialog({ open: false, userId: null, username: "" });
          resetDialog();
          fetchAllUsers(search);
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
        <Select
          value={durationType}
          onValueChange={(v) => setDurationType(v as DurationType)}
        >
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
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">
              Manage platform members.
            </p>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search users..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border bg-card max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">
              Loading users...
            </div>
          ) : (
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
                    <TableCell className="font-mono">#{u.id}</TableCell>
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
                      {u.isMuted && (
                        <Badge className="bg-orange-500">Muted</Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
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
                          size="sm"
                          variant="destructive"
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
          )}
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
                Ban {banDialog.username}
              </DialogTitle>
              <DialogDescription>
                This will prevent the user from logging in.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="Reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />

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
                Ban
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
                Mute {muteDialog.username}
              </DialogTitle>
              <DialogDescription>
                User will be unable to send messages.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="Reason..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />

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
                Mute
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}