-- Allow shorter admin passwords (minimum 6 characters, was 10).

create or replace function public.shkia_admin_set_password(p_password text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
    if p_password is null or length(p_password) < 6 then
        raise exception 'Use at least 6 characters';
    end if;
    insert into public.shkia_settings (key, value)
    values ('admin_password_hash', extensions.crypt(p_password, extensions.gen_salt('bf', 10)))
    on conflict (key) do update set value = excluded.value;
    delete from public.shkia_admin_sessions;
    return 'Admin password set. Any open admin sessions were signed out.';
end;
$$;

revoke all on function public.shkia_admin_set_password(text) from public, anon, authenticated;
