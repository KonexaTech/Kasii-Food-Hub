-- Apply to Neon development branch first. Reject invalid status transitions.
CREATE OR REPLACE FUNCTION kfh_validate_order_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NOT (
    (OLD.status = 'pending' AND NEW.status IN ('accepted','rejected','delayed'))
    OR (OLD.status = 'delayed' AND NEW.status IN ('accepted','rejected'))
    OR (OLD.status = 'accepted' AND NEW.status IN ('preparing','rejected','delayed'))
    OR (OLD.status = 'preparing' AND NEW.status IN ('ready_for_collection','out_for_delivery','delayed'))
    OR (OLD.status = 'ready_for_collection' AND NEW.status = 'completed')
    OR (OLD.status = 'out_for_delivery' AND NEW.status = 'completed')
  ) THEN
    RAISE EXCEPTION 'Invalid order status transition from % to %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS kfh_status_transition_guard ON kfh_orders;
CREATE TRIGGER kfh_status_transition_guard BEFORE UPDATE OF status ON kfh_orders
FOR EACH ROW EXECUTE FUNCTION kfh_validate_order_status_transition();
