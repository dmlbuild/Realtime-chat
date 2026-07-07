import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogOut, Send, Trash2 } from "lucide-react";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Realtime Chat" },
      { name: "description", content: "Live group chat powered by realtime channels." },
    ],
  }),
  component: ChatPage,
});

type Message = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  room: string;
};

type Profile = { id: string; username: string };

const ROOMS = ["general", "random", "dev"] as const;
type Room = (typeof ROOMS)[number];

function ChatPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [room, setRoom] = useState<Room>("general");
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
      } else {
        setUserId(data.session.user.id);
        setReady(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/auth" });
      else setUserId(session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  // Load messages + subscribe to realtime for the selected room
  useEffect(() => {
    if (!ready) return;
    let active = true;

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("room", room)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!active) return;
      setMessages(data ?? []);
      await loadProfiles((data ?? []).map((m) => m.user_id));
    })();

    const channel = supabase
      .channel(`messages:${room}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room=eq.${room}` },
        async (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
          await loadProfiles([msg.user_id]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `room=eq.${room}` },
        (payload) => {
          const old = payload.old as { id: string };
          setMessages((prev) => prev.filter((m) => m.id !== old.id));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, room]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const loadProfiles = async (ids: string[]) => {
    const unique = Array.from(new Set(ids)).filter((id) => !profiles[id]);
    if (unique.length === 0) return;
    const { data } = await supabase.from("profiles").select("id, username").in("id", unique);
    if (data) {
      setProfiles((prev) => {
        const next = { ...prev };
        (data as Profile[]).forEach((p) => (next[p.id] = p.username));
        return next;
      });
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !userId) return;
    setInput("");
    const { error } = await supabase.from("messages").insert({ content, room, user_id: userId });
    if (error) {
      toast.error(error.message);
      setInput(content);
    }
  };

  const deleteMsg = async (id: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-semibold">
            💬 Realtime Chat
          </Link>
          <nav className="flex gap-1">
            {ROOMS.map((r) => (
              <button
                key={r}
                onClick={() => setRoom(r)}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  r === room
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                #{r}
              </button>
            ))}
          </nav>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              No messages yet in #{room}. Say hi 👋
            </p>
          )}
          {messages.map((m) => {
            const mine = m.user_id === userId;
            const name = profiles[m.user_id] ?? "…";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`group max-w-[75%] rounded-2xl px-4 py-2 ${
                    mine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {!mine && (
                    <div className="mb-1 text-xs font-semibold opacity-70">{name}</div>
                  )}
                  <div className="whitespace-pre-wrap break-words text-sm">{m.content}</div>
                  <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-60">
                    <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                    {mine && (
                      <button
                        onClick={() => deleteMsg(m.id)}
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Delete message"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-t bg-card px-4 py-3">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${room}`}
            maxLength={2000}
          />
          <Button type="submit" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
