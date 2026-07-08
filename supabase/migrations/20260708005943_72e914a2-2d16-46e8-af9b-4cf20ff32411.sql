
CREATE TABLE public.short_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX short_links_slug_idx ON public.short_links(slug);
CREATE INDEX short_links_user_id_idx ON public.short_links(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_links TO authenticated;
GRANT SELECT, INSERT ON public.short_links TO anon;
GRANT ALL ON public.short_links TO service_role;

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read short links"
  ON public.short_links FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create short links"
  ON public.short_links FOR INSERT
  WITH CHECK (
    (auth.uid() IS NULL AND user_id IS NULL)
    OR (auth.uid() = user_id)
  );

CREATE POLICY "Owners can delete their links"
  ON public.short_links FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_short_link_click(_slug TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.short_links
  SET click_count = click_count + 1
  WHERE slug = _slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_short_link_click(TEXT) TO anon, authenticated;
