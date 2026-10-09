-- Migration: add columns for admin transaction form
-- Add game_id, invoice_number, platform columns to history_purchase

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='history_purchase' and column_name='game_id') then
    alter table public.history_purchase add column game_id bigint;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='history_purchase' and column_name='invoice_number') then
    alter table public.history_purchase add column invoice_number text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='history_purchase' and column_name='platform') then
    alter table public.history_purchase add column platform text not null default 'manual';
  end if;
end $$;

create index if not exists history_purchase_game_id_idx on public.history_purchase(game_id);
create index if not exists history_purchase_invoice_idx on public.history_purchase(invoice_number);
