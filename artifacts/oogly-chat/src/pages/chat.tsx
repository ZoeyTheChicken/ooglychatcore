import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useListMessages, 
  useSendMessage, 
  useDeleteMessage, 
  useAddReaction,
  useRemoveReaction,
  useListAnnouncements,
  Message,
  ReactionSummary
} from "@workspace/api-client-react";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Reply, X, Trash2, SmilePlus, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "✅", "👀", "🎉"];

export default function ChatView() {
  const { user, isAdmin, isOwner } = useAuth();
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [], refetch } = useListMessages(
    { limit: 50 },
    { query: { refetchInterval: 3000 } }
  );

  const { data: announcements = [] } = useListAnnouncements();
  const latestAnnouncement = announcements[0];
  const [dismissedAnnouncement, setDismissedAnnouncement] = useState<number | null>(() => {
    const saved = sessionStorage.getItem("dismissed_announcement");
    return saved ? parseInt(saved, 10) : null;
  });

  const sendMutation = useSendMessage();
  const deleteMutation = useDeleteMessage();
  const addReactionMutation = useAddReaction();
  const removeReactionMutation = useRemoveReaction();

  // Scroll to bottom on new messages if already at bottom
  useEffect(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      if (isAtBottom) {
        scrollRef.current.scrollTop = scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMutation.mutate(
      { data: { content, replyToId: replyTo?.id } },
      {
        onSuccess: () => {
          setContent("");
          setReplyTo(null);
          refetch();
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, 100);
        }
      }
    );
  };

  const toggleReaction = (messageId: number, emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      removeReactionMutation.mutate({ id: messageId, emoji }, { onSuccess: () => refetch() });
    } else {
      addReactionMutation.mutate({ id: messageId, data: { emoji } }, { onSuccess: () => refetch() });
    }
  };

  const isCompact = user?.compactMode;

  return (
    <ChatLayout>
      {latestAnnouncement && dismissedAnnouncement !== latestAnnouncement.id && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-3 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-primary mr-2">Announcement</span>
            {latestAnnouncement.content}
          </div>
          <button 
            onClick={() => {
              setDismissedAnnouncement(latestAnnouncement.id);
              sessionStorage.setItem("dismissed_announcement", latestAnnouncement.id.toString());
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-6 max-w-4xl mx-auto flex flex-col justify-end min-h-full pb-4">
          {[...messages].reverse().map((msg) => {
            const isOwn = msg.authorId === user?.id;
            const canDelete = isOwn || isAdmin || isOwner;
            const metadata = (msg as any).metadata || {};
            const isTroll = metadata?.troll === true;

            if (msg.deleted) {
              return (
                <div key={msg.id} className="text-xs text-muted-foreground italic px-4 py-1">
                  Message deleted
                </div>
              );
            }

            if (isCompact) {
              return (
                <div key={msg.id} className="flex flex-col group py-1 hover:bg-muted/30 px-2 rounded">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      {format(new Date(msg.createdAt), "HH:mm")}
                    </span>
                    <span className="font-semibold text-sm">
                      {msg.authorUsername}:
                    </span>
                    <span className={`text-sm ${isTroll ? "troll-message" : ""}`}>
                      {msg.content}
                    </span>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(msg)}>
                        <Reply className="w-3 h-3" />
                      </Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMutation.mutate({ id: msg.id }, { onSuccess: () => refetch() })}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex flex-col group ${isOwn ? "items-end" : "items-start"}`}>
                {msg.replyToId && msg.replyToContent && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 bg-muted/50 px-2 py-1 rounded border-l-2 border-primary/50 max-w-[80%] truncate">
                    <Reply className="w-3 h-3 flex-shrink-0" />
                    <span className="font-semibold">{msg.replyToUsername}:</span>
                    <span className="truncate">{msg.replyToContent}</span>
                  </div>
                )}
                
                <div className={`flex items-end gap-2 max-w-[80%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`rounded-lg px-4 py-2 ${
                    isOwn 
                      ? "bg-primary text-primary-foreground rounded-br-none" 
                      : "bg-card border border-border rounded-bl-none shadow-sm"
                  }`}>
                    {!isOwn && (
                      <div className="text-xs font-semibold text-primary mb-1">
                        {msg.authorUsername}
                      </div>
                    )}
                    <div className={`text-sm break-words whitespace-pre-wrap ${isTroll ? "troll-message" : ""}`}>
                      {msg.content}
                    </div>
                  </div>
                  
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background border shadow-sm">
                          <SmilePlus className="w-3.5 h-3.5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" className="w-auto p-2 flex gap-1 bg-popover/95 backdrop-blur">
                        {COMMON_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            className="hover:bg-muted p-1.5 rounded text-lg transition-transform hover:scale-110"
                            onClick={() => toggleReaction(msg.id, emoji, false)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background border shadow-sm" onClick={() => setReplyTo(msg)}>
                      <Reply className="w-3.5 h-3.5" />
                    </Button>
                    {canDelete && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background border shadow-sm text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => deleteMutation.mutate({ id: msg.id }, { onSuccess: () => refetch() })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                  {msg.reactions?.map(r => (
                    <button
                      key={r.emoji}
                      onClick={() => toggleReaction(msg.id, r.emoji, r.userReacted)}
                      className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${
                        r.userReacted 
                          ? "bg-primary/20 border-primary/30 text-primary" 
                          : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span className="font-medium">{r.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 bg-background border-t border-border">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between bg-muted/30 px-3 py-2 rounded-md border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground truncate flex-1 pr-4">
              <Reply className="w-4 h-4" />
              <span className="font-semibold text-foreground">Replying to {replyTo.authorUsername}:</span>
              <span className="truncate">{replyTo.content}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyTo(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-end gap-2 max-w-4xl mx-auto">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={user?.isMuted ? "You are muted" : "Type a message..."}
            disabled={user?.isMuted || sendMutation.isPending}
            className="flex-1 bg-input border-transparent focus-visible:ring-1"
            autoFocus
            data-testid="input-message"
          />
          <Button 
            type="submit" 
            disabled={!content.trim() || user?.isMuted || sendMutation.isPending}
            className="shrink-0"
            data-testid="button-send-message"
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </form>
      </div>
    </ChatLayout>
  );
}
