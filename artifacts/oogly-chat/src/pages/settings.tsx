import { ChatLayout } from "@/components/layout/ChatLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { ArrowLeft, Palette, Type, Layout, MessageSquare } from "lucide-react";

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

  const accentThemes = [
    { value: "racing", label: "Racing Red", color: "bg-red-500" },
    { value: "blue", label: "Ocean Blue", color: "bg-blue-500" },
    { value: "green", label: "Forest Green", color: "bg-green-500" },
    { value: "purple", label: "Royal Purple", color: "bg-purple-500" },
    { value: "orange", label: "Sunset Orange", color: "bg-orange-500" },
  ];

  const fontFamilies = [
    { value: "sans", label: "Sans Serif (Inter)" },
    { value: "serif", label: "Serif (Georgia)" },
    { value: "mono", label: "Monospace (JetBrains Mono)" },
  ];

  return (
    <ChatLayout>
      <div className="max-w-4xl mx-auto w-full p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Make Oogly Chat your own</p>
          </div>
        </div>

        {/* Theme & Colors */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              <CardTitle>Theme & Colors</CardTitle>
            </div>
            <CardDescription>Customize the visual appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Base Theme</Label>
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

            <div className="space-y-3 border-t pt-4">
              <Label>Accent Color</Label>
              <div className="flex flex-wrap gap-3">
                {accentThemes.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => handleUpdate({ accentTheme: theme.value })}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md border-2 transition-all ${
                      (user?.accentTheme || "racing") === theme.value
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${theme.color}`} />
                    <span className="text-sm">{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Type className="w-5 h-5" />
              <CardTitle>Typography</CardTitle>
            </div>
            <CardDescription>Customize fonts and text sizing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Font Family</Label>
              <Select
                value={user?.fontFamily || "sans"}
                onValueChange={(val) => handleUpdate({ fontFamily: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontFamilies.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <Label>Font Size</Label>
                <span className="text-sm text-muted-foreground">{user?.fontSize || 1}rem</span>
              </div>
              <Slider
                value={[user?.fontSize || 1]}
                onValueChange={([val]) => handleUpdate({ fontSize: val })}
                min={0.75}
                max={1.5}
                step={0.05}
                className="w-full"
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <Label>Font Scale</Label>
                <span className="text-sm text-muted-foreground">{user?.fontScale || 1}x</span>
              </div>
              <Slider
                value={[user?.fontScale || 1]}
                onValueChange={([val]) => handleUpdate({ fontScale: val })}
                min={0.85}
                max={1.15}
                step={0.01}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Layout & Spacing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layout className="w-5 h-5" />
              <CardTitle>Layout & Spacing</CardTitle>
            </div>
            <CardDescription>Adjust spacing and borders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Border Width</Label>
                <span className="text-sm text-muted-foreground">{user?.borderWidth || 1}px</span>
              </div>
              <Slider
                value={[user?.borderWidth || 1]}
                onValueChange={([val]) => handleUpdate({ borderWidth: val })}
                min={0}
                max={3}
                step={0.5}
                className="w-full"
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex justify-between">
                <Label>Spacing Scale</Label>
                <span className="text-sm text-muted-foreground">{user?.spacingScale || 1}x</span>
              </div>
              <Slider
                value={[user?.spacingScale || 1]}
                onValueChange={([val]) => handleUpdate({ spacingScale: val })}
                min={0.75}
                max={1.5}
                step={0.05}
                className="w-full"
              />
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

        {/* Message Style */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <CardTitle>Message Style</CardTitle>
            </div>
            <CardDescription>Customize message appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Message Background</Label>
              <Select
                value={user?.messageBg || "card"}
                onValueChange={(val) => handleUpdate({ messageBg: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card Background</SelectItem>
                  <SelectItem value="var(--background)">Page Background</SelectItem>
                  <SelectItem value="var(--muted)">Muted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border-t pt-4">
              <Label>Your Message Background</Label>
              <Select
                value={user?.messageOwnBg || "primary"}
                onValueChange={(val) => handleUpdate({ messageOwnBg: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">Primary Color</SelectItem>
                  <SelectItem value="card">Card Background</SelectItem>
                  <SelectItem value="var(--muted)">Muted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
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
