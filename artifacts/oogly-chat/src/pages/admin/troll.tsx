import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListUsers } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap } from "lucide-react";

type TrollEffect = {
  id: string;
  label: string;
  emoji: string;
  description: string;
};

const TROLL_EFFECTS: TrollEffect[] = [
  { id: "explosion",   label: "Explosion",    emoji: "💥", description: "Firework particles explode across their screen" },
  { id: "fake_ban",    label: "Fake Ban",     emoji: "🔨", description: "Shows a fake permanent ban screen for 5 seconds" },
  { id: "matrix",      label: "Matrix Rain",  emoji: "🟩", description: "Their screen is taken over by matrix code rain" },
  { id: "disco",       label: "Disco Mode",   emoji: "🕺", description: "Flashing rainbow party lights fill their screen" },
  { id: "upside_down", label: "Upside Down",  emoji: "🙃", description: "The entire UI flips 180° for 5 seconds" },
  { id: "earthquake",  label: "Earthquake",   emoji: "🌋", description: "Their screen shakes violently for 3 seconds" },
  { id: "ghost",       label: "Ghost Mode",   emoji: "👻", description: "Inverts and darkens their entire screen" },
];

export default function AdminTroll() {
  const { data } = useListUsers({ page: 1 });
  const users = data?.users || [];
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [pending, setPending] = useState<string | null>(null);

  const trigger = async (effectId: string) => {
    if (!selectedUser) {
      toast({ variant: "destructive", title: "Select a target first" });
      return;
    }
    setPending(effectId);
    try {
      const token = localStorage.getItem("oogly_token");
      const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/admin/troll`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUsername: selectedUser, effect: effectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ variant: "destructive", title: "Failed", description: err.error || "Unknown error" });
      } else {
        toast({ title: `💥 Trolled ${selectedUser} with ${TROLL_EFFECTS.find(e => e.id === effectId)?.label}!` });
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-400" />
            Troll Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a target and unleash chaos. Effects only work if they're currently connected.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Target</CardTitle>
            <CardDescription>Choose who will suffer your wrath</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Pick a victim..." />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.username}>
                    {u.username}
                    {u.isAdmin && " (admin)"}
                    {u.isOwner && " (owner)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TROLL_EFFECTS.map((effect) => (
            <Card
              key={effect.id}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => trigger(effect.id)}
            >
              <CardContent className="p-5 flex items-start gap-4">
                <div className="text-4xl">{effect.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold mb-1">{effect.label}</div>
                  <div className="text-sm text-muted-foreground">{effect.description}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={pending === effect.id || !selectedUser}
                  onClick={(e) => { e.stopPropagation(); trigger(effect.id); }}
                >
                  {pending === effect.id ? "⚡" : "Fire"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {!selectedUser && (
          <p className="text-center text-muted-foreground text-sm py-4">
            👆 Select a target to enable the troll effects
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
