-- Ravia Farms — explicit Data API grants for the inputs tables.
--
-- The earlier tables were created while the project still auto-exposed new
-- entities in the `public` schema to the anon/authenticated roles. That is no
-- longer the cloud default (see api.auto_expose_new_tables in config.toml), so
-- input_items / input_purchases / input_usage would be unreachable through
-- PostgREST regardless of their RLS policies — RLS narrows access, it does not
-- grant it, and a missing GRANT surfaces as a blanket permission-denied.
--
-- SELECT/INSERT/UPDATE only. DELETE is deliberately absent, matching
-- 20240101000002: records are archived, never deleted.
--
-- Idempotent — re-granting an existing privilege is a no-op.

grant select, insert, update on input_items to authenticated;
grant select, insert, update on input_purchases to authenticated;
grant select, insert, update on input_usage to authenticated;

grant select on input_stock to authenticated;

revoke delete on input_items, input_purchases, input_usage from anon, authenticated;
