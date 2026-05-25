create table public.persona (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Wandy POV',
  identity_md text not null default '',
  style_md text not null default '',
  do_md text not null default '',
  dont_md text not null default '',
  updated_at timestamptz not null default now()
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  tone text not null,
  viral_boost boolean not null default false,
  title text not null,
  hook text not null,
  foreshadow text not null,
  body text not null,
  ending text not null,
  caption text not null,
  hashtags text[] not null default '{}',
  language text not null default 'id',
  created_at timestamptz not null default now()
);

create table public.hooks (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text not null default 'general',
  source text not null default 'user' check (source in ('seed','user','generated')),
  emotion text NOT NULL DEFAULT 'Curiosity',
  content_type text NOT NULL DEFAULT 'Reels',
  favorite boolean NOT NULL DEFAULT false,
  use_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  language text not null default 'id',
  created_at timestamptz not null default now()
);

alter table public.persona enable row level security;
alter table public.ideas enable row level security;
alter table public.hooks enable row level security;

create policy "public all persona" on public.persona for all using (true) with check (true);
create policy "public all ideas" on public.ideas for all using (true) with check (true);
create policy "public all hooks" on public.hooks for all using (true) with check (true);

CREATE INDEX hooks_category_idx ON public.hooks (category);
CREATE INDEX hooks_use_count_idx ON public.hooks (use_count DESC);
CREATE INDEX hooks_last_used_idx ON public.hooks (last_used_at DESC NULLS LAST);
CREATE INDEX hooks_language_idx ON public.hooks (language);
CREATE INDEX ideas_language_idx ON public.ideas (language);

insert into public.persona (name, identity_md, style_md, do_md, dont_md) values (
  'Wandy POV',
  'Indonesian creator based in Sydney. Honest travel POV creator focused on cultural differences, food, public behavior, pricing, travel reality, and observational humor. Lens: Australia vs Indonesia.',
  'Emotionally fun, slightly provocative, relatable, informative, educative, insightful. Realism and tension over fake positivity. Casual Bahasa Indonesia with optional natural English mix. Short, punchy, spoken-rhythm sentences.',
  'Use curiosity gap, emotional tension, expectation vs reality, micro-details (prices, behaviors, systems, food, environment), "people don''t tell you..." angle, observational humor, subtle truth bombs.',
  'Avoid generic travel content, overly positive influencer tone, long explanations, corporate writing style, hashtags spam, fake hype.'
);

INSERT INTO public.hooks (text, category, source, emotion, content_type)
SELECT * FROM (VALUES
  ('POV: You found a place tourists don''t know about', 'POV', 'seed', 'Curiosity', 'Travel'),
  ('I wasn''t expecting this at all…', 'Storytelling', 'seed', 'Suspense', 'Vlog'),
  ('This changed my opinion instantly', 'Storytelling', 'seed', 'Shock', 'Vlog'),
  ('Come with me for a day in Tokyo', 'POV', 'seed', 'Immersion', 'Vlog'),
  ('Nobody talks about this place', 'Hidden spots', 'seed', 'Curiosity', 'Travel'),
  ('This might be the best food I''ve ever tried', 'Food', 'seed', 'Excitement', 'Food'),
  ('I tried the most overrated spot so you don''t have to', 'Travel', 'seed', 'Relatable', 'Vlog'),
  ('Things that just make sense in Japan', 'Comedy', 'seed', 'Relatable', 'Lifestyle'),
  ('You need to see this before visiting Korea', 'Educational', 'seed', 'Curiosity', 'Travel'),
  ('I accidentally found a hidden gem', 'Hidden spots', 'seed', 'Discovery', 'Travel'),
  ('I spent 24 hours doing this', 'Storytelling', 'seed', 'Immersion', 'Vlog'),
  ('This is your sign to visit here', 'Travel', 'seed', 'Inspiration', 'Cinematic vlog'),
  ('What $10 gets you in Bali', 'Comparison', 'seed', 'Curiosity', 'Travel'),
  ('I can''t believe this is real', 'Shock', 'seed', 'Shock', 'Vlog'),
  ('The internet was right about this place', 'Travel', 'seed', 'Validation', 'Vlog'),
  ('This feels illegal to know', 'Curiosity', 'seed', 'Curiosity', 'Educational'),
  ('I wish I knew this earlier', 'Educational', 'seed', 'Regret', 'Educational'),
  ('One thing nobody prepares you for', 'Storytelling', 'seed', 'Suspense', 'Storytime'),
  ('Watch this before you travel here', 'Educational', 'seed', 'Urgency', 'Travel'),
  ('Here''s why everyone is obsessed with this', 'Curiosity', 'seed', 'Curiosity', 'Lifestyle')
) AS v(text, category, source, emotion, content_type);