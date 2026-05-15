import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from "@workspace/api-client-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Megaphone } from "lucide-react";
import { format } from "date-fns";

export default function AdminAnnouncements() {
  const [content, setContent] = useState("");
  const { data: announcements = [], refetch } = useListAnnouncements();
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const { toast } = useToast();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    createMutation.mutate(
      { data: { content } },
      {
        onSuccess: () => {
          setContent("");
          toast({ title: "Announcement broadcasted" });
          refetch();
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Announcement removed" });
          refetch();
        }
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
          <p className="text-muted-foreground mt-1">Broadcast important messages to all users.</p>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Megaphone className="w-5 h-5" /> New Broadcast
            </CardTitle>
            <CardDescription>This will appear as a banner in the chat room.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <Textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your announcement here..."
                className="bg-background"
                rows={3}
              />
              <Button type="submit" disabled={!content.trim() || createMutation.isPending} className="w-full md:w-auto">
                {createMutation.isPending ? "Broadcasting..." : "Broadcast to Chat"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4 mt-8">
          <h2 className="text-xl font-semibold">Active Announcements</h2>
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium">{announcement.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    By {announcement.authorUsername} on {format(new Date(announcement.createdAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => handleDelete(announcement.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
          
          {announcements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
              No active announcements.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
