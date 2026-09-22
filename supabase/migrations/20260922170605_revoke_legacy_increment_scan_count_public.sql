-- The browser no longer counts its own scans (ebay-proxy enforces the quota server-side),
-- so the legacy counter is service-role only. PUBLIC held EXECUTE by default.
revoke execute on function public.increment_scan_count(uuid) from public, anon, authenticated;
grant execute on function public.increment_scan_count(uuid) to service_role;
