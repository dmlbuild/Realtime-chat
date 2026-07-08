import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, ExternalLink, Home, Link2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/shortener")({
  head: () => ({
    meta: [
      { title: "URL Shortener — Fast link shortening" },
      {
        name: "description",
        content:
          "Shorten long URLs into clean, shareable links. Track clicks and manage your links.",
      },
      { property: "og:title", content: "URL Shortener" },
      {
        property: "og:description",
        content: "Shorten long URLs into clean shareable links with click tracking.",
      },
    ],
  }),
  component: Shortener,
});

type ShortLink = {
  id: string;
  slug: string;
  target_url: string;
  click_count: number;
  created_at: string;
  user_id: string | null;
};

function randomSlug(len = 6) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function Shortener() {
  const [url, setUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void loadLinks();
  }, [userId]);

  async function loadLinks() {
    const query = supabase
      .from("short_links")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    const { data, error } = userId
      ? await query.eq("user_id", userId)
      : await query.is("user_id", null);
    if (error) return;
    setLinks(data as ShortLink[]);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      toast.error("Please enter a valid URL");
      return;
    }
    const slug = customSlug.trim() || randomSlug();
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(slug)) {
      toast.error("Slug must be 3–32 chars: letters, numbers, - or _");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("short_links").insert({
      slug,
      target_url: normalized,
      user_id: userId,
    });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.error("That slug is taken — try another");
      else toast.error(error.message);
      return;
    }
    setUrl("");
    setCustomSlug("");
    toast.success("Short link created!");
    void loadLinks();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("short_links").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void loadLinks();
  }

  function shortUrl(slug: string) {
    if (typeof window === "undefined") return `/s/${slug}`;
    return `${window.location.origin}/s/${slug}`;
  }

  async function copyLink(slug: string) {
    await navigator.clipboard.writeText(shortUrl(slug));
    toast.success("Copied to clipboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <header className="border-b bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <h1 className="font-bold">Shorten</h1>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight">Short links, fast.</h2>
          <p className="mt-2 text-muted-foreground">
            Paste a long URL, get a clean short link.{" "}
            {!userId && (
              <>
                <Link to="/auth" className="underline">
                  Sign in
                </Link>{" "}
                to save yours.
              </>
            )}
          </p>
        </div>

        <Card className="mt-8">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-3">
              <Input
                type="text"
                placeholder="https://example.com/very/long/url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                disabled={loading}
              />
              <div className="flex gap-2">
                <div className="flex flex-1 items-center rounded-md border bg-muted/40 pl-3 text-sm text-muted-foreground">
                  <span className="whitespace-nowrap">/s/</span>
                  <Input
                    type="text"
                    placeholder="custom-slug (optional)"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                    disabled={loading}
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Shortening…" : "Shorten"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">
              {userId ? "Your links" : "Recent anonymous links"}
            </h3>
            <span className="text-xs text-muted-foreground">
              {links.length} link{links.length === 1 ? "" : "s"}
            </span>
          </div>

          {links.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No links yet. Create your first one above.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {links.map((l) => (
                <Card key={l.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="font-mono text-sm text-primary">
                        /s/{l.slug}
                      </CardTitle>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        → {l.target_url}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {l.click_count} clicks
                    </span>
                  </CardHeader>
                  <CardContent className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyLink(l.slug)}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy
                    </Button>
                    <a href={shortUrl(l.slug)} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Open
                      </Button>
                    </a>
                    {userId && l.user_id === userId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(l.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
