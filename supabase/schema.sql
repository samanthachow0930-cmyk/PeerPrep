-- ========== Domain restriction ==========
create table public.allowed_domains (domain text primary key);
insert into public.allowed_domains values ('ust.hk');
-- For testing with non-HKUST addresses, add e.g.: insert into public.allowed_domains values ('gmail.com');

create or replace function public.guard_domain() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.allowed_domains
    where lower(new.email) like '%@' || domain or lower(new.email) like '%.' || domain
  ) then
    raise exception 'Only HKUST email addresses are allowed';
  end if;
  return new;
end $$;

create trigger trg_guard_domain before insert on auth.users
for each row execute function public.guard_domain();

-- ========== Tables ==========
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  alias text unique not null,
  target text, industry text, role text,
  credits int not null default 0,
  free_reviews int not null default 1,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  doc_type text not null check (doc_type in ('CV','Cover letter')),
  target_role text not null,
  focus text[] not null default '{}',
  file_path text not null,
  status text not null default 'open' check (status in ('open','closed')),
  review_count int not null default 0,
  first_feedback_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  reviewer uuid not null references public.profiles(id) on delete cascade,
  strengths text not null,
  improvements text not null,
  edits text not null,
  rating int not null check (rating between 1 and 5),
  helpful boolean,
  rated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (document_id, reviewer)
);

create table public.credit_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delta int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ========== New user -> profile ==========
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, alias)
  values (new.id, 'Student-' || substr(md5(random()::text), 1, 5));
  return new;
end $$;

create trigger trg_new_user after insert on auth.users
for each row execute function public.handle_new_user();

-- ========== Requesting a review costs 1 credit (starter allowance first) ==========
create or replace function public.before_document_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if (select count(*) from public.documents where owner = new.owner and status = 'open') >= 2 then
    raise exception 'You can have at most 2 open requests. Wait for feedback first.';
  end if;
  select * into p from public.profiles where id = new.owner for update;
  if p.free_reviews > 0 then
    update public.profiles set free_reviews = free_reviews - 1 where id = new.owner;
  elsif p.credits >= 1 then
    update public.profiles set credits = credits - 1 where id = new.owner;
    insert into public.credit_ledger (user_id, delta, reason) values (new.owner, -1, 'Review request');
  else
    raise exception 'Not enough credits. Review a classmate''s document to earn one.';
  end if;
  return new;
end $$;

create trigger trg_document_insert before insert on public.documents
for each row execute function public.before_document_insert();

-- ========== Submit a review ==========
create or replace function public.submit_review(
  p_doc uuid, p_strengths text, p_improvements text, p_edits text, p_rating int
) returns void language plpgsql security definer set search_path = public as $$
declare d public.documents;
begin
  select * into d from public.documents where id = p_doc for update;
  if not found or d.status <> 'open' then raise exception 'Document not available'; end if;
  if d.owner = auth.uid() then raise exception 'You cannot review your own document'; end if;
  insert into public.reviews (document_id, reviewer, strengths, improvements, edits, rating)
  values (p_doc, auth.uid(), p_strengths, p_improvements, p_edits, p_rating);
  update public.documents set
    review_count = review_count + 1,
    first_feedback_at = coalesce(first_feedback_at, now()),
    status = case when review_count + 1 >= 2 then 'closed' else status end
  where id = p_doc;
end $$;

-- ========== Rate a review (credit earned only if helpful) ==========
create or replace function public.rate_review(p_review uuid, p_helpful boolean)
returns void language plpgsql security definer set search_path = public as $$
declare r public.reviews; d public.documents;
begin
  select * into r from public.reviews where id = p_review for update;
  if not found then raise exception 'Review not found'; end if;
  select * into d from public.documents where id = r.document_id;
  if d.owner <> auth.uid() then raise exception 'Not your document'; end if;
  if r.helpful is not null then raise exception 'Already rated'; end if;
  update public.reviews set helpful = p_helpful, rated_at = now() where id = p_review;
  if p_helpful then
    update public.profiles set credits = credits + 1 where id = r.reviewer;
    insert into public.credit_ledger (user_id, delta, reason) values (r.reviewer, 1, 'Helpful review');
  end if;
end $$;

-- ========== Queue view (hides owner identity; fairness ordering) ==========
create or replace view public.queue_view as
select d.id, d.title, d.doc_type, d.target_role, d.focus, d.file_path, d.created_at, d.review_count,
  (select count(*) from public.reviews r join public.documents d2 on d2.id = r.document_id
   where d2.owner = d.owner)::int as owner_received,
  p.credits as owner_credits
from public.documents d join public.profiles p on p.id = d.owner
where d.status = 'open' and d.owner <> auth.uid()
  and not exists (select 1 from public.reviews r where r.document_id = d.id and r.reviewer = auth.uid())
order by owner_received asc, owner_credits desc, d.created_at asc;

-- ========== Row Level Security & grants ==========
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.reviews enable row level security;
alter table public.credit_ledger enable row level security;

revoke all on public.profiles, public.documents, public.reviews, public.credit_ledger, public.queue_view, public.allowed_domains from anon, authenticated;
grant select on public.profiles, public.documents, public.reviews, public.credit_ledger, public.queue_view to authenticated;
grant update (alias, target, industry, role, onboarded) on public.profiles to authenticated;
grant insert (owner, title, doc_type, target_role, focus, file_path) on public.documents to authenticated;

create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "documents own select" on public.documents for select to authenticated using (owner = auth.uid());
create policy "documents own insert" on public.documents for insert to authenticated with check (owner = auth.uid());

create policy "reviews visible to author and reviewer" on public.reviews for select to authenticated
using (reviewer = auth.uid() or exists (select 1 from public.documents d where d.id = document_id and d.owner = auth.uid()));

create policy "ledger own" on public.credit_ledger for select to authenticated using (user_id = auth.uid());

-- ========== Private PDF bucket ==========
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "cvs upload" on storage.objects for insert to authenticated with check (bucket_id = 'cvs');
create policy "cvs read" on storage.objects for select to authenticated using (bucket_id = 'cvs');

-- ========== Evaluation queries for your report ==========
-- Median hours to first feedback:
--   select percentile_cont(0.5) within group (order by extract(epoch from first_feedback_at - created_at)/3600) from documents where first_feedback_at is not null;
-- Helpful rate:
--   select round(100.0*count(*) filter (where helpful)/nullif(count(*) filter (where helpful is not null),0),1) from reviews;
-- Reviews given vs received per user:
--   select alias, (select count(*) from reviews where reviewer=p.id) given from profiles p;