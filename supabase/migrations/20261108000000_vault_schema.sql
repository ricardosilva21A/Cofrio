-- All vault content is encrypted in the browser before it reaches these tables.
-- The database stores only key-derivation settings and ciphertext envelopes.

create table public.vaults (
  user_id uuid primary key references auth.users (id) on delete cascade,
  kdf jsonb not null,
  salt text not null,
  wrapped_by_master jsonb not null,
  wrapped_by_recovery jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.vaults (user_id) on delete cascade,
  envelope jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vault_items_user_id_idx on public.vault_items (user_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.set_updated_at() from public, anon, authenticated;

create trigger vaults_set_updated_at
  before update on public.vaults
  for each row execute function public.set_updated_at();

create trigger vault_items_set_updated_at
  before update on public.vault_items
  for each row execute function public.set_updated_at();

alter table public.vaults enable row level security;
alter table public.vault_items enable row level security;

revoke all on public.vaults, public.vault_items from anon;
grant select, insert, update, delete on public.vaults, public.vault_items to authenticated;

create policy "Users read their own vault" on public.vaults
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their own vault" on public.vaults
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own vault" on public.vaults
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own vault" on public.vaults
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own items" on public.vault_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their own items" on public.vault_items
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users update their own items" on public.vault_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own items" on public.vault_items
  for delete to authenticated using ((select auth.uid()) = user_id);
