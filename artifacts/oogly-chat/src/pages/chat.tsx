import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWs } from "@/contexts/WsContext";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Reply, X, Trash2, SmilePlus, Info, Copy, Check, ShieldAlert } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { TrollOverlay, TrollEffect } from "@/components/TrollOverlay";
import { checkFilter } from "@/lib/swear-filter";

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "✅", "👀", "🎉", "🥀", "☹️", "👎", "💀"];
const PAGE_SIZE = 50;

interface Message {
  id: number;
  content: string;
  authorId: number;
  authorUsername: string;
  deleted: boolean;
  replyToId: number | null;
  replyToContent: string | null;
  replyToUsername: string | null;
  reactions: Array<{ emoji: string; count: number; userReacted: boolean }>;
  createdAt: string;
}

function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-primary hover:opacity-80 break-all">{part}</a>
      : part
  );
}

function isImageUrl(text: string) {
  return /^https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(text.trim());
}

function renderContent(text: string, isMe: boolean) {
  if (isMe) return <em className="text-primary/80 not-italic">* {text.slice(4)}</em>;
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

interface TosToastProps {
  visible: boolean;
  onDone: () => void;
}

function TosToast({ visible, onDone }: TosToastProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFading(false);
    const fadeTimer = setTimeout(() => setFading(true), 3600);
    const doneTimer = setTimeout(() => onDone(), 4000);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 bg-destructive text-destructive-foreground rounded-xl shadow-lg px-5 py-4 max-w-sm w-[calc(100%-2rem)] transition-opacity duration-400 ${fading ? "opacity-0" : "opacity-100"}`}
      role="alert"
      aria-live="assertive"
    >
      <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-sm leading-snug">
        The message you have just attempted to send is against the Oogly Chat terms of service. Do not attempt to send a message that is against the terms of service again.
      </p>
    </div>
  );
}

export default function ChatView() {
  const { user, isAdmin, isOwner } = useAuth();
  const { subscribe, sendWsMessage } = useWs();
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());
  const [activeTroll, setActiveTroll] = useState<TrollEffect | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [tosBlocked, setTosBlocked] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastTypeSentRef = useRef(0);
  const initialLoadDone = useRef(false);

  const API_BASE = "https://chatapi.zoeyaviation.com/api";

  // Helper function to get auth headers
  const getHeaders = () => {
    const token = localStorage.getItem("oogly_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  // Fetch messages function
  const fetchMessages = async (currentOffset: number, append = false) => {
    try {
      const response = await fetch(`${API_BASE}/messages?limit=${PAGE_SIZE}&offset=${currentOffset}`, {
        headers: getHeaders(),
      });
      
      if (!response.ok) throw new Error("Failed to fetch messages");
      
      const data = await response.json();
      const newMessages = Array.isArray(data) ? data : (data.messages || []);
      
      if (append) {
        setMessages(prev => [...prev, ...newMessages]);
      } else {
        setMessages(newMessages);
      }
      
      setHasMore(newMessages.length === PAGE_SIZE);
      return newMessages;
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      return [];
    }
  };

  // Initial load
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      await fetchMessages(0, false);
      setLoading(false);
      setOffset(PAGE_SIZE);
    };
    loadMessages();
  }, []);

  // Scroll to bottom on first load
  useEffect(() => {
    if (messages.length > 0 && !initialLoadDone.current) {
      initialLoadDone.current = true;
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages]);

  const scrollToBottom = useCallback((force = false) => {
    const el = scrollRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (force || isAtBottom) el.scrollTop = el.scrollHeight;
  }, []);

  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const newMessages = await fetchMessages(offset, true);
    if (newMessages.length > 0) {
      setOffset(prev => prev + PAGE_SIZE);
    }
    setLoadingMore(false);
  };

  // Typing users cleanup
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        const next = new Map(prev);
        for (const [k, ts] of next) {
          if (now - ts > 4000) next.delete(k);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket subscriptions
  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      switch (event.type) {
        case "new_message":
          setMessages(prev => [event.payload, ...prev]);
          setTimeout(() => scrollToBottom(), 50);
          break;
        case "delete_message":
          setMessages(prev =>
            prev.map((m) => m.id === event.payload.id ? { ...m, deleted: true, content: "[deleted]" } : m)
          );
          break;
        case "reaction_update":
          fetchMessages(0, false);
          setOffset(PAGE_SIZE);
          break;
        case "typing":
          if (event.payload.username !== user?.username) {
            setTypingUsers((prev) => new Map(prev).set(event.payload.username, event.payload.timestamp));
          }
          break;
        case "troll_effect":
          if (event.payload.targetUsername === user?.username || event.payload.targetUsername === "*") {
            setActiveTroll(event.payload.effect as TrollEffect);
          }
          break;
      }
    });
    return unsubscribe;
  }, [subscribe, user?.username]);

  const sendTyping = useCallback(() => {
    if (!user?.username) return;
    const now = Date.now();
    if (now - lastTypeSentRef.current < 2000) return;
    lastTypeSentRef.current = now;
    sendWsMessage({ type: "typing", payload: { username: user.username } });
  }, [user?.username, sendWsMessage]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const result = await checkFilter(content);
    if (result.flagged) {
      setTosBlocked(false);
      requestAnimationFrame(() => setTosBlocked(true));
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content, replyToId: replyTo?.id }),
      });
      
      if (!response.ok) throw new Error("Failed to send message");
      
      const newMessage = await response.json();
      setMessages(prev => [newMessage, ...prev]);
      setContent("");
      setReplyTo(null);
      setTimeout(() => scrollToBottom(true), 50);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleDelete = async (messageId: number) => {
    try {
      const response = await fetch(`${API_BASE}/messages/${messageId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      
      if (!response.ok) throw new Error("Failed to delete message");
      
      setMessages(prev =>
        prev.map((m) => m.id === messageId ? { ...m, deleted: true, content: "[deleted]" } : m)
      );
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const handleReaction = async (messageId: number, emoji: string, hasReacted: boolean) => {
    try {
      let response;
      if (hasReacted) {
        response = await fetch(`${API_BASE}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`, {
          method: "DELETE",
          headers: getHeaders(),
        });
      } else {
        response = await fetch(`${API_BASE}/messages/${messageId}/reactions`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ emoji }),
        });
      }
      
      if (!response.ok) throw new Error("Failed to toggle reaction");
      
      // Refresh messages to get updated reactions
      fetchMessages(0, false);
      setOffset(PAGE_SIZE);
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  const copyMessage = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const typingList = [...typingUsers.keys()];
  const isCompact = user?.compactMode;

  if (loading) {
    return (
      <ChatLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading messages...</div>
        </div>
      </ChatLayout>
    );
  }

  return (
    <ChatLayout>
      <TrollOverlay effect={activeTroll} onDone={() => setActiveTroll(null)} />
      <TosToast visible={tosBlocked} onDone={() => setTosBlocked(false)} />

      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="max-w-4xl mx-auto mb-4 flex justify-center">
          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadMoreMessages}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading older messages..." : "Load older messages"}
            </Button>
          )}
        </div>
        <div className={`max-w-4xl mx-auto flex flex-col justify-end min-h-full pb-2 ${isCompact ? "space-y-0.5" : "space-y-1"}`}>
          {messages.map((msg) => {
            const isOwn = msg.authorId === user?.id;
            const canDelete = isOwn || isAdmin || isOwner;
            const isMe = msg.content.startsWith("/me ");
            const imageUrl = isImageUrl(msg.content) ? msg.content.trim() : null;

            if (msg.deleted) {
              return <div key={msg.id} className="text-xs text-muted-foreground italic px-4 py-0.5">[message deleted]</div>;
            }

            if (isCompact) {
              return (
                <div key={msg.id} className="flex items-baseline gap-2 group py-0.5 hover:bg-muted/30 px-2 rounded">
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">{format(new Date(msg.createdAt), "h:mm a")}</span>
                  <span className={`font-semibold text-sm shrink-0 ${isMe ? "text-muted-foreground" : "text-primary"}`}>{isMe ? "" : `${msg.authorUsername}:`}</span>
                  <span className="text-sm break-words flex-1">{renderContent(msg.content, isMe)}</span>
                  <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyMessage(msg.id, msg.content)}>{copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}</Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setReplyTo(msg)}><Reply className="w-3 h-3" /></Button>
                    {canDelete && <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => handleDelete(msg.id)}><Trash2 className="w-3 h-3" /></Button>}
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
                        <div className="text-sm break-words whitespace-pre-wrap">{renderContent(msg.content, false)}</div>
                      )}
                      <div className={`text-[10px] mt-1 opacity-60 ${isOwn ? "text-right" : "text-left"}`} title={new Date(msg.createdAt).toLocaleString()}>
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </div>
                    </div>
                    
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-6">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background border shadow-sm"><SmilePlus className="w-3.5 h-3.5" /></Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="w-auto p-2 flex gap-1 bg-popover/95 backdrop-blur">
                          {COMMON_EMOJIS.map(emoji => (
                            <button key={emoji} className="hover:bg-muted p-1.5 rounded text-lg transition-transform hover:scale-110" onClick={() => handleReaction(msg.id, emoji, msg.reactions?.some(r => r.emoji === emoji && r.userReacted) || false)}>{emoji}</button>
                          ))}
                        </PopoverContent>
                      </Popover>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background border shadow-sm" onClick={() => copyMessage(msg.id, msg.content)}>{copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background border shadow-sm" onClick={() => setReplyTo(msg)}><Reply className="w-3.5 h-3.5" /></Button>
                      {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-background border shadow-sm text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDelete(msg.id)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                    </div>
                  </div>
                )}

                {msg.reactions && msg.reactions.length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${isOwn && !isMe ? "justify-end" : "justify-start"}`}>
                    {msg.reactions.map(r => (
                      <button key={r.emoji} onClick={() => handleReaction(msg.id, r.emoji, r.userReacted)} className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${r.userReacted ? "bg-primary/20 border-primary/30 text-primary" : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"}`}>
                        <span>{r.emoji}</span><span className="font-medium">{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {typingList.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              <span>{typingList.slice(0, 3).join(", ")} {typingList.length === 1 ? "is" : "are"} typing…</span>
            </div>
          )}
        </div>
      </div>

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
              placeholder={user?.isMuted ? "You are muted" : "Message… (/me, **bold**, or paste an image URL)"}
              disabled={user?.isMuted}
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
          <Button type="submit" size="icon" disabled={!content.trim() || content.length > 500 || user?.isMuted} className="shrink-0 rounded-full h-10 w-10" data-testid="button-send-message">
            <Send className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center max-w-4xl mx-auto">
          <strong>/me</strong> for actions · <strong>**bold**</strong> · paste an image URL for inline preview
        </p>
      </div>
    </ChatLayout>
  );
}
