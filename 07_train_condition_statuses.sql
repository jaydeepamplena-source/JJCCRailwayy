-- JJCC Railways: four train operational conditions
-- Run this script in Supabase SQL Editor before using the new dashboard controls.

ALTER TABLE public.trains
  ADD COLUMN IF NOT EXISTS train_status text NOT NULL DEFAULT 'active';

ALTER TABLE public.trains
  DROP CONSTRAINT IF EXISTS trains_train_status_check;

-- Convert the old inactive value to the clearer Out of Service status.
UPDATE public.trains
SET train_status = 'out_of_service'
WHERE train_status = 'inactive';

ALTER TABLE public.trains
  ADD CONSTRAINT trains_train_status_check
  CHECK (train_status IN ('active', 'broken', 'under_maintenance', 'out_of_service'));

-- Keep non-operational trains out of journey search/booking.
UPDATE public.trains
SET is_active = (train_status = 'active');

CREATE OR REPLACE FUNCTION public.set_train_status(p_train_id bigint, p_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.current_user_role();

  IF COALESCE(v_role, '') NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Only an administrator can update train status.';
  END IF;

  IF COALESCE(p_status, '') NOT IN ('active', 'broken', 'under_maintenance', 'out_of_service') THEN
    RAISE EXCEPTION 'Invalid train status.';
  END IF;

  UPDATE public.trains
  SET train_status = p_status,
      is_active = (p_status = 'active')
  WHERE train_id = p_train_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Train not found.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'train_id', p_train_id,
    'train_status', p_status,
    'is_active', (p_status = 'active')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_train_status(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_train_status(bigint, text) TO authenticated;

-- Demo/sample distribution across the five existing trains (no new train rows).
-- IDs and train codes match the current trains table screenshot.
UPDATE public.trains SET train_status = 'active', is_active = true WHERE train_id IN (1, 5);
UPDATE public.trains SET train_status = 'broken', is_active = false WHERE train_id = 2;
UPDATE public.trains SET train_status = 'under_maintenance', is_active = false WHERE train_id = 3;
UPDATE public.trains SET train_status = 'out_of_service', is_active = false WHERE train_id = 4;
