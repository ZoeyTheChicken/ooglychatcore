import { ChatLayout } from "@/components/layout/ChatLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

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
      <div className="max-w-2xl mx-auto w-full p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your preferences and appearance</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how Oogly looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Theme</Label>
              <RadioGroup 
                defaultValue={user?.theme || "dark"}
                onValueChange={(val) => handleUpdate({ theme: val })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-md p-3 w-32 justify-center cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="dark" id="dark" />
                  <Label htmlFor="dark" className="cursor-pointer">Dark</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-md p-3 w-32 justify-center cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="light" id="light" />
                  <Label htmlFor="light" className="cursor-pointer">Light</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label>Compact Mode</Label>
                <p className="text-sm text-muted-foreground">Use an IRC-like denser message layout</p>
              </div>
              <Switch 
                checked={user?.compactMode || false}
                onCheckedChange={(checked) => handleUpdate({ compactMode: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure how you get alerted</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">Show browser notifications for new messages</p>
              </div>
              <Switch 
                checked={user?.notificationsEnabled || false}
                onCheckedChange={(checked) => handleUpdate({ notificationsEnabled: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label>Message Sounds</Label>
                <p className="text-sm text-muted-foreground">Play a sound when a message is received</p>
              </div>
              <Switch 
                checked={user?.soundsEnabled || false}
                onCheckedChange={(checked) => handleUpdate({ soundsEnabled: checked })}
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
