import { ChatLayout } from "@/components/layout/ChatLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useSubmitAppeal } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert } from "lucide-react";

export default function Appeal() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const submitAppeal = useSubmitAppeal();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.length < 10) {
      toast({ variant: "destructive", title: "Message too short", description: "Please explain your situation with more detail." });
      return;
    }

    submitAppeal.mutate(
      { data: { message } },
      {
        onSuccess: () => {
          setSubmitted(true);
          toast({ title: "Appeal submitted", description: "Moderators will review your appeal shortly." });
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "Error", description: err.message });
        }
      }
    );
  };

  return (
    <ChatLayout>
      <div className="max-w-2xl mx-auto w-full p-6 flex flex-col justify-center min-h-[80vh]">
        <Card className="border-destructive/20 shadow-lg shadow-destructive/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-destructive/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Account Muted</CardTitle>
            <CardDescription className="text-base mt-2">
              Your account has been restricted by a moderator. If you believe this was an error, you can submit an appeal below.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {submitted ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
                Your appeal has been received. Please wait for a moderator to review it.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Appeal Reason</label>
                  <Textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Explain why you should be unmuted..."
                    className="min-h-[150px] resize-none"
                    disabled={submitAppeal.isPending}
                  />
                  <p className="text-xs text-muted-foreground">Minimum 10 characters.</p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={submitAppeal.isPending || message.length < 10}
                >
                  {submitAppeal.isPending ? "Submitting..." : "Submit Appeal"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </ChatLayout>
  );
}
