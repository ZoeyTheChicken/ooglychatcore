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
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const { data, refetch } = useListUsers({ search, page });
  const users = data?.users || [];

  const { toast } = useToast();

  const [banDialog, setBanDialog] = useState({ open: false, userId: null as number | null, username: "" });
  const [muteDialog, setMuteDialog] = useState({ open: false, userId: null as number | null, username: "" });

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

  // reset when search changes
  useEffect(() => {
    setAllUsers([]);
    setPage(1);
    setHasMore(true);
  }, [search]);

  // auto-pagination loop
  useEffect(() => {
    if (!data?.users) return;

    setAllUsers(prev => {
      const merged = [...prev, ...data.users];
      return merged;
    });

    if (data.users.length < 25) {
      setHasMore(false);
      return;
    }

    // fetch next page automatically
    if (hasMore && !loading) {
      setLoading(true);
      setPage(p => p + 1);
      setLoading(false);
    }
  }, [data]);

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
          refetch();
        },
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
          refetch();
        },
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">Manage platform members.</p>
          </div>

          <Input
            className="w-64"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* TABLE */}
        <div className="border rounded-md bg-card overflow-y-auto max-h-[600px]">
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
                  <TableCell className="font-medium">{u.username}</TableCell>

                  <TableCell>
                    {u.isOwner ? (
                      <Badge>Owner</Badge>
                    ) : u.isAdmin ? (
                      <Badge variant="secondary">Admin</Badge>
                    ) : (
                      <span>User</span>
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
                      onClick={() => setMuteDialog({ open: true, userId: u.id, username: u.username })}
                    >
                      <VolumeX className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBanDialog({ open: true, userId: u.id, username: u.username })}
                    >
                      <Ban className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* dialogs unchanged (you already had them fine) */}
      </div>
    </AdminLayout>
  );
}