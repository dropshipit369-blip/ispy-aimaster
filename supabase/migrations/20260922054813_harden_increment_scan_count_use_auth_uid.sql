-- Security hardening: increment_scan_count was SECURITY DEFINER, executable by
-- anon, and mutated profiles.scans_today for an arbitrary caller-supplied uid.
-- That let anyone (even unauthenticated, with only the publishable key) exhaust
-- another user's daily scan quota. Derive the target from auth.uid() instead so
-- the passed uid can no longer be spoofed, and revoke anon execute. The (uid uuid)
-- signature is kept so the existing frontend rpc('increment_scan_count',{uid})
-- call still resolves — the argument is simply ignored server-side.
create or replace function public.increment_scan_count(uid uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  update public.profiles
  set scans_today = scans_today + 1,
      updated_at = now()
  where user_id = auth.uid();
end;
$function$;

revoke execute on function public.increment_scan_count(uuid) from anon;
