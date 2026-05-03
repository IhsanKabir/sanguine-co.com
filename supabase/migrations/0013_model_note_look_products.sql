alter table products add column if not exists model_note text;
alter table products add column if not exists look_product_ids jsonb not null default '[]'::jsonb;
