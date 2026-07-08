import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MessageCircle, Zap, Users, Lock, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Live • Powered by realtime channels
        </div>

        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Realtime Chat
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          A minimal group chat with multiple rooms, live message delivery, and
          per-user auth. Built as a portfolio project.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth">
            <Button size="lg">
              <MessageCircle className="mr-2 h-4 w-4" />
              Enter chat
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              View dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-6 sm:grid-cols-3">
          {[
            { icon: Zap, title: "Realtime", desc: "Messages appear instantly across every open client." },
            { icon: Users, title: "Multi-room", desc: "Switch between #general, #random, and #dev." },
            { icon: Lock, title: "Secure", desc: "Row-level security ensures only you can delete your own messages." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-6 text-left">
              <Icon className="mb-3 h-6 w-6 text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
