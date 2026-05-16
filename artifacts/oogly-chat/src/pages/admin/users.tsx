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

  // ✅ pagination state (FIXED SYSTEM)
  const [page, setPage] = useState(1);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const limit = 25;

  const { data, refetch } = useListUsers({
    search,
    page,
    limit,
  });

  const users = allUsers;

  const [loadingMore, setLoadingMore] = useState(false);

  const { toast } = useToast();

  const [banDialog, setBanDialog] = useState<{ open: boolean; userId: number | null; username: string }>({
    open: false,
    userId: null,
    username: "",
  });

  const [muteDialog, setMuteDialog] = useState<{ open: boolean; userId: number | null; username: string }>({
    open: false,
    userId: null,
    username: "",
  });

  const [reason, setReason] = useState("");
  const [durationType, setDurationType] = useState<DurationType>("permanent");
  const [durationAmount, setDurationAmount] = useState(1);

  const banMutation = useBanUser();
  const muteMutation = useMuteUser();

  // ✅ RESET when searching
  useEffect(() => {
    setPage(1);
    setAllUsers([]);
    setHasMore(true);
  }, [search]);

  // ✅ APPEND OR REPLACE USERS SAFELY
  useEffect(() => {
    if (!data?.users) return;

    if (page === 1) {
      setAllUsers(data.users);
    } else {
      setAllUsers((prev) => [...prev, ...data.users]);
    }

    if (data.users.length < limit) {
      setHasMore(false);
    }

    setLoadingMore(false);
  }, [data, page]);

  // ✅ FIXED LOAD MORE (NO HOOKS INSIDE FUNCTIONS)
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setPage((prev) => prev + 1);
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

        onError: (err: any) =>

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

        onError: (err: any) =>

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

          <div>

            <h1 className="text-3xl font-bold">Users</h1>

            <p className="text-muted-foreground">Manage platform members.</p>

          </div>

          <div className="relative w-64">

            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />

            <Input

              value={search}

              onChange={(e) => setSearch(e.target.value)}

              placeholder="Search users..."

              className="pl-9"

            />

          </div>

        </div>

        {/* SCROLLABLE TABLE */}

        <div className="border rounded-md bg-card max-h-[70vh] overflow-y-auto">

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

                  <TableCell>#{u.id}</TableCell>

                  <TableCell className="font-medium">{u.username}</TableCell>

                  <TableCell>

                    {u.isOwner ? (

                      <Badge className="bg-primary">Owner</Badge>

                    ) : u.isAdmin ? (

                      <Badge variant="secondary">Admin</Badge>

                    ) : (

                      <span className="text-muted-foreground">User</span>

                    )}

                  </TableCell>

                  <TableCell>

                    {u.isMuted && <Badge className="bg-orange-500">Muted</Badge>}

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

                        onClick={() => {

                          resetDialog();

                          setMuteDialog({ open: true, userId: u.id, username: u.username });

                        }}

                      >

                        <VolumeX className="w-4 h-4 mr-1" /> Mute

                      </Button>

                      <Button

                        variant="destructive"

                        size="sm"

                        disabled={u.isOwner}

                        onClick={() => {

                          resetDialog();

                          setBanDialog({ open: true, userId: u.id, username: u.username });

                        }}

                      >

                        <Ban className="w-4 h-4 mr-1" /> Ban

                      </Button>

                    </div>

                  </TableCell>

                </TableRow>

              ))}

              {users.length === 0 && !loadingUsers && (

                <TableRow>

                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">

                    No users found.

                  </TableCell>

                </TableRow>

              )}

            </TableBody>

          </Table>

        </div>

        {/* BAN + MUTE DIALOGS (UNCHANGED UI) */}

        <Dialog open={banDialog.open} onOpenChange={(open) => !open && setBanDialog({ open: false, userId: null, username: "" })}>

          <DialogContent>

            <DialogHeader>

              <DialogTitle>Ban {banDialog.username}</DialogTitle>

              <DialogDescription>This will prevent the user from logging in.</DialogDescription>

            </DialogHeader>

            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason..." />

            <DialogFooter>

              <Button variant="outline" onClick={() => setBanDialog({ open: false, userId: null, username: "" })}>

                Cancel

              </Button>

              <Button variant="destructive" onClick={handleBan}>

                Confirm Ban

              </Button>

            </DialogFooter>

          </DialogContent>

        </Dialog>

        <Dialog open={muteDialog.open} onOpenChange={(open) => !open && setMuteDialog({ open: false, userId: null, username: "" })}>

          <DialogContent>

            <DialogHeader>

              <DialogTitle>Mute {muteDialog.username}</DialogTitle>

              <DialogDescription>User will be muted.</DialogDescription>

            </DialogHeader>

            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason..." />

            <DialogFooter>

              <Button variant="outline" onClick={() => setMuteDialog({ open: false, userId: null, username: "" })}>

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