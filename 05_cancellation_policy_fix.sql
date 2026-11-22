-- JJCC Railways: cancellation policy correction
-- Run AFTER 01_payment_migration.sql and corrected 04_receipt_payment_workflow.sql.
-- Back up the database before running this migration.
-- This migration does not issue real refunds.

-- 1. Enforce the 24-hour cancellation window from payment approval.
CREATE OR REPLACE FUNCTION public.enforce_booking_cancellation_window()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF lower(COALESCE(NEW.booking_status, '')) = 'cancelled'
     AND lower(COALESCE(OLD.booking_status, '')) <> 'cancelled' THEN
    IF NEW.paid_at IS NULL THEN
      RAISE EXCEPTION 'Only paid bookings can be cancelled.';
    END IF;

    IF now() > NEW.paid_at + interval '24 hours' THEN
      RAISE EXCEPTION 'The 24-hour cancellation window after payment has expired.';
    END IF;

    NEW.cancelled_at := COALESCE(NEW.cancelled_at, now());
  END IF;

  RETURN NEW;
END;
$function$;


-- 2. Cancel immediately. No administrator approval is required.
-- The cancellation request is recorded as completed automatically.
-- ON CONFLICT handles an existing request because booking_id is unique.
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_reference text,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_reason text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Please sign in before cancelling your booking.';
  END IF;

  IF p_booking_reference IS NULL
     OR pg_catalog.btrim(p_booking_reference) = '' THEN
    RAISE EXCEPTION 'Booking reference is required.';
  END IF;

  v_reason := pg_catalog.btrim(p_reason);

  IF v_reason IS NULL
     OR v_reason = ''
     OR pg_catalog.length(v_reason) > 500 THEN
    RAISE EXCEPTION 'Please provide a valid cancellation reason.';
  END IF;

  SELECT b.*
    INTO v_booking
    FROM public.bookings b
   WHERE b.booking_reference =
         pg_catalog.upper(pg_catalog.btrim(p_booking_reference))
     AND b.user_id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or you do not have permission to cancel it.';
  END IF;

  IF pg_catalog.lower(v_booking.booking_status) <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed bookings can be cancelled.';
  END IF;

  IF v_booking.paid_at IS NULL THEN
    RAISE EXCEPTION 'This booking has no recorded payment approval.';
  END IF;

  IF now() > v_booking.paid_at + interval '24 hours' THEN
    RAISE EXCEPTION 'The 24-hour cancellation window after payment has expired.';
  END IF;

  -- Change the booking status immediately. The existing trigger also
  -- enforces the same 24-hour rule at database level.
  UPDATE public.bookings
     SET booking_status = 'cancelled',
         cancelled_at = COALESCE(cancelled_at, now())
   WHERE booking_id = v_booking.booking_id
     AND user_id = v_user_id;

  -- Keep one cancellation record per booking. Existing submitted requests
  -- are changed to completed; no administrator approval is involved.
  INSERT INTO public.booking_cancellation_requests (
    booking_id,
    user_id,
    booking_reference,
    reason,
    original_fare,
    refund_amount,
    request_status
  )
  VALUES (
    v_booking.booking_id,
    v_user_id,
    v_booking.booking_reference,
    v_reason,
    v_booking.total_fare,
    0,
    'completed'
  )
  ON CONFLICT (booking_id) DO UPDATE
     SET user_id = EXCLUDED.user_id,
         booking_reference = EXCLUDED.booking_reference,
         reason = EXCLUDED.reason,
         original_fare = EXCLUDED.original_fare,
         refund_amount = 0,
         request_status = 'completed';

  RETURN pg_catalog.jsonb_build_object(
    'booking_reference', v_booking.booking_reference,
    'previous_status', v_booking.booking_status,
    'booking_status', 'cancelled',
    'travel_date', v_booking.travel_date,
    'original_fare', v_booking.total_fare,
    'refund_amount', 0,
    'cancellation_reason', v_reason,
    'request_status', 'completed',
    'message', 'Booking successfully cancelled automatically within 24 hours after payment.'
  );
END;
$function$;


-- 3. New bookings receive a 10-minute payment hold.
CREATE OR REPLACE FUNCTION public.set_booking_pending_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.booking_status IS NULL
       OR lower(NEW.booking_status) IN ('confirmed', 'pending_payment') THEN
      NEW.booking_status := 'pending_payment';
      NEW.payment_deadline_at := COALESCE(
        NEW.payment_deadline_at,
        now() + interval '10 minutes'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- 4. Expire overdue pending bookings only if no timely receipt is awaiting review.
CREATE OR REPLACE FUNCTION public.expire_pending_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.bookings b
     SET booking_status = 'expired'
   WHERE b.booking_status = 'pending_payment'
     AND b.payment_deadline_at IS NOT NULL
     AND b.payment_deadline_at <= now()
     AND NOT EXISTS (
       SELECT 1
         FROM public.payment_submissions ps
        WHERE ps.booking_id = b.booking_id
          AND ps.status = 'pending_review'
          AND ps.submitted_at <= b.payment_deadline_at
     );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- Preserve the restricted execution policy established in migration 04.
REVOKE ALL ON FUNCTION public.expire_pending_bookings()
FROM PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.expire_pending_bookings()
TO service_role;

COMMENT ON FUNCTION public.cancel_booking(text, text) IS
  'Immediately cancels an authenticated user booking within 24 hours of paid_at; no admin approval and no automatic refund.';
