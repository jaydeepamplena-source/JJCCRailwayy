-- OPTIONAL: run only if pg_cron is available/enabled in your Supabase project.
-- Supabase Dashboard > Database > Extensions: enable pg_cron first.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.unschedule('jjcc-expire-pending-bookings')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'jjcc-expire-pending-bookings');

SELECT cron.schedule(
  'jjcc-expire-pending-bookings',
  '* * * * *',
  $$SELECT public.expire_pending_bookings();$$
);


-- Expire unpaid combined modification requests after their 10-minute deadline.
SELECT cron.unschedule('jjcc-expire-booking-change-requests')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'jjcc-expire-booking-change-requests');

SELECT cron.schedule(
  'jjcc-expire-booking-change-requests',
  '* * * * *',
  $$SELECT public.expire_booking_change_requests();$$
);
