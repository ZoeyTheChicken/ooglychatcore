import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListUsers } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type TrollEffect = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  intensity: "mild" | "spicy" | "nuclear";
};

const TROLL_EFFECTS: TrollEffect[] = [
  // Original effects
  { id: "explosion",   label: "Explosion",     emoji: "💥", description: "Firework particles explode across their screen",          intensity: "spicy" },
  { id: "fake_ban",    label: "Fake Ban",      emoji: "🔨", description: "Shows a convincing fake ban screen for 5 seconds",       intensity: "spicy" },
  { id: "matrix",      label: "Matrix Rain",   emoji: "🟩", description: "Their screen is taken over by falling matrix code",      intensity: "mild" },
  { id: "disco",       label: "Disco Mode",    emoji: "🕺", description: "Flashing rainbow party lights fill their screen",        intensity: "mild" },
  { id: "upside_down", label: "Upside Down",   emoji: "🙃", description: "The entire UI flips 180° for 5 seconds",                intensity: "mild" },
  { id: "earthquake",  label: "Earthquake",    emoji: "🌋", description: "Their screen shakes violently for 3 seconds",           intensity: "spicy" },
  { id: "ghost",       label: "Ghost Mode",    emoji: "👻", description: "Inverts and darkens their entire screen",               intensity: "mild" },
  // New effects
  { id: "hacker",      label: "Hacker Mode",   emoji: "💻", description: "Fake terminal takes over — 'You've been hacked'",       intensity: "nuclear" },
  { id: "spin",        label: "Page Spin",     emoji: "🌀", description: "The entire UI spins 720° over 4 seconds",              intensity: "spicy" },
  { id: "rick_roll",   label: "Rick Roll",     emoji: "🎵", description: "Rick Astley takes over their screen. Never gonna stop", intensity: "spicy" },
  { id: "rain",        label: "Rainstorm",     emoji: "🌧️", description: "Heavy rain pours down their screen for 5 seconds",     intensity: "mild" },
  { id: "hypnosis",    label: "Hypnosis",      emoji: "🌀", description: "A hypnotic spiral fills their screen",                  intensity: "spicy" },
  { id: "confetti",    label: "Confetti",      emoji: "🎊", description: "Celebration confetti explodes everywhere",              intensity: "mild" },
  { id: "police",      label: "Police Lights", emoji: "🚨", description: "Red and blue police siren lights flash",               intensity: "spicy" },
  { id: "zoom_pulse",  label: "Zoom Pulse",    emoji: "🔍", description: "Screen zooms in and out like a panicked heartbeat",     intensity: "spicy" },
  { id: "black_screen",label: "Black Screen",  emoji: "⬛", description: "Screen goes completely black for 4 seconds",           intensity: "nuclear" },
  { id: "strobe",      label: "Strobe Light",  emoji: "⚡", description: "Rapid white strobe pulses across the screen",          intensity: "nuclear" },
];

const INTENSITY_COLORS = {
  mild: "bg-green-500/20 text-green-400 border-green-500/30",
  spicy: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  nuclear: "bg-red-500/20 text-red-400 border-red-500/30",
};

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
      const API_BASE = "https://chatapi.zoeyaviation.com"
      const res = await fetch(`${base}/api/admin/troll`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUsername: selectedUser, effect: effectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({ variant: "destructive", title: "Failed", description: err.error || "Unknown error" });
      } else {
        const label = TROLL_EFFECTS.find(e => e.id === effectId)?.label ?? effectId;
        const target = selectedUser === "*" ? "everyone" : selectedUser;
        toast({ title: `${label} fired at ${target}! 💀` });
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-400" />
            Troll Panel
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a target and unleash chaos. Effects are delivered live via WebSocket.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Target</CardTitle>
            <CardDescription>Choose a specific user, or go global</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4 flex-wrap">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Pick a victim…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="*">
                  <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Everyone (Global)</span>
                </SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.username}>
                    {u.username}{u.isOwner ? " 👑" : u.isAdmin ? " 🛡️" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUser && (
              <div className="text-sm text-muted-foreground">
                Target: <span className="font-semibold text-foreground">{selectedUser === "*" ? "🌍 ALL USERS" : selectedUser}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 text-xs text-muted-foreground items-center">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500/70" /> Mild</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500/70" /> Spicy</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/70" /> Nuclear</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TROLL_EFFECTS.map((effect) => (
            <Card
              key={effect.id}
              className="hover:border-primary/40 transition-all cursor-pointer group"
              onClick={() => trigger(effect.id)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className="text-3xl">{effect.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">{effect.label}</span>
                    <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${INTENSITY_COLORS[effect.intensity]}`}>
                      {effect.intensity}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">{effect.description}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
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
          <p className="text-center text-muted-foreground text-sm py-2">
            Select a target above to enable effects
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
