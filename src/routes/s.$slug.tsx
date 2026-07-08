import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/s/$slug")({
  head: () => ({
    meta: [
      { title: "Redirecting…" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SlugRedirect,
});

function SlugRedirect() {
  const { slug } = Route.useParams();
  const [status, setStatus] = useState<"loading" | "notfound" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("short_links")
        .select("target_url")
        .eq("slug", slug)
        .maybeSingle();

      if (cancelled) return;
      if (error) return setStatus("error");
      if (!data) return setStatus("notfound");

      // Fire-and-forget click increment
      void supabase.rpc("increment_short_link_click", { _slug: slug });

      window.location.replace(data.target_url);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md">
        {status === "loading" && (
          <>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-muted-foreground">
              Redirecting to your destination…
            </p>
          </>
        )}
        {status === "notfound" && (
          <>
            <h1 className="text-2xl font-bold">Link not found</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The short link <span className="font-mono">/s/{slug}</span> doesn't exist.
            </p>
            <Link to="/shortener">
              <Button className="mt-4">Create a new one</Button>
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We couldn't look up that link. Try again in a moment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
