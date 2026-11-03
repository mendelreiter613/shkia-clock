-- Record of a one-time step, already done and undone; nothing to run.
--
-- The VAPID key pair was generated locally and handed to the database by a
-- local script through this temporary function, so the private key never
-- passed through anything else. The function was dropped right after.
--
-- To rotate the keys later: recreate this function, call it via
-- /rest/v1/rpc/shkia_bootstrap_vapid after deleting the two vapid_*_key rows,
-- update NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel, then drop it again. Existing
-- subscriptions stop working on rotation and users have to turn reminders on again.

create or replace function public.shkia_bootstrap_vapid(p_public text, p_private text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
    if exists (select 1 from public.shkia_settings where key = 'vapid_private_key') then
        return 'already set';
    end if;
    insert into public.shkia_settings (key, value) values ('vapid_public_key', p_public), ('vapid_private_key', p_private);
    return 'stored';
end;
$$;
revoke all on function public.shkia_bootstrap_vapid(text, text) from public, anon, authenticated;
grant execute on function public.shkia_bootstrap_vapid(text, text) to anon;

-- ...script ran here...

drop function if exists public.shkia_bootstrap_vapid(text, text);
