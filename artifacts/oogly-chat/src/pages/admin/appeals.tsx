import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListAppeals, useMarkAppealRead, useDismissAppeal, useUnmuteUser } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MailOpen, Trash2, Volume2 } from "lucide-react";

export default function AdminAppeals() {
  const { data: appeals = [], refetch } = useListAppeals({ unread: true });
  const markRead = useMarkAppealRead();
  const dismiss = useDismissAppeal();
  const unmute = useUnmuteUser();
  const { toast } = useToast();

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, { onSuccess: () => refetch() });
  };

  const handleDismiss = (id: number) => {
    dismiss.mutate(
      { id },
      { 
        onSuccess: () => {
          toast({ title: "Appeal dismissed" });
          refetch();
        } 
      }
    );
  };

  const handleUnmute = (userId: number, appealId: number) => {
    unmute.mutate(
      { data: { userId, reason: "Appeal accepted" } },
      {
        onSuccess: () => {
          dismiss.mutate({ id: appealId }, { onSuccess: () => refetch() });
          toast({ title: "User unmuted and appeal closed" });
        }
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appeals Inbox</h1>
          <p className="text-muted-foreground mt-1">Review user requests to lift restrictions.</p>
        </div>

        <div className="space-y-4">
          {appeals.map((appeal) => (
            <Card key={appeal.id} className={`transition-all ${appeal.isRead ? 'opacity-70' : 'border-primary shadow-sm'}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Appeal from {appeal.username}
                      {!appeal.isRead && <Badge className="bg-primary ml-2">New</Badge>}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted {format(new Date(appeal.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-md text-sm whitespace-pre-wrap border border-border">
                  {appeal.message}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                {!appeal.isRead && (
                  <Button variant="outline" size="sm" onClick={() => handleMarkRead(appeal.id)}>
                    <MailOpen className="w-4 h-4 mr-2" /> Mark Read
                  </Button>
                )}
                <Button variant="outline" size="sm" className="text-green-500 border-green-500/30 hover:bg-green-500/10" onClick={() => handleUnmute(appeal.userId, appeal.id)}>
                  <Volume2 className="w-4 h-4 mr-2" /> Accept & Unmute
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDismiss(appeal.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Dismiss
                </Button>
              </CardFooter>
            </Card>
          ))}
          
          {appeals.length === 0 && (
            <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
              <MailOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Inbox is zero. No pending appeals.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
