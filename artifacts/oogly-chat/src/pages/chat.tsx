import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  useListMessages, 
  useSendMessage, 
  useDeleteMessage, 
  useAddReaction,
  useRemoveReaction,
  useListAnnouncements,
} from "@workspace/api-client-react";
import type { Message } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Reply, X, Trash2, SmilePlus, Info, Wifi, WifiOff, Copy, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { TrollOverlay, TrollEffect } from "@/components/TrollOverlay";

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "✅", "👀", "🎉"];

// Linkify URLs in text
function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-primary hover:opacity-80 break-all">{part}</a>
      : part
  );
}

// Detect image URLs
function isImageUrl(text: string) {
  return /^https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(text.trim());
}

// Parse /me and bold (**text**)
function renderContent(text: string, isMe: boolean) {
  if (isMe) {
    return <em className="text-primary/80 not-italic">* {text.slice(4)}</em>;
  }
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**")
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : <span key={i}>{linkify(p)}</span>
      )}
    </>
  );
}

export default function ChatView() {
  const { user, isAdmin, isOwner } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());
  const [activeTroll, setActiveTroll] = useState<TrollEffect | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypeSentRef = useRef(0);

  const { data: messages = [], refetch } = useListMessages(
    { limit: 50 },
    { query: { refetchInterval: wsConnected ? false : 5000 } }
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

  const scrollToBottom = useCallback((force = false) => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    if (force || isAtBottom) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Clear typing indicators after 4s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        const next = new Map(prev);
        for (const [k, ts] of next) {
          if (now - ts > 4000) next.delete(k);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const connectWs = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    const url = `${protocol}//${window.location.host}${base}/api/ws`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
    };

    ws.onmessage = (evt) => {
      try {
        const event = JSON.parse(evt.data);
        switch (event.type) {
          case "new_message":
            queryClient.setQueryData(["listMessages", { limit: 50 }], (old: Message[] | undefined) => {
              const prev = old ?? [];
              if (prev.some((m) => m.id === event.payload.id)) return prev;
              return [event.payload, ...prev];
            });
            scrollToBottom();
            break;
          case "delete_message":
            queryClient.setQueryData(["listMessages", { limit: 50 }], (old: Message[] | undefined) =>
              (old ?? []).map((m) => m.id === event.payload.id ? { ...m, deleted: true, content: "[deleted]" } : m)
            );
            break;
          case "reaction_update":
            refetch();
            break;
          case "typing":
            if (event.payload.username !== user?.username) {
              setTypingUsers((prev) => new Map(prev).set(event.payload.username, event.payload.timestamp));
            }
            break;
          case "troll_effect":
            if (event.payload.targetUsername === user?.username) {
              setActiveTroll(event.payload.effect as TrollEffect);
            }
            break;
        }
      } catch {}
    };

    ws.onclose = () => { setWsConnected(false); wsRef.current = null; reconnectRef.current = setTimeout(connectWs, 3000); };
    ws.onerror = () => ws.close();
  }, [queryClient, refetch, scrollToBottom, user?.username]);

  useEffect(() => {
    connectWs();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [connectWs]);

  const sendTyping = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !user?.username) return;
    const now = Date.now();
    if (now - lastTypeSentRef.current < 2000) return;
    lastTypeSentRef.current = now;
    wsRef.current.send(JSON.stringify({ type: "typing", payload: { username: user.username } }));
  }, [user?.username]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    sendMutation.mutate(
      { data: { content, replyToId: replyTo?.id } },
      {
        onSuccess: (msg) => {
          setContent("");
          setReplyTo(null);
          queryClient.setQueryData(["listMessages", { limit: 50 }], (old: Message[] | undefined) => {
            const prev = old ?? [];
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [msg, ...prev];
          });
          setTimeout(() => scrollToBottom(true), 50);
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

  const copyMessage = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const typingList = [...typingUsers.keys()];
  const isCompact = user?.compactMode;

  return (
    <ChatLayout>
      <TrollOverlay effect={activeTroll} onDone={() => setActiveTroll(null)} />

      {/* Status bar */}
      <div className={`px-4 py-0.5 text-xs flex items-center gap-1.5 border-b transition-colors ${wsConnected ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"}`}>
        {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {wsConnected ? "Live" : "Reconnecting..."}
        {typingList.length > 0 && (
          <span className="ml-3 text-muted-foreground flex items-center gap-1.5">
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            <span>{typingList.slice(0, 3).join(", ")} {typingList.length === 1 ? "is" : "are"} typing…</span>
          </span>
        )}
      </div>

      {latestAnnouncement && dismissedAnnouncement !== latestAnnouncement.id && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex items-start gap-3">
          <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm"><span className="font-semibold text-primary mr-2">Announcement</span>{latestAnnouncement.content}</div>
          <button onClick={() => { setDismissedAnnouncement(latestAnnouncement.id); sessionStorage.setItem("dismissed_announcement", latestAnnouncement.id.toString()); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
      )}

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className={`max-w-4xl mx-auto flex flex-col justify-end min-h-full pb-2 ${isCompact ? "space-y-0.5" : "space-y-1"}`}>
          {[...messages].reverse().map((msg) => {
            const isOwn = msg.authorId === user?.id;
            const canDelete = isOwn || isAdmin || isOwner;
            const isTroll = (msg as any).metadata?.troll === true;
            const isMe = msg.content.startsWith("/me ");
            const imageUrl = isImageUrl(msg.content) ? msg.content.trim() : null;

            if (msg.deleted) {
              return <div key={msg.id} className="text-xs text-muted-foreground italic px-4 py-0.5">[message deleted]</div>;
            }

            if (isCompact) {
              return (
                <div key={msg.id} className="flex items-baseline gap-2 group py-0.5 hover:bg-muted/30 px-2 rounded">
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">{format(new Date(msg.createdAt), "HH:mm")}</span>
                  <span className={`font-semibold text-sm shrink-0 ${isMe ? "text-muted-foreground" : "text-primary"}`}>{isMe ? "" : `${msg.authorUsername}:`}</span>
                  <span className={`text-sm break-words flex-1 ${isTroll ? "troll-message" : ""}`}>{renderContent(msg.content, isMe)}</span>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyMessage(msg.id, msg.content)}>{copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}</Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplyTo(msg)}><Reply className="w-3 h-3" /></Button>
                    {canDelete && <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => deleteMutation.mutate({ id: msg.id })}><Trash2 className="w-3 h-3" /></Button>}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex flex-col group ${isOwn && !isMe ? "items-end" : "items-start"} py-1`}>
                {msg.replyToId && msg.replyToContent && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1 bg-muted/50 px-2 py-1 rounded border-l-2 border-primary/50 max-w-[80%] truncate">
                    <Reply className="w-3 h-3 shrink-0" /><span className="font-semibold">{msg.replyToUsername}:</span><span className="truncate">{msg.replyToContent}</span>
                  </div>
                )}
                
                {isMe ? (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground italic px-2 py-0.5 w-full">
                    <span className="font-semibold not-italic text-foreground/70">{msg.authorUsername}</span>
                    <span>{msg.content.slice(4)}</span>
                  </div>
                ) : (
                  <div className={`flex items-end gap-2 max-w-[80%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`rounded-2xl px-4 py-2 ${isOwn ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border rounded-bl-sm shadow-sm"}`}>
                      {!isOwn && <div className="text-xs font-semibold text-primary mb-0.5">{msg.authorUsername}</div>}
                      {imageUrl ? (
                        <img src={imageUrl} alt="img" className="rounded max-w-[280px] max-h-64 object-contain" />
                      ) : (
                        <div className={`text-sm break-words whitespace-pre-wrap ${isTroll ? "troll-message" : ""}`}>{renderContent(msg.content, false)}</div>
                      )}
                      <div className={`text-[10px] mt-1 opacity-60 ${isOwn ? "text-right" : "text-left"}`} title={new Date(msg.createdAt).toLocaleString()}>
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </div>
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-6">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background border shadow-sm"><SmilePlus className="w-3.5 h-3.5" /></Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="w-auto p-2 flex gap-1 bg-popover/95 backdrop-blur">
                          {COMMON_EMOJIS.map(emoji => (
                            <button key={emoji} className="hover:bg-muted p-1.5 rounded text-lg transition-transform hover:scale-110" onClick={() => toggleReaction(msg.id, emoji, false)}>{emoji}</button>
                          ))}
                        </PopoverContent>
                      </Popover>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background border shadow-sm" onClick={() => copyMessage(msg.id, msg.content)}>{copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background border shadow-sm" onClick={() => setReplyTo(msg)}><Reply className="w-3.5 h-3.5" /></Button>
                      {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background border shadow-sm text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => deleteMutation.mutate({ id: msg.id })}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </div>
                  </div>
                )}

                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isOwn && !isMe ? "justify-end" : "justify-start"}`}>
                    {msg.reactions.map(r => (
                      <button key={r.emoji} onClick={() => toggleReaction(msg.id, r.emoji, r.userReacted)} className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${r.userReacted ? "bg-primary/20 border-primary/30 text-primary" : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"}`}>
                        <span>{r.emoji}</span><span className="font-medium">{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-4 bg-background border-t border-border">
        {replyTo && (
          <div className="mb-2 flex items-center justify-between bg-muted/30 px-3 py-2 rounded-md border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground truncate flex-1 pr-4">
              <Reply className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-foreground shrink-0">Replying to {replyTo.authorUsername}:</span>
              <span className="truncate">{replyTo.content}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></Button>
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <Input
              value={content}
              onChange={(e) => { setContent(e.target.value); sendTyping(); }}
              placeholder={user?.isMuted ? "You are muted" : "Message… (try /me, **bold**, or paste an image URL)"}
              disabled={user?.isMuted || sendMutation.isPending}
              className="flex-1 bg-input border-transparent focus-visible:ring-1 rounded-2xl pr-14"
              autoFocus
              data-testid="input-message"
            />
            {content.length > 0 && (
              <span className={`absolute right-3 bottom-2 text-[10px] font-mono ${content.length > 450 ? "text-destructive" : "text-muted-foreground"}`}>
                {content.length}/500
              </span>
            )}
          </div>
          <Button type="submit" size="icon" disabled={!content.trim() || content.length > 500 || user?.isMuted || sendMutation.isPending} className="shrink-0 rounded-full h-10 w-10" data-testid="button-send-message">
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center max-w-4xl mx-auto">
          <strong>/me</strong> for actions · <strong>**bold**</strong> · paste image URL for inline preview
        </p>
      </div>
    </ChatLayout>
  );
}
