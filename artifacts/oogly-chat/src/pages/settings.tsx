import { ChatLayout } from "@/components/layout/ChatLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { ArrowLeft, Palette, MessageSquare } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleUpdate = (data: any) => {
    updateSettings.mutate(
      { data },
      {
        onSuccess: () => {
          toast({ title: "Settings updated" });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Error", description: err.message });
        }
      }
    );
  };

  return (
    <ChatLayout>
      <div className="max-w-4xl mx-auto w-full p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Make Oogly Chat your own</p>
          </div>
        </div>

        {/* Theme */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              <CardTitle>Theme</CardTitle>
            </div>
            <CardDescription>Choose your preferred theme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Base Theme</Label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleUpdate({ theme: "dark" })}
                  className={`flex items-center justify-center gap-2 border rounded-md p-3 w-32 cursor-pointer hover:bg-muted/50 transition-colors ${(user?.theme || "dark") === "dark" ? "bg-primary/10 border-primary" : ""}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 ${ (user?.theme || "dark") === "dark" ? "bg-primary border-primary" : "border-border" }`} />
                  <span>Dark</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate({ theme: "light" })}
                  className={`flex items-center justify-center gap-2 border rounded-md p-3 w-32 cursor-pointer hover:bg-muted/50 transition-colors ${(user?.theme || "dark") === "light" ? "bg-primary/10 border-primary" : ""}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 ${ (user?.theme || "dark") === "light" ? "bg-primary border-primary" : "border-border" }`} />
                  <span>Light</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Experience */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <CardTitle>Chat Experience</CardTitle>
            </div>
            <CardDescription>Customize your chat experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications for new messages</p>
              </div>
              <Switch
                checked={user?.notificationsEnabled ?? true}
                onCheckedChange={(checked) => handleUpdate({ notificationsEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label>Sounds</Label>
                <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
              </div>
              <Switch
                checked={user?.soundsEnabled ?? true}
                onCheckedChange={(checked) => handleUpdate({ soundsEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label>Compact Mode</Label>
                <p className="text-sm text-muted-foreground">Use smaller message bubbles</p>
              </div>
              <Switch
                checked={user?.compactMode ?? false}
                onCheckedChange={(checked) => handleUpdate({ compactMode: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Chat
        </Button>
      </div>
    </ChatLayout>
  );
}
